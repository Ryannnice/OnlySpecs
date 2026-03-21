import { Modal } from './Modal';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  expanded?: boolean;
}

export interface FileExplorerOptions {
  onFileSelect?: (filePath: string) => void;
  onFileDelete?: (filePath: string) => void;
  onRootChange?: (rootPath: string) => void;
  onOpenInTerminal?: (filePath: string, isDirectory: boolean) => void;
  themeManager?: any;
}

export class FileExplorer {
  private container: HTMLElement;
  private options: FileExplorerOptions;
  private currentRoot: string | null = null;
  private fileTree: FileEntry[] = [];
  private onFileSelect?: (filePath: string) => void;
  private onFileDelete?: (filePath: string) => void;
  private onRootChange?: (rootPath: string) => void;
  private onOpenInTerminal?: (filePath: string, isDirectory: boolean) => void;
  private contextMenu: HTMLElement | null = null;
  private contextMenuTarget: { path: string; isDirectory: boolean; name: string } | null = null;

  constructor(container: HTMLElement, options: FileExplorerOptions = {}) {
    this.container = container;
    this.options = options;
    this.onFileSelect = options.onFileSelect;
    this.onFileDelete = options.onFileDelete;
    this.onRootChange = options.onRootChange;
    this.onOpenInTerminal = options.onOpenInTerminal;
    this.render();
    this.createContextMenu();
    this.setupGlobalListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="file-explorer">
        <div class="file-explorer-header">
          <div class="file-explorer-title">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
            </svg>
            <span>文件浏览器</span>
          </div>
          <button class="file-explorer-open-btn" title="打开文件夹">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 4v10a1 1 0 001 1h12a1 1 0 001-1V4H1zm1-2h12a2 2 0 012 2v10a2 2 0 01-2 2H2a2 2 0 01-2-2V4a2 2 0 012-2z"/>
            </svg>
          </button>
        </div>
        <div class="file-explorer-content">
          <div class="file-explorer-empty">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.3;">
              <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
            </svg>
            <p>未打开文件夹</p>
            <button class="file-explorer-open-big-btn">打开文件夹</button>
          </div>
        </div>
      </div>
    `;

    // Set up event listeners
    const openBtn = this.container.querySelector('.file-explorer-open-btn');
    const openBigBtn = this.container.querySelector('.file-explorer-open-big-btn');

    openBtn?.addEventListener('click', () => this.openFolder());
    openBigBtn?.addEventListener('click', () => this.openFolder());
  }

  private async openFolder(): Promise<void> {
    if (!window.electronAPI) {
      console.error('[FileExplorer] electronAPI not available');
      return;
    }

    const result = await window.electronAPI.selectDirectory();
    if (result.success && result.path) {
      this.currentRoot = result.path;
      await this.loadDirectory(result.path);
      if (this.onRootChange) {
        this.onRootChange(result.path);
      }
    }
  }

  private async loadDirectory(dirPath: string): Promise<void> {
    if (!window.electronAPI) {
      console.error('[FileExplorer] electronAPI not available');
      return;
    }

    const result = await window.electronAPI.readDirectory(dirPath);
    if (result.success && result.entries) {
      this.fileTree = result.entries.map(entry => ({
        ...entry,
        expanded: false,
        children: []
      }));
      this.renderTree();
      this.updateHeader();
    }
  }

  private async expandDirectory(entry: FileEntry): Promise<void> {
    if (!window.electronAPI) {
      console.error('[FileExplorer] electronAPI not available');
      return;
    }

    const result = await window.electronAPI.readDirectory(entry.path);
    if (result.success && result.entries) {
      entry.children = result.entries.map(child => ({
        ...child,
        expanded: false,
        children: []
      }));
      entry.expanded = true;
      this.renderTree();
    }
  }

  private collapseDirectory(entry: FileEntry): void {
    entry.expanded = false;
    this.renderTree();
  }

  private updateHeader(): void {
    const title = this.container.querySelector('.file-explorer-title span');
    if (title && this.currentRoot) {
      const parts = this.currentRoot.split('/');
      title.textContent = parts.length > 3 ? `.../${parts.slice(-2).join('/')}` : this.currentRoot;
    }
  }

  public async loadProjectRoot(rootPath: string): Promise<void> {
    this.currentRoot = rootPath;
    await this.loadDirectory(rootPath);
    if (this.onRootChange) {
      this.onRootChange(rootPath);
    }
  }

  public async refresh(): Promise<void> {
    if (!this.currentRoot) return;
    await this.loadDirectory(this.currentRoot);
  }

  public getCurrentRoot(): string | null {
    return this.currentRoot;
  }

  private renderTree(): void {
    const content = this.container.querySelector('.file-explorer-content') as HTMLElement;
    if (!content) return;

    if (this.fileTree.length === 0) {
      content.innerHTML = `
        <div class="file-explorer-empty">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.3;">
            <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
          </svg>
          <p>空文件夹</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `<ul class="file-tree">${this.renderEntries(this.fileTree)}</ul>`;

    // Add event listeners
    this.attachTreeListeners(content);
  }

  private renderEntries(entries: FileEntry[], depth: number = 0): string {
    return entries.map(entry => this.renderEntry(entry, depth)).join('');
  }

  private isSpecsFile(name: string): boolean {
    return /^specs_v\d+\.md$/i.test(name);
  }

  private renderEntry(entry: FileEntry, depth: number): string {
    const indent = depth * 16;
    const icon = entry.isDirectory
      ? `<svg class="file-icon folder-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
        </svg>`
      : `<svg class="file-icon file-icon-default" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
        </svg>`;

    const chevron = entry.isDirectory
      ? `<svg class="chevron ${entry.expanded ? 'expanded' : ''}" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M4.5 3l3 3-3 3V3z"/>
        </svg>`
      : '<span class="chevron-placeholder"></span>';

    // Add delete icon for specs files and folders
    const showDeleteIcon = entry.isDirectory || this.isSpecsFile(entry.name);
    const deleteIcon = showDeleteIcon
      ? `<button class="file-delete-btn" title="${entry.isDirectory ? '删除文件夹' : '删除文件'}" data-path="${this.escapeHtml(entry.path)}" data-is-directory="${entry.isDirectory}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>`
      : '';

    const children = entry.isDirectory && entry.expanded && entry.children
      ? `<ul class="nested-children">${this.renderEntries(entry.children, depth + 1)}</ul>`
      : '';

    return `
      <li class="file-tree-item ${entry.expanded ? 'expanded' : ''}" data-path="${this.escapeHtml(entry.path)}" data-is-directory="${entry.isDirectory}">
        <div class="file-tree-item-content" style="padding-left: ${indent + 8}px">
          <span class="file-tree-toggle">${chevron}</span>
          <span class="file-tree-icon">${icon}</span>
          <span class="file-tree-name">${this.escapeHtml(entry.name)}</span>
          ${deleteIcon}
        </div>
        ${children}
      </li>
    `;
  }

  private attachTreeListeners(container: HTMLElement): void {
    // Toggle directory expand/collapse
    container.querySelectorAll('.file-tree-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (toggle as HTMLElement).closest('.file-tree-item') as HTMLElement;
        if (!item) return;

        const path = item.dataset.path;
        const isDirectory = item.dataset.isDirectory === 'true';

        if (isDirectory && path) {
          const entry = this.findEntry(this.fileTree, path);
          if (entry) {
            if (entry.expanded) {
              this.collapseDirectory(entry);
            } else {
              this.expandDirectory(entry);
            }
          }
        }
      });
    });

    // File/folder selection
    container.querySelectorAll('.file-tree-item-content').forEach(content => {
      content.addEventListener('click', (e) => {
        const item = (content as HTMLElement).closest('.file-tree-item') as HTMLElement;
        if (!item) return;

        const path = item.dataset.path;
        const isDirectory = item.dataset.isDirectory === 'true';

        // Remove active class from all items
        container.querySelectorAll('.file-tree-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        if (!path) return;

        if (isDirectory) {
          const entry = this.findEntry(this.fileTree, path);
          if (entry) {
            if (entry.expanded) {
              this.collapseDirectory(entry);
            } else {
              this.expandDirectory(entry);
            }
          }
          return;
        }

        if (this.onFileSelect) {
          this.onFileSelect(path);
        }
      });
    });

    // Delete button for specs files and folders
    container.querySelectorAll('.file-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filePath = (btn as HTMLElement).dataset.path;
        const isDirectory = (btn as HTMLElement).dataset.isDirectory === 'true';
        if (filePath) {
          this.handleDelete(filePath, isDirectory);
        }
      });
    });

    // Right-click context menu for all file tree items
    container.querySelectorAll('.file-tree-item-content').forEach(content => {
      content.addEventListener('contextmenu', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const mouseEvent = e as MouseEvent;

        const item = (content as HTMLElement).closest('.file-tree-item') as HTMLElement;
        if (!item) return;

        const path = item.dataset.path;
        const isDirectory = item.dataset.isDirectory === 'true';
        const nameElem = item.querySelector('.file-tree-name');
        const name = nameElem?.textContent || '';

        if (path) {
          this.showContextMenu(mouseEvent.clientX, mouseEvent.clientY, { path, isDirectory, name });
        }
      });
    });
  }

  private async handleDelete(filePath: string, isDirectory: boolean): Promise<void> {
    const fileName = filePath.split('/').pop() || filePath;
    const itemType = isDirectory ? 'folder' : 'file';
    const warningText = isDirectory
      ? `\n\n这将永久删除该文件夹及其内所有文件。`
      : `\n\n这将永久删除该文件。`;

    const confirmed = confirm(`确定要删除 "${fileName}" 吗？${warningText}`);

    if (!confirmed) return;

    if (!window.electronAPI) {
      console.error('[FileExplorer] electronAPI not available');
      return;
    }

    let result;
    if (isDirectory) {
      result = await window.electronAPI.deleteFolder(filePath);
    } else {
      result = await window.electronAPI.deleteFile(filePath);
    }

    if (result.success) {
      // Notify parent about the deletion
      if (this.onFileDelete) {
        this.onFileDelete(filePath);
      }
      // Refresh the file tree
      await this.refresh();
    } else {
      alert(`删除失败：${result.error || 'Unknown error'}`);
    }
  }

  private findEntry(entries: FileEntry[], path: string): FileEntry | undefined {
    for (const entry of entries) {
      if (entry.path === path) return entry;
      if (entry.children) {
        const found = this.findEntry(entry.children, path);
        if (found) return found;
      }
    }
    return undefined;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public setTheme(theme: 'light' | 'dark'): void {
    // Theme is handled by CSS variables
  }

  private createContextMenu(): void {
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'context-menu';
    this.contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="openInTerminal">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 2v12h16V2H0zm15 11H1V3h14v10zM3 5h2v2H3V5zm0 3h2v2H3V8zm0 3h10v1H3v-1z"/>
        </svg>
        <span>在终端中打开</span>
      </div>
      <div class="context-menu-item" data-action="revealInFinder">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 4v10a1 1 0 001 1h12a1 1 0 001-1V4H1zm1-2h12a2 2 0 012 2v10a2 2 0 01-2 2H2a2 2 0 01-2-2V4a2 2 0 012-2z"/>
        </svg>
        <span>在资源管理器中显示</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="copyPath">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 4h3v1H4v8h6v-2h1v3H3V4h1zm4-2h6v10H8V2zm1 1v8h4V3H9z"/>
        </svg>
        <span>复制路径</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="rename">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.498 1.502a1.5 1.5 0 012.121 0l1.879 1.879a1.5 1.5 0 010 2.121l-9.88 9.88a.5.5 0 01-.207.121l-3.5 1a.5.5 0 01-.624-.624l1-3.5a.5.5 0 01.121-.207l9.88-9.88zm1.414.707a.5.5 0 00-.707 0L10.5 4.707 12.293 6.5l1.707-1.707a.5.5 0 000-.707l-1.086-1.086zM11.793 5.5L10 3.707l-8 8V14h2.293l8-8z"/>
        </svg>
        <span>重命名</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item context-menu-item-danger" data-action="delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"/>
          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
        </svg>
        <span>删除</span>
      </div>
    `;
    document.body.appendChild(this.contextMenu);

    // Add click handlers for menu items
    this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (item as HTMLElement).dataset.action;
        if (action && this.contextMenuTarget) {
          this.handleContextMenuAction(action);
        }
        this.hideContextMenu();
      });
    });
  }

  private setupGlobalListeners(): void {
    // Hide context menu when clicking outside
    document.addEventListener('click', () => {
      this.hideContextMenu();
    });

    // Hide context menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });
  }

  private showContextMenu(x: number, y: number, target: { path: string; isDirectory: boolean; name: string }): void {
    if (!this.contextMenu) return;

    this.contextMenuTarget = target;

    // Position the menu
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add('visible');

    // Adjust position if menu goes off screen
    const rect = this.contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.classList.remove('visible');
    }
    this.contextMenuTarget = null;
  }

  private async handleContextMenuAction(action: string): Promise<void> {
    if (!this.contextMenuTarget) return;

    const { path, isDirectory, name } = this.contextMenuTarget;

    switch (action) {
      case 'openInTerminal':
        if (this.onOpenInTerminal) {
          this.onOpenInTerminal(path, isDirectory);
        }
        break;

      case 'revealInFinder':
        if (window.electronAPI) {
          const result = await window.electronAPI.revealInFinder(path);
          if (!result.success) {
            alert('Failed to reveal in Finder: ' + (result.error || 'Unknown error'));
          }
        }
        break;

      case 'copyPath':
        if (window.electronAPI) {
          await window.electronAPI.copyPath(path);
        }
        break;

      case 'rename':
        await this.handleRename(path, name, isDirectory);
        break;

      case 'delete':
        await this.handleDelete(path, isDirectory);
        break;
    }
  }

  private async handleRename(oldPath: string, oldName: string, isDirectory: boolean): Promise<void> {
    // Create modal content with input field
    const content = document.createElement('div');
    content.className = 'rename-dialog-content';

    const label = document.createElement('label');
    label.textContent = `输入 "${oldName}" 的新名称：`;
    label.className = 'rename-label';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'rename-input';
    input.placeholder = '输入新名称';

    // Select the filename without extension for files
    const lastDotIndex = oldName.lastIndexOf('.');
    if (!isDirectory && lastDotIndex > 0) {
      setTimeout(() => {
        input.setSelectionRange(0, lastDotIndex);
      }, 0);
    } else {
      setTimeout(() => {
        input.select();
      }, 0);
    }

    content.appendChild(label);
    content.appendChild(input);

    let newName: string | null = null;

    const modal = new Modal({
      title: isDirectory ? '重命名文件夹' : '重命名文件',
      content,
      confirmText: '重命名',
      cancelText: '取消',
      width: '400px',
      onConfirm: () => {
        newName = input.value.trim();
      },
      onCancel: () => {
        newName = null;
      }
    });

    // Handle Enter key in input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        newName = input.value.trim();
        modal.close();
      }
    });

    modal.open();

    // Wait for modal to close and check result
    await new Promise<void>((resolve) => {
      const checkClosed = setInterval(() => {
        const overlay = document.querySelector('.modal-overlay');
        if (!overlay) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 100);
    });

    if (!newName || newName === oldName) return;

    if (!window.electronAPI) {
      console.error('[FileExplorer] electronAPI not available');
      return;
    }

    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${parentPath}/${newName}`;

    const result = await window.electronAPI.renamePath(oldPath, newPath);
    if (result.success) {
      await this.refresh();
    } else {
      // Show error modal
      const errorContent = document.createElement('div');
      errorContent.innerHTML = `<p>Failed to rename: ${result.error || 'Unknown error'}</p>`;
      const errorModal = new Modal({
        title: '错误',
        content: errorContent,
        confirmText: '确定',
        width: '350px'
      });
      errorModal.open();
    }
  }
}
