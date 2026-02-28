import { EditorState } from '../state/EditorStateManager';

// Configuration for virtual scrolling
const VISIBLE_POOL_SIZE = 10; // Number of Monaco instances to keep active
const EDITOR_WIDTH = 850; // 100 characters at ~8.5px per char

export class EditorContainer {
  private container: HTMLElement;
  private editorsWrapper: HTMLElement;
  private onContentChange: (id: string, content: string) => void;
  private editorElements: Map<string, HTMLElement> = new Map();
  private monaco: any;
  private isMonacoLoaded = false;

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

    // Setup scroll listener for lazy loading
    this.editorsWrapper.addEventListener('scroll', () => {
      this.handleScroll();
    });
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
        this.createEditorElement(editor, index);
      } else {
        // Update position if needed (for reordering)
        const element = this.editorElements.get(editor.id);
        if (element && element.parentElement) {
          const currentIndex = Array.from(this.editorsWrapper.children).indexOf(element);
          if (currentIndex !== index) {
            // Move to correct position
            const children = Array.from(this.editorsWrapper.children);
            if (children[index + 1]) {
              this.editorsWrapper.insertBefore(element, children[index + 1]);
            } else {
              this.editorsWrapper.appendChild(element);
            }
          }
        }
      }
    });

    // Initialize visible editors
    this.initializeVisibleEditors();
  }

  private createEditorElement(editor: EditorState, index: number): void {
    const editorItem = document.createElement('div');
    editorItem.className = 'editor-item';
    editorItem.dataset.id = editor.id;
    editorItem.style.width = `${EDITOR_WIDTH}px`;

    // Monaco editor container
    const monacoContainer = document.createElement('div');
    monacoContainer.className = 'monaco-container';
    editorItem.appendChild(monacoContainer);

    // Insert at correct position
    const children = Array.from(this.editorsWrapper.children);
    if (children[index]) {
      this.editorsWrapper.insertBefore(editorItem, children[index]);
    } else {
      this.editorsWrapper.appendChild(editorItem);
    }

    this.editorElements.set(editor.id, editorItem);
  }

  private removeEditorElement(id: string): void {
    const element = this.editorElements.get(id);
    if (element) {
      // Dispose Monaco instance if exists
      const monacoContainer = element.querySelector('.monaco-container');
      if (monacoContainer) {
        const editorId = monacoContainer.getAttribute('data-editor-id');
        if (editorId && this.monaco) {
          // Monaco instance will be tracked by state manager
        }
      }
      element.remove();
      this.editorElements.delete(id);
    }
  }

  private async initializeVisibleEditors(): Promise<void> {
    if (!this.isMonacoLoaded) {
      await this.loadMonaco();
    }

    const visibleRange = this.getVisibleRange();
    const editors = Array.from(this.editorsWrapper.children);

    editors.forEach((element, index) => {
      const id = element.getAttribute('data-id');
      if (!id) return;

      const monacoContainer = element.querySelector('.monaco-container') as HTMLElement;
      if (!monacoContainer) return;

      const hasEditor = monacoContainer.hasChildNodes();

      // Create or dispose based on visibility
      if (this.shouldHaveEditor(index, visibleRange)) {
        if (!hasEditor && this.monaco) {
          // This will be handled by the state manager
          // which has the actual editor content
        }
      } else {
        // Dispose editor if outside visible range
        if (hasEditor) {
          monacoContainer.innerHTML = '';
        }
      }
    });
  }

  private getVisibleRange(): { start: number; end: number } {
    const scrollLeft = this.editorsWrapper.scrollLeft;
    const containerWidth = this.editorsWrapper.clientWidth;

    const start = Math.floor(scrollLeft / EDITOR_WIDTH);
    const end = Math.ceil((scrollLeft + containerWidth) / EDITOR_WIDTH);

    return { start: Math.max(0, start - VISIBLE_POOL_SIZE), end: end + VISIBLE_POOL_SIZE };
  }

  private shouldHaveEditor(index: number, visibleRange: { start: number; end: number }): boolean {
    return index >= visibleRange.start && index <= visibleRange.end;
  }

  private handleScroll(): void {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      this.initializeVisibleEditors();
    });
  }

  createMonacoEditor(id: string, content: string, language: string = 'typescript'): any {
    const element = this.editorElements.get(id);
    if (!element || !this.monaco) return null;

    const monacoContainer = element.querySelector('.monaco-container') as HTMLElement;
    if (!monacoContainer) return null;

    // Check if already has an editor
    if (monacoContainer.hasChildNodes()) {
      // Return existing instance (or get from state manager)
      return null;
    }

    // Create Monaco editor
    const editor = this.monaco.editor.create(monacoContainer, {
      value: content,
      language: this.detectLanguage(language),
      theme: 'vs-dark',
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
      const monacoContainer = element.querySelector('.monaco-container') as HTMLElement;
      if (monacoContainer) {
        monacoContainer.innerHTML = '';
      }
    }
  }

  scrollToEditor(id: string): void {
    const element = this.editorElements.get(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'plaintext',
    };

    return languageMap[ext || ''] || 'typescript';
  }
}
