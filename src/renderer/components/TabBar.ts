import { EditorState } from '../state/EditorStateManager';

export class TabBar {
  private container: HTMLElement;
  private tabsContainer: HTMLElement;
  private newTabBtn: HTMLElement;
  private onNewTab: () => void;
  private onSelectTab: (id: string) => void;
  private onCloseTab: (id: string) => void;
  private onReorder: (fromIndex: number, toIndex: number) => void;
  private onRename: (id: string, newName: string) => void;
  private draggedIndex: number | null = null;
  private dragOverIndex: number | null = null;

  constructor(
    container: HTMLElement,
    options: {
      onNewTab: () => void;
      onSelectTab: (id: string) => void;
      onCloseTab: (id: string) => void;
      onReorder: (fromIndex: number, toIndex: number) => void;
      onRename: (id: string, newName: string) => void;
    }
  ) {
    this.container = container;
    this.onNewTab = options.onNewTab;
    this.onSelectTab = options.onSelectTab;
    this.onCloseTab = options.onCloseTab;
    this.onReorder = options.onReorder;
    this.onRename = options.onRename;

    this.render();
  }

  private render(): void {
    this.container.className = 'tab-bar';
    this.container.innerHTML = '';

    // New tab button
    this.newTabBtn = document.createElement('button');
    this.newTabBtn.className = 'new-tab-btn';
    this.newTabBtn.textContent = '+ New Tab';
    this.newTabBtn.addEventListener('click', () => this.onNewTab());
    this.container.appendChild(this.newTabBtn);

    // Tabs container
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'tabs-container';
    this.container.appendChild(this.tabsContainer);
  }

  renderTabs(editors: EditorState[]): void {
    this.tabsContainer.innerHTML = '';

    editors.forEach((editor, index) => {
      const tab = this.createTab(editor, index);
      this.tabsContainer.appendChild(tab);
    });
  }

  private createTab(editor: EditorState, index: number): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.draggable = true;
    tab.dataset.index = index.toString();
    tab.dataset.id = editor.id;

    if (index === this.dragOverIndex) {
      tab.classList.add('drag-over');
    }

    // Tab content
    const content = document.createElement('span');
    content.className = 'tab-content';
    content.textContent = editor.name;
    content.title = editor.name;

    // Dirty indicator
    if (editor.isDirty) {
      const dirtyIndicator = document.createElement('span');
      dirtyIndicator.className = 'dirty-indicator';
      dirtyIndicator.textContent = '●';
      tab.appendChild(dirtyIndicator);
    }

    tab.appendChild(content);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close tab';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onCloseTab(editor.id);
    });
    tab.appendChild(closeBtn);

    // Click handler for selection
    tab.addEventListener('click', () => {
      this.onSelectTab(editor.id);
    });

    // Double-click for rename
    tab.addEventListener('dblclick', () => {
      this.promptRename(editor);
    });

    // Drag and drop handlers
    tab.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
    tab.addEventListener('dragover', (e) => this.handleDragOver(e, index));
    tab.addEventListener('dragleave', () => this.handleDragLeave());
    tab.addEventListener('drop', (e) => this.handleDrop(e, index));
    tab.addEventListener('dragend', () => this.handleDragEnd());

    return tab;
  }

  private handleDragStart(e: DragEvent, index: number): void {
    this.draggedIndex = index;
    (e.target as HTMLElement).classList.add('dragging');
    e.dataTransfer?.setData('text/plain', index.toString());
  }

  private handleDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  private handleDragLeave(): void {
    // Visual feedback handled by re-render
  }

  private handleDrop(e: DragEvent, dropIndex: number): void {
    e.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      this.onReorder(this.draggedIndex, dropIndex);
    }
  }

  private handleDragEnd(): void {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }

  private promptRename(editor: EditorState): void {
    // Create a modal for renaming
    const modal = document.createElement('div');
    modal.className = 'rename-modal';

    const dialog = document.createElement('div');
    dialog.className = 'rename-dialog';

    const label = document.createElement('label');
    label.textContent = 'Rename tab:';
    dialog.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = editor.name;
    dialog.appendChild(input);

    const buttons = document.createElement('div');
    buttons.className = 'rename-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => modal.remove());

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'primary';
    renameBtn.addEventListener('click', () => {
      const newName = input.value.trim();
      if (newName && newName !== editor.name) {
        this.onRename(editor.id, newName);
      }
      modal.remove();
    });

    // Enter key to rename, Escape to cancel
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        renameBtn.click();
      } else if (e.key === 'Escape') {
        modal.remove();
      }
    });

    buttons.appendChild(cancelBtn);
    buttons.appendChild(renameBtn);
    dialog.appendChild(buttons);
    modal.appendChild(dialog);

    document.body.appendChild(modal);

    // Focus input and select all text
    setTimeout(() => {
      input.focus();
      input.select();
    }, 10);
  }

  updateTab(editor: EditorState): void {
    // Re-render all tabs (simpler than individual update)
    // In a more complex implementation, we could update individual elements
  }
}
