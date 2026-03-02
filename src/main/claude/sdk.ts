import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import * as os from 'os';
import * as path from 'path';
import type { ClaudeConfig, ClaudeQueryOptions, ClaudeQueryResult } from './types';

/**
 * Resolve the Claude Code CLI path, handling ASAR unpacking
 */
function resolveClaudeCodeCli(): string | undefined {
  try {
    // Use the current file's directory as the base
    const requireModule = createRequire(path.resolve('.'));
    const cliPath = requireModule.resolve('@anthropic-ai/claude-agent-sdk/cli.js');

    console.log('[Claude SDK] Resolved CLI path:', cliPath);

    // If packaged in ASAR, use the unpacked version
    if (cliPath.includes('app.asar')) {
      const unpackedPath = cliPath.replace('app.asar', 'app.asar.unpacked');
      console.log('[Claude SDK] ASAR detected, checking unpacked path:', unpackedPath);
      if (existsSync(unpackedPath)) {
        console.log('[Claude SDK] Using unpacked CLI path:', unpackedPath);
        return unpackedPath;
      }
    }

    return cliPath;
  } catch (error) {
    console.warn('[Claude SDK] Could not resolve CLI path:', error);
    return undefined;
  }
}

/**
 * Build proper environment variables for the subprocess
 * This is critical for Electron IPC handlers where process.env may be limited
 */
function buildSubprocessEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    // Preserve current environment
    ...process.env,

    // Ensure critical paths are set
    HOME: process.env.HOME || os.homedir(),
    USERPROFILE: process.env.USERPROFILE || os.homedir(),

    // Build a robust PATH that includes common Node.js locations
    PATH: buildPath(),

    // Set API credentials
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  };

  // Log for debugging (be careful not to log the actual API key)
  console.log('[Claude SDK] Environment PATH:', env.PATH);
  console.log('[Claude SDK] API Key configured:', !!env.ANTHROPIC_API_KEY);
  console.log('[Claude SDK] Base URL:', env.ANTHROPIC_BASE_URL);

  return env;
}

/**
 * Build a robust PATH that includes common Node.js installation locations
 */
function buildPath(): string {
  const platform = process.platform;
  const currentPath = process.env.PATH || '';
  const additionalPaths: string[] = [];

  if (platform === 'darwin') {
    // macOS common Node.js locations
    additionalPaths.push(
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/usr/local/opt/node/bin',
      `${os.homedir()}/.nvm/current/bin`
    );
  } else if (platform === 'linux') {
    // Linux common Node.js locations
    additionalPaths.push(
      '/usr/local/bin',
      '/usr/bin',
      `${os.homedir()}/.nvm/current/bin`,
      `${os.homedir()}/.local/bin`
    );
  } else if (platform === 'win32') {
    // Windows common Node.js locations
    additionalPaths.push(
      `${process.env.LOCALAPPDATA}\\Programs\\nodejs`,
      `${process.env.APPDATA}\\npm`,
      `${os.homedir()}\\AppData\\Roaming\\npm`,
      `${os.homedir()}\\scoop\\shims`
    );
  }

  // Merge paths, avoiding duplicates
  const pathEntries = currentPath.split(platform === 'win32' ? ';' : ':');
  for (const path of additionalPaths) {
    if (!pathEntries.includes(path)) {
      pathEntries.push(path);
    }
  }

  return pathEntries.join(platform === 'win32' ? ';' : ':');
}

/**
 * Claude SDK wrapper for running queries
 */
export class ClaudeSDK {
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
  }

  /**
   * Run a Claude query with the given prompt
   *
   * @param prompt - The task/prompt to send to Claude
   * @param options - Query options
   * @returns Promise with the query result
   */
  async runQuery(
    prompt: string,
    options: ClaudeQueryOptions = {}
  ): Promise<ClaudeQueryResult> {
    const {
      permissionMode = 'bypassPermissions',
      maxTurns = 50,
      onProgress,
      cwd,
    } = options;

    // Set environment variables for the SDK (parent process)
    process.env.ANTHROPIC_API_KEY = this.config.apiKey;
    process.env.ANTHROPIC_BASE_URL = this.config.baseUrl;

    let fullOutput = '';
    let outputBuffer = '';

    try {
      console.log('[Claude SDK] Starting query...');
      console.log('[Claude SDK] API Key:', this.config.apiKey.substring(0, 10) + '...');
      console.log('[Claude SDK] Base URL:', this.config.baseUrl);
      console.log('[Claude SDK] Current working directory:', process.cwd());
      console.log('[Claude SDK] Executable path:', process.execPath);
      console.log('[Claude SDK] Platform:', process.platform);
      console.log('[Claude SDK] Is Electron:', !!process.versions.electron);

      onProgress?.('Initializing Claude Agent SDK...');
      onProgress?.('Sending task to Claude...');

      // Prepare query options with all the necessary fixes
      const queryOptions: any = {
        permissionMode,
        maxTurns,
        allowDangerouslySkipPermissions: true,
        // Explicitly set the environment
        env: buildSubprocessEnv(),
      };

      // Add cwd if specified
      if (cwd) {
        queryOptions.cwd = cwd;
        console.log('[Claude SDK] Using custom cwd:', cwd);
      }

      // Resolve CLI path for packaged apps
      const cliPath = resolveClaudeCodeCli();
      if (cliPath) {
        queryOptions.pathToClaudeCodeExecutable = cliPath;
      }

      // In Electron, we might need to specify the executable explicitly
      // Use Electron's built-in Node.js
      if (process.versions.electron) {
        console.log('[Claude SDK] Running in Electron, using bundled Node.js');
        queryOptions.executable = 'node';
      }

      console.log('[Claude SDK] Query options:', JSON.stringify({
        ...queryOptions,
        env: '[REDACTED]', // Don't log the full env
      }, null, 2));

      // Use the Agent SDK's query() function
      for await (const message of query({
        prompt,
        options: queryOptions,
      })) {
        if (message.type === 'assistant') {
          for (const block of message.message.content) {
            if ('text' in block) {
              const text = block.text;
              fullOutput += text;

              // Log to console
              console.log('[Claude SDK] Text output:', text.substring(0, 100) + '...');

              // Buffer and send complete lines to progress callback
              outputBuffer += text;
              const lines = outputBuffer.split('\n');
              outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer

              lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                  // Send to progress callback, truncate if too long
                  const truncatedLine =
                    trimmedLine.length > 150
                      ? trimmedLine.substring(0, 150) + '...'
                      : trimmedLine;
                  onProgress?.(`Claude: ${truncatedLine}`);
                }
              });
            } else if ('name' in block) {
              console.log('[Claude SDK] Using tool:', block.name);
              onProgress?.(`Claude: 📁 Using tool: ${block.name}`);
            }
          }
        }
      }

      console.log('[Claude SDK] Query completed successfully');
      console.log('[Claude SDK] Total output length:', fullOutput.length);
      onProgress?.('Response received successfully');

      return {
        success: true,
        output: fullOutput,
      };
    } catch (error: any) {
      console.error('[Claude SDK] Fatal error:', error);
      console.error('[Claude SDK] Error name:', error?.name);
      console.error('[Claude SDK] Error message:', error?.message);
      console.error('[Claude SDK] Error stack:', error?.stack);
      console.error('[Claude SDK] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      // Provide comprehensive error message
      let errorMsg = error?.message || 'Unknown error';
      if (error?.name) {
        errorMsg = `${error.name}: ${errorMsg}`;
      }
      if (error?.stderr) {
        errorMsg += ` | stderr: ${error.stderr}`;
      }
      if (error?.stdout) {
        errorMsg += ` | stdout: ${error.stdout}`;
      }
      if (error?.code) {
        errorMsg += ` | code: ${error.code}`;
      }
      if (error?.errno) {
        errorMsg += ` | errno: ${error.errno}`;
      }
      if (error?.path) {
        errorMsg += ` | path: ${error.path}`;
      }
      if (error?.syscall) {
        errorMsg += ` | syscall: ${error.syscall}`;
      }

      onProgress?.(`Claude Error: ${errorMsg}`);

      return {
        success: false,
        error: errorMsg,
        output: fullOutput,
      };
    }
  }

  /**
   * Validate the configuration
   */
  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.apiKey) {
      return { valid: false, error: 'API key is not configured' };
    }
    if (!this.config.baseUrl) {
      return { valid: false, error: 'Base URL is not configured' };
    }
    return { valid: true };
  }
}

/**
 * Create a new Claude SDK instance
 */
export function createClaudeSDK(config: ClaudeConfig): ClaudeSDK {
  return new ClaudeSDK(config);
}
