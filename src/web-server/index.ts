import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import type { IPty } from 'node-pty';

const require = createRequire(import.meta.url);
const pty = require('node-pty') as typeof import('node-pty');

const PORT = Number(process.env.ONLYSPECS_PORT ?? 3579);
const STATIC_DIR = path.resolve('.vite/renderer/main_window');

// --- Paths (mirror ipc-handlers.ts) ---
const EDITORS_DIR = path.join(os.homedir(), 'Documents', 'OnlySpecs', 'editors');
const METADATA_FILE = path.join(EDITORS_DIR, 'metadata.json');
const CONFIG_DIR = path.join(os.homedir(), 'Documents', 'OnlySpecs');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface EditorData { id: string; name: string; content: string; filePath?: string; }
interface Metadata { order: string[]; nextIndex: number; }
interface AppConfig { apiKey: string; baseUrl: string; lastProjectPath: string; }

const DEFAULT_CONFIG: AppConfig = { apiKey: '', baseUrl: 'https://api.anthropic.com', lastProjectPath: '' };

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function getMetadata(): Promise<Metadata> {
  await ensureDir(EDITORS_DIR);
  try {
    return JSON.parse(await fs.readFile(METADATA_FILE, 'utf-8'));
  } catch {
    const m: Metadata = { order: [], nextIndex: 1 };
    await fs.writeFile(METADATA_FILE, JSON.stringify(m, null, 2));
    return m;
  }
}

async function saveMetadata(m: Metadata) {
  await ensureDir(EDITORS_DIR);
  await fs.writeFile(METADATA_FILE, JSON.stringify(m, null, 2));
}

async function getConfig(): Promise<AppConfig> {
  await ensureDir(CONFIG_DIR);
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8')) };
  } catch {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }
}

function isClaudeCommand(command: string): boolean {
  const normalized = command.trim().toLowerCase();
  if (normalized === 'claude') return true;
  const lastSlash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  const base = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  return base === 'claude';
}

// --- Express setup ---
const app = express();

app.get('/', async (_req, res) => {
  try {
    let html = await fs.readFile(path.join(STATIC_DIR, 'index.html'), 'utf-8');
    html = html.replace('</head>', '<script src="/shim.js"></script>\n</head>');
    res.type('html').send(html);
  } catch (err) {
    res.status(500).send(`Failed to load index.html. Run "npm run build:renderer" first.\n${err}`);
  }
});

app.get('/shim.js', (_req, res) => {
  res.sendFile(path.resolve('src/web-server/shim.js'));
});

app.use(express.static(STATIC_DIR));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// --- WebSocket handler ---
wss.on('connection', (ws: WebSocket) => {
  const ptySessions = new Map<string, IPty>();

  ws.on('message', async (raw) => {
    let id: string | undefined;
    let type: string | undefined;
    try {
      const msg = JSON.parse(raw.toString());
      id = msg.id;
      type = msg.type;
      const payload = msg.payload ?? {};
      const result = await handleMessage(ws, ptySessions, type!, payload);
      ws.send(JSON.stringify({ id, type: 'response', payload: result }));
    } catch (err: any) {
      ws.send(JSON.stringify({ id, type: 'error', payload: { message: err?.message ?? String(err) } }));
    }
  });

  ws.on('close', () => {
    for (const p of ptySessions.values()) p.kill();
    ptySessions.clear();
  });
});

function push(ws: WebSocket, event: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'push', event, payload }));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMessage(ws: WebSocket, ptySessions: Map<string, IPty>, type: string, payload: any): Promise<unknown> {
  switch (type) {

    // --- Editor ---
    case 'editor:load-all': {
      await ensureDir(EDITORS_DIR);
      const metadata = await getMetadata();
      const editors: EditorData[] = [];
      for (const id of metadata.order) {
        try {
          editors.push(JSON.parse(await fs.readFile(path.join(EDITORS_DIR, `${id}.json`), 'utf-8')));
        } catch { /* skip missing */ }
      }
      return editors;
    }

    case 'editor:save': {
      const editor = payload as EditorData;
      await ensureDir(EDITORS_DIR);
      const metadata = await getMetadata();
      if (!metadata.order.includes(editor.id)) {
        metadata.order.push(editor.id);
        await saveMetadata(metadata);
      }
      await fs.writeFile(path.join(EDITORS_DIR, `${editor.id}.json`), JSON.stringify(editor, null, 2));
      return undefined;
    }

    case 'editor:save-all': {
      const editors = payload as EditorData[];
      await ensureDir(EDITORS_DIR);
      const metadata = await getMetadata();
      metadata.order = editors.map(e => e.id);
      metadata.nextIndex = Math.max(metadata.nextIndex, editors.length + 1);
      await saveMetadata(metadata);
      for (const e of editors) {
        await fs.writeFile(path.join(EDITORS_DIR, `${e.id}.json`), JSON.stringify(e, null, 2));
      }
      return undefined;
    }

    case 'editor:rename': {
      const { id, newName } = payload as { id: string; newName: string };
      const filePath = path.join(EDITORS_DIR, `${id}.json`);
      const e = JSON.parse(await fs.readFile(filePath, 'utf-8')) as EditorData;
      e.name = newName;
      await fs.writeFile(filePath, JSON.stringify(e, null, 2));
      return undefined;
    }

    case 'editor:delete': {
      const { id } = payload as { id: string };
      await fs.unlink(path.join(EDITORS_DIR, `${id}.json`));
      const metadata = await getMetadata();
      metadata.order = metadata.order.filter(x => x !== id);
      await saveMetadata(metadata);
      return undefined;
    }

    case 'editor:save-order': {
      const { order } = payload as { order: string[] };
      const metadata = await getMetadata();
      metadata.order = order;
      await saveMetadata(metadata);
      return undefined;
    }

    case 'editor:get-next-index': {
      return (await getMetadata()).nextIndex;
    }

    case 'editor:increment-next-index': {
      const metadata = await getMetadata();
      const index = metadata.nextIndex;
      metadata.nextIndex++;
      await saveMetadata(metadata);
      return index;
    }

    // --- Terminal ---
    case 'terminal:create': {
      const { sessionId, cwdOrOptions } = payload as { sessionId: string; cwdOrOptions?: string | { cwd?: string; command?: string; args?: string[]; cols?: number; rows?: number } };
      const options = typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : (cwdOrOptions || {});
      const command = options.command || process.env.SHELL || '/bin/bash';
      const commandParts = command.trim().split(/\s+/).filter(Boolean);
      const executable = commandParts[0] || command;
      const inlineArgs = commandParts.slice(1);
      const args = [...inlineArgs, ...(options.args || [])];
      if (isClaudeCommand(executable) && !args.includes('--dangerously-skip-permissions')) {
        args.push('--dangerously-skip-permissions');
      }
      const cols = options.cols || 80;
      const rows = options.rows || 24;

      const ptyProcess = pty.spawn(executable, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: options.cwd || os.homedir(),
        env: process.env as { [key: string]: string },
      });

      ptySessions.set(sessionId, ptyProcess);

      ptyProcess.onData((data) => {
        push(ws, `terminal:data-${sessionId}`, data);
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        push(ws, `terminal:exit-${sessionId}`, { exitCode, signal });
        ptySessions.delete(sessionId);
      });

      return { pid: ptyProcess.pid };
    }

    case 'terminal:write': {
      const { sessionId, data } = payload as { sessionId: string; data: string };
      ptySessions.get(sessionId)?.write(data);
      return undefined;
    }

    case 'terminal:run-command': {
      const { sessionId, command } = payload as { sessionId: string; command: string };
      ptySessions.get(sessionId)?.write(command + '\r');
      return undefined;
    }

    case 'terminal:resize': {
      const { sessionId, cols, rows } = payload as { sessionId: string; cols: number; rows: number };
      ptySessions.get(sessionId)?.resize(cols, rows);
      return undefined;
    }

    case 'terminal:kill': {
      const { sessionId } = payload as { sessionId: string };
      const p = ptySessions.get(sessionId);
      if (p) { p.kill(); ptySessions.delete(sessionId); }
      return undefined;
    }

    // --- GitHub ---
    case 'github:clone-and-process': {
      const { repoUrl, summarizeSpecs } = payload as { repoUrl: string; summarizeSpecs: string };
      const sendProgress = (msg: string) => push(ws, 'github:progress', msg);
      const sendError = (msg: string) => { console.error('[GitHub Import]', msg); sendProgress('Error: ' + msg); };

      try {
        if (!repoUrl || typeof repoUrl !== 'string') throw new Error('Invalid repository URL');
        if (!summarizeSpecs || typeof summarizeSpecs !== 'string') throw new Error('Invalid summarize specs');

        sendProgress('Checking for git...');
        try { execSync('git --version', { encoding: 'utf8' }); } catch { throw new Error('Git is not installed or not accessible.'); }

        sendProgress('Checking for Claude CLI...');
        try { execSync('claude --version', { encoding: 'utf8' }); } catch { throw new Error('Claude CLI is not installed or not accessible.'); }

        sendProgress('Creating temporary directory...');
        const baseTempDir = path.join(os.homedir(), 'Documents', 'OnlySpecs', 'tmp');
        await ensureDir(baseTempDir);
        const tempDir = path.join(baseTempDir, `onlyspecs-${Date.now()}`);
        await ensureDir(tempDir);

        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
        sendProgress('Cloning repository from GitHub...');

        await new Promise<void>((resolve, reject) => {
          const cloneProcess = spawn('git', ['clone', repoUrl, repoName], {
            cwd: tempDir,
            env: { ...process.env },
            shell: false,
          });
          let cloneError = '';
          cloneProcess.stderr?.on('data', (data) => {
            const msg = data.toString();
            cloneError += msg;
            const trimmed = msg.trim();
            if (trimmed && !trimmed.includes('Done')) sendProgress(`Git: ${trimmed}`);
          });
          cloneProcess.stdout?.on('data', (data) => {
            const trimmed = data.toString().trim();
            if (trimmed) sendProgress(`Git: ${trimmed}`);
          });
          cloneProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Git clone failed (${code}): ${cloneError}`)));
          cloneProcess.on('error', (err) => reject(new Error(`Failed to start git: ${err.message}`)));
        });

        const repoPath = path.join(tempDir, repoName);
        sendProgress(`Repository cloned to ${repoName}`);

        try { await fs.access(repoPath); } catch { throw new Error(`Repository directory not found after clone: ${repoPath}`); }

        sendProgress('Creating specification instructions...');
        const instructionsPath = path.join(repoPath, 'summarize_specs_instructions.md');
        await fs.writeFile(instructionsPath, summarizeSpecs, 'utf-8');

        sendProgress('Repository ready for analysis!');
        sendProgress(`Working directory: ${repoPath}`);

        return { success: true, repoPath, instructionsPath };
      } catch (error: any) {
        sendError(error.message || 'Unknown error occurred');
        return { success: false, error: error.message || 'Unknown error occurred' };
      }
    }

    // --- Config ---
    case 'config:load': {
      return await getConfig();
    }

    case 'config:save': {
      await ensureDir(CONFIG_DIR);
      await fs.writeFile(CONFIG_FILE, JSON.stringify(payload, null, 2));
      return undefined;
    }

    // --- FS ---
    case 'fs:readFile': {
      const { filePath } = payload as { filePath: string };
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:writeFile': {
      const { filePath, content } = payload as { filePath: string; content: string };
      try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:selectDirectory': {
      // Path provided by shim via window.prompt
      const { path: dirPath } = payload as { path?: string };
      if (!dirPath) return { success: false, error: 'No directory selected' };
      try {
        await fs.access(dirPath);
        return { success: true, path: dirPath };
      } catch {
        return { success: false, error: `Path not accessible: ${dirPath}` };
      }
    }

    case 'project:create': {
      // Path provided by shim via window.prompt
      const { path: projectPath } = payload as { path?: string };
      if (!projectPath) return { success: false, error: 'No directory selected' };
      try {
        await fs.access(projectPath);
      } catch {
        return { success: false, error: `Path not accessible: ${projectPath}` };
      }

      const readmeContent = [
        '# OnlySpecs Project', '', 'This project is organized by specification versions and matching implementation versions.', '',
        '## Structure', '', '- `specs_v0001.md`, `specs_v0002.md`, ...', '- `code_v0001/`, `code_v0002/`, ...', '',
        '## Workflow', '', '1. Read a specs file (`specs_vXXXX.md`).', '2. Implement the code in the corresponding `code_vXXXX/` folder.',
        '3. Create the next specs version when requirements evolve.', '',
      ].join('\n');

      const licenseContent = [
        'MIT License', '', 'Copyright (c) 2026', '',
        'Permission is hereby granted, free of charge, to any person obtaining a copy',
        'of this software and associated documentation files (the "Software"), to deal',
        'in the Software without restriction, including without limitation the rights',
        'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
        'copies of the Software, and to permit persons to whom the Software is',
        'furnished to do so, subject to the following conditions:', '',
        'The above copyright notice and this permission notice shall be included in all',
        'copies or substantial portions of the Software.', '',
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
        'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
        'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
        'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
        'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
        'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
        'SOFTWARE.', '',
      ].join('\n');

      const specsTemplate = [
        '# Specifications v0001', '', '## Overview', '- Describe the product goal and target users.', '',
        '## Functional Requirements', '- FR-1:', '- FR-2:', '',
        '## Non-functional Requirements', '- Performance:', '- Reliability:', '- Security:', '',
        '## Acceptance Criteria', '- [ ] Criterion 1', '- [ ] Criterion 2', '',
      ].join('\n');

      await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent, 'utf-8');
      await fs.writeFile(path.join(projectPath, 'LICENSE'), licenseContent, 'utf-8');
      await fs.writeFile(path.join(projectPath, 'specs_v0001.md'), specsTemplate, 'utf-8');

      return { success: true, projectPath };
    }

    case 'fs:readDirectory': {
      const { dirPath } = payload as { dirPath: string };
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const entries = items
          .filter(item => !item.name.startsWith('.'))
          .map(item => ({ name: item.name, path: path.join(dirPath, item.name), isDirectory: item.isDirectory() }));
        entries.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return { success: true, entries };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:deleteFile': {
      const { filePath } = payload as { filePath: string };
      try {
        await fs.unlink(filePath);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:deleteFolder': {
      const { folderPath } = payload as { folderPath: string };
      try {
        await fs.rm(folderPath, { recursive: true, force: true });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:createDirectory': {
      const { dirPath } = payload as { dirPath: string };
      try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:exists': {
      const { path: p } = payload as { path: string };
      try {
        await fs.access(p);
        return { exists: true };
      } catch {
        return { exists: false };
      }
    }

    case 'fs:rename': {
      const { oldPath, newPath } = payload as { oldPath: string; newPath: string };
      try {
        await fs.rename(oldPath, newPath);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    case 'fs:revealInFinder': {
      // No-op in web mode
      return { success: true };
    }

    case 'fs:copyPath': {
      // Handled client-side by shim using navigator.clipboard
      return { success: true };
    }

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OnlySpecs web server running at http://127.0.0.1:${PORT}`);
});
