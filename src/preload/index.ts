import { contextBridge, ipcRenderer } from 'electron';

export interface EditorData {
  id: string;
  name: string;
  content: string;
}

const electronAPI = {
  // Load all saved editors
  loadAllEditors: (): Promise<EditorData[]> => ipcRenderer.invoke('editor:load-all'),

  // Save a single editor
  saveEditor: (editor: EditorData): Promise<void> => ipcRenderer.invoke('editor:save', editor),

  // Save all editors
  saveAllEditors: (editors: EditorData[]): Promise<void> => ipcRenderer.invoke('editor:save-all', editors),

  // Rename an editor
  renameEditor: (id: string, newName: string): Promise<void> => ipcRenderer.invoke('editor:rename', id, newName),

  // Delete an editor
  deleteEditor: (id: string): Promise<void> => ipcRenderer.invoke('editor:delete', id),

  // Save editor order
  saveOrder: (order: string[]): Promise<void> => ipcRenderer.invoke('editor:save-order', order),

  // Get next index for untitled naming
  getNextIndex: (): Promise<number> => ipcRenderer.invoke('editor:get-next-index'),

  // Increment next index
  incrementNextIndex: (): Promise<number> => ipcRenderer.invoke('editor:increment-next-index'),

  // PTY Terminal APIs
  createTerminal: (sessionId: string, cwd?: string): Promise<{ pid: number }> =>
    ipcRenderer.invoke('terminal:create', sessionId, cwd),

  writeTerminal: (sessionId: string, data: string): Promise<void> =>
    ipcRenderer.invoke('terminal:write', sessionId, data),

  resizeTerminal: (sessionId: string, cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),

  killTerminal: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('terminal:kill', sessionId),

  // Listen for terminal data
  onTerminalData: (sessionId: string, callback: (data: string) => void) => {
    const listener = (_event: any, data: string) => callback(data);
    ipcRenderer.on(`terminal:data-${sessionId}`, listener);
    return () => ipcRenderer.removeListener(`terminal:data-${sessionId}`, listener);
  },

  // Listen for terminal exit
  onTerminalExit: (sessionId: string, callback: (exitCode: number, signal: number) => void) => {
    const listener = (_event: any, data: { exitCode: number; signal: number }) =>
      callback(data.exitCode, data.signal);
    ipcRenderer.once(`terminal:exit-${sessionId}`, listener);
    return () => ipcRenderer.removeListener(`terminal:exit-${sessionId}`, listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
