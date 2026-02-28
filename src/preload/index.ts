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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
