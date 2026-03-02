/**
 * Configuration for Claude Agent SDK
 */
export interface ClaudeConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Progress callback for streaming updates
 */
export type ProgressCallback = (message: string) => void;

/**
 * Options for Claude query
 */
export interface ClaudeQueryOptions {
  /**
   * Permission mode for the agent
   */
  permissionMode?: 'bypassPermissions';

  /**
   * Maximum number of turns for the agent
   */
  maxTurns?: number;

  /**
   * Optional progress callback for streaming updates
   */
  onProgress?: ProgressCallback;

  /**
   * Current working directory for the Claude Code subprocess.
   * If not specified, defaults to the current process working directory.
   */
  cwd?: string;
}

/**
 * Result of a Claude query
 */
export interface ClaudeQueryResult {
  /**
   * The complete text output from Claude
   */
  output: string;

  /**
   * Whether the query completed successfully
   */
  success: boolean;

  /**
   * Error message if the query failed
   */
  error?: string;
}
