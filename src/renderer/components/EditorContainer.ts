import { EditorState } from '../state/EditorStateManager';

// Configuration
const DEFAULT_EDITOR_WIDTH = 850; // 100 characters at ~8.5px per char
const MIN_EDITOR_WIDTH = 300;

export class EditorContainer {
  private container: HTMLElement;
  private editorsWrapper: HTMLElement;
  private onContentChange: (id: string, content: string) => void;
  private editorElements: Map<string, HTMLElement> = new Map();
  private resizeHandles: Map<string, HTMLElement> = new Map();
  private editorWidths: Map<string, number> = new Map();
  private monaco: any;
  private isMonacoLoaded = false;
  private isResizing: boolean = false;
  private currentResizeHandle: HTMLElement | null = null;
  private currentResizingEditor: string | null = null;
  private startX: number = 0;
  private startWidth: number = 0;

  constructor(
    container: HTMLElement,
    options: {
      onContentChange: (id: string, content: string) => void;
    }
  ) {
    this.container = container;
    this.onContentChange = options.onContentChange;

    this.render();
    this.loadMonaco();
  }

  private render(): void {
    this.container.className = 'editor-container';
    this.container.innerHTML = '';

    this.editorsWrapper = document.createElement('div');
    this.editorsWrapper.className = 'editors-wrapper';
    this.container.appendChild(this.editorsWrapper);
  }

  private async loadMonaco(): Promise<void> {
    if (this.isMonacoLoaded) return;

    // Wait for Monaco to be loaded from CDN
    const checkMonaco = () => {
      return new Promise<void>((resolve) => {
        if (typeof window !== 'undefined' && (window as any).monaco) {
          this.monaco = (window as any).monaco;
          this.isMonacoLoaded = true;
          resolve();
        } else {
          setTimeout(() => checkMonaco().then(resolve), 50);
        }
      });
    };

    await checkMonaco();
  }

  renderEditors(editors: EditorState[]): void {
    // Update editor order for diff computation
    this.editorOrder = editors.map(e => e.id);

    // Get current editor IDs
    const currentIds = new Set(this.editorElements.keys());
    const newIds = new Set(editors.map(e => e.id));

    // Remove editors that no longer exist
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        this.removeEditorElement(id);
      }
    }

    // Add or update editors
    editors.forEach((editor, index) => {
      if (!this.editorElements.has(editor.id)) {
        this.createEditorElement(editor, index, editors.length);
      } else {
        // Update position if needed (for reordering)
        const wrapper = this.editorElements.get(editor.id);
        if (wrapper && wrapper.parentElement) {
          const currentIndex = Array.from(this.editorsWrapper.children).indexOf(wrapper);
          if (currentIndex !== index) {
            this.moveEditorToPosition(wrapper, index);
          }
        }
      }
    });
  }

  private createEditorElement(editor: EditorState, index: number, totalEditors: number): void {
    // Create container for editor
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'editor-wrapper';
    editorWrapper.dataset.id = editor.id;

    // Get or initialize width
    const width = this.editorWidths.get(editor.id) || DEFAULT_EDITOR_WIDTH;
    editorWrapper.style.width = `${width}px`;

    // Monaco editor container
    const editorItem = document.createElement('div');
    editorItem.className = 'editor-item';
    editorItem.dataset.id = editor.id;

    const monacoContainer = document.createElement('div');
    monacoContainer.className = 'monaco-container';
    editorItem.appendChild(monacoContainer);
    editorWrapper.appendChild(editorItem);

    // Add resize handle at the end of this editor (except for the last one)
    if (index < totalEditors - 1) {
      const resizeHandle = this.createResizeHandle(editor.id);
      editorWrapper.appendChild(resizeHandle);
      this.resizeHandles.set(editor.id, resizeHandle);
    }

    // Insert at correct position
    const children = Array.from(this.editorsWrapper.children);
    if (children[index]) {
      this.editorsWrapper.insertBefore(editorWrapper, children[index]);
    } else {
      this.editorsWrapper.appendChild(editorWrapper);
    }

    this.editorElements.set(editor.id, editorWrapper);
  }

  private createResizeHandle(editorId: string): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.dataset.editorId = editorId;

    handle.addEventListener('mousedown', (e) => this.startResize(e, editorId));

    return handle;
  }

  private startResize(e: MouseEvent, editorId: string): void {
    e.preventDefault();
    this.isResizing = true;
    this.currentResizingEditor = editorId;
    this.startX = e.clientX;

    const wrapper = this.editorElements.get(editorId);
    if (wrapper) {
      this.startWidth = wrapper.offsetWidth;
    }

    // Add global event listeners
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);

    // Add visual feedback
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private handleResizeMove = (e: MouseEvent): void => {
    if (!this.isResizing || !this.currentResizingEditor) return;

    const deltaX = e.clientX - this.startX;
    const newWidth = Math.max(MIN_EDITOR_WIDTH, this.startWidth + deltaX);

    const wrapper = this.editorElements.get(this.currentResizingEditor);
    if (wrapper) {
      wrapper.style.width = `${newWidth}px`;
      this.editorWidths.set(this.currentResizingEditor, newWidth);

      // Trigger layout update for Monaco editor
      const editorItem = wrapper.querySelector('.editor-item');
      if (editorItem) {
        const monacoContainer = editorItem.querySelector('.monaco-container');
        if (monacoContainer) {
          const editorWidget = monacoContainer.querySelector('.monaco-editor');
          if (editorWidget) {
            // Monaco will auto-layout due to automaticLayout: true
          }
        }
      }
    }
  };

  private handleResizeEnd = (): void => {
    if (!this.isResizing) return;

    this.isResizing = false;
    this.currentResizingEditor = null;
    this.currentResizeHandle = null;

    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);

    // Reset cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  private moveEditorToPosition(element: HTMLElement, newIndex: number): void {
    const children = Array.from(this.editorsWrapper.children);

    // Find position based on editor wrappers only
    let editorIndex = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (!child.classList.contains('resize-handle')) {
        if (editorIndex === newIndex) {
          if (children[i] !== element) {
            this.editorsWrapper.insertBefore(element, children[i]);
          }
          return;
        }
        editorIndex++;
      }
    }

    // If we didn't find it in the loop, append at the end
    this.editorsWrapper.appendChild(element);
  }

  private removeEditorElement(id: string): void {
    const element = this.editorElements.get(id);
    if (element) {
      // Dispose Monaco instance if exists
      const editorItem = element.querySelector('.editor-item');
      if (editorItem) {
        const monacoContainer = editorItem.querySelector('.monaco-container');
        if (monacoContainer) {
          const editorId = monacoContainer.getAttribute('data-editor-id');
          if (editorId && this.monaco) {
            // Monaco instance will be tracked by state manager
          }
        }
      }

      // Remove resize handle
      this.resizeHandles.delete(id);
      this.editorWidths.delete(id);

      element.remove();
      this.editorElements.delete(id);
    }
  }

  createMonacoEditor(id: string, content: string, language: string = 'plaintext', theme: string = 'vs-dark'): any {
    const element = this.editorElements.get(id);
    if (!element || !this.monaco) return null;

    const editorItem = element.querySelector('.editor-item');
    if (!editorItem) return null;

    const monacoContainer = editorItem.querySelector('.monaco-container') as HTMLElement;
    if (!monacoContainer) return null;

    // Check if already has an editor
    if (monacoContainer.hasChildNodes()) {
      // Return existing instance (or get from state manager)
      return null;
    }

    // Create Monaco editor with plain text (no syntax highlighting)
    const editor = this.monaco.editor.create(monacoContainer, {
      value: content,
      language: 'plaintext',
      theme: theme,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      wordWrap: 'on',
      tabSize: 2,
    });

    // Store editor ID for tracking
    monacoContainer.setAttribute('data-editor-id', id);

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      const newContent = editor.getValue();
      this.onContentChange(id, newContent);
    });

    return editor;
  }

  updateMonacoEditor(id: string, editorInstance: any, content: string): void {
    if (!editorInstance) return;

    const currentValue = editorInstance.getValue();
    if (currentValue !== content) {
      editorInstance.setValue(content);
    }
  }

  disposeMonacoEditor(id: string, editorInstance: any): void {
    if (editorInstance) {
      editorInstance.dispose();
    }

    const element = this.editorElements.get(id);
    if (element) {
      const editorItem = element.querySelector('.editor-item');
      if (editorItem) {
        const monacoContainer = editorItem.querySelector('.monaco-container') as HTMLElement;
        if (monacoContainer) {
          monacoContainer.innerHTML = '';
        }
      }
    }
  }

  scrollToEditor(id: string): void {
    const wrapper = this.editorElements.get(id);
    if (wrapper) {
      wrapper.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }

  /**
   * Get the actual editor element (inside wrapper)
   */
  getEditorItemElement(id: string): HTMLElement | null {
    const wrapper = this.editorElements.get(id);
    if (wrapper) {
      return wrapper.querySelector('.editor-item');
    }
    return null;
  }

  /**
   * Wait for Monaco to be loaded
   */
  async waitForMonaco(): Promise<void> {
    await this.loadMonaco();
  }
}
