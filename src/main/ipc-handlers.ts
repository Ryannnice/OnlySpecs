import { ipcMain, dialog } from 'electron';
import * as pty from 'node-pty';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface EditorData {
  id: string;
  name: string;
  content: string;
}

export interface Metadata {
  order: string[];
  nextIndex: number;
}

const EDITORS_DIR = path.join(os.homedir(), 'Documents', 'OnlySpecs', 'editors');
const METADATA_FILE = path.join(EDITORS_DIR, 'metadata.json');

async function ensureEditorsDir() {
  try {
    await fs.mkdir(EDITORS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create editors directory:', error);
  }
}

async function getMetadata(): Promise<Metadata> {
  await ensureEditorsDir();
  try {
    const content = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Create default metadata if doesn't exist
    const metadata: Metadata = { order: [], nextIndex: 1 };
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return metadata;
  }
}

async function saveMetadata(metadata: Metadata): Promise<void> {
  await ensureEditorsDir();
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

export function registerIpcHandlers() {
  // Load all editors
  ipcMain.handle('editor:load-all', async (): Promise<EditorData[]> => {
    await ensureEditorsDir();
    const metadata = await getMetadata();
    const editors: EditorData[] = [];

    for (const id of metadata.order) {
      try {
        const filePath = path.join(EDITORS_DIR, `${id}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const editorData = JSON.parse(content) as EditorData;
        editors.push(editorData);
      } catch (error) {
        console.error(`Failed to load editor ${id}:`, error);
      }
    }

    return editors;
  });

  // Save single editor
  ipcMain.handle('editor:save', async (_event, editorData: EditorData): Promise<void> => {
    await ensureEditorsDir();
    const filePath = path.join(EDITORS_DIR, `${editorData.id}.json`);

    // Update metadata to include this editor if not present
    const metadata = await getMetadata();
    if (!metadata.order.includes(editorData.id)) {
      metadata.order.push(editorData.id);
      await saveMetadata(metadata);
    }

    await fs.writeFile(filePath, JSON.stringify(editorData, null, 2));
  });

  // Save all editors
  ipcMain.handle('editor:save-all', async (_event, editors: EditorData[]): Promise<void> => {
    await ensureEditorsDir();
    const metadata = await getMetadata();

    // Update metadata order
    metadata.order = editors.map(e => e.id);
    metadata.nextIndex = Math.max(metadata.nextIndex, editors.length + 1);
    await saveMetadata(metadata);

    // Save each editor
    for (const editor of editors) {
      const filePath = path.join(EDITORS_DIR, `${editor.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(editor, null, 2));
    }
  });

  // Rename editor
  ipcMain.handle('editor:rename', async (_event, id: string, newName: string): Promise<void> => {
    await ensureEditorsDir();
    const filePath = path.join(EDITORS_DIR, `${id}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const editorData = JSON.parse(content) as EditorData;
      editorData.name = newName;
      await fs.writeFile(filePath, JSON.stringify(editorData, null, 2));
    } catch (error) {
      console.error(`Failed to rename editor ${id}:`, error);
      throw error;
    }
  });

  // Delete editor
  ipcMain.handle('editor:delete', async (_event, id: string): Promise<void> => {
    await ensureEditorsDir();
    const filePath = path.join(EDITORS_DIR, `${id}.json`);

    try {
      await fs.unlink(filePath);

      // Remove from metadata
      const metadata = await getMetadata();
      metadata.order = metadata.order.filter(editorId => editorId !== id);
      await saveMetadata(metadata);
    } catch (error) {
      console.error(`Failed to delete editor ${id}:`, error);
      throw error;
    }
  });

  // Save editor order (after reordering)
  ipcMain.handle('editor:save-order', async (_event, order: string[]): Promise<void> => {
    const metadata = await getMetadata();
    metadata.order = order;
    await saveMetadata(metadata);
  });

  // Get next index for naming
  ipcMain.handle('editor:get-next-index', async (): Promise<number> => {
    const metadata = await getMetadata();
    return metadata.nextIndex;
  });

  // Increment and save next index
  ipcMain.handle('editor:increment-next-index', async (): Promise<number> => {
    const metadata = await getMetadata();
    const index = metadata.nextIndex;
    metadata.nextIndex++;
    await saveMetadata(metadata);
    return index;
  });

  // PTY Terminal management
  const ptySessions = new Map<string, pty.IPty>();

  // Create a new PTY session
  ipcMain.handle('terminal:create', async (_event, sessionId: string, cwd?: string): Promise<{ pid: number }> => {
    const shell = process.env.SHELL || '/bin/bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: cwd || os.homedir(),
      env: process.env as { [key: string]: string },
    });

    ptySessions.set(sessionId, ptyProcess);

    // Send data back to renderer when PTY emits data
    ptyProcess.onData((data) => {
      _event.sender.send(`terminal:data-${sessionId}`, data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      _event.sender.send(`terminal:exit-${sessionId}`, { exitCode, signal });
      ptySessions.delete(sessionId);
    });

    return { pid: ptyProcess.pid };
  });

  // Write to PTY
  ipcMain.handle('terminal:write', async (_event, sessionId: string, data: string): Promise<void> => {
    const ptyProcess = ptySessions.get(sessionId);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  // Resize PTY
  ipcMain.handle('terminal:resize', async (_event, sessionId: string, cols: number, rows: number): Promise<void> => {
    const ptyProcess = ptySessions.get(sessionId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  });

  // Kill PTY
  ipcMain.handle('terminal:kill', async (_event, sessionId: string): Promise<void> => {
    const ptyProcess = ptySessions.get(sessionId);
    if (ptyProcess) {
      ptyProcess.kill();
      ptySessions.delete(sessionId);
    }
  });

  // Cleanup all PTY sessions on app quit
  ipcMain.on('terminal:cleanup', () => {
    for (const [sessionId, ptyProcess] of ptySessions) {
      ptyProcess.kill();
    }
    ptySessions.clear();
  });
}
