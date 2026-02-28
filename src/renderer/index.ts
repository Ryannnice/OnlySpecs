import { TabBar } from './components/TabBar';
import { EditorContainer } from './components/EditorContainer';
import { EditorStateManager, EditorState } from './state/EditorStateManager';

class App {
  private stateManager: EditorStateManager;
  private tabBar: TabBar;
  private editorContainer: EditorContainer;
  private unsubscribe: () => void;

  constructor() {
    this.stateManager = new EditorStateManager();

    // Initialize UI components
    const tabBarContainer = document.getElementById('tab-bar')!;
    const editorContainerElement = document.getElementById('editor-container')!;

    this.tabBar = new TabBar(tabBarContainer, {
      onNewTab: () => this.handleNewTab(),
      onSelectTab: (id) => this.handleSelectTab(id),
      onCloseTab: (id) => this.handleCloseTab(id),
      onReorder: (fromIndex, toIndex) => this.handleReorder(fromIndex, toIndex),
      onRename: (id, name) => this.handleRename(id, name),
    });

    this.editorContainer = new EditorContainer(editorContainerElement, {
      onContentChange: (id, content) => this.handleContentChange(id, content),
    });

    // Subscribe to state changes
    this.unsubscribe = this.stateManager.subscribe((editors) => {
      this.render(editors);
    });

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Auto-save on window close
    window.addEventListener('beforeunload', () => {
      this.stateManager.saveAllEditors();
      this.stateManager.disposeAll();
    });
  }

  private async init(): Promise<void> {
    // Wait for Monaco to load
    await this.waitForMonaco();

    // Initial render
    this.render(this.stateManager.getAllEditors());
  }

  private async waitForMonaco(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof (window as any).monaco !== 'undefined') {
        resolve();
        return;
      }

      // Wait for Monaco to be loaded from CDN (via loader.js in HTML)
      const checkInterval = setInterval(() => {
        if (typeof (window as any).require !== 'undefined') {
          clearInterval(checkInterval);

          // Configure Monaco loader
          (window as any).require.config({
            paths: {
              'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
            }
          });

          // Load Monaco
          (window as any).require(['vs/editor/editor.main'], () => {
            resolve();
          });
        }
      }, 50);
    });
  }

  private render(editors: EditorState[]): void {
    // Update tab bar
    this.tabBar.renderTabs(editors);

    // Update editor container
    this.editorContainer.renderEditors(editors);

    // Manage Monaco instances
    this.manageMonacoInstances(editors);
  }

  private manageMonacoInstances(editors: EditorState[]): void {
    editors.forEach((editor) => {
      const element = this.getEditorElement(editor.id);
      const shouldHaveInstance = this.isEditorVisible(element);

      if (shouldHaveInstance && !editor.monacoInstance) {
        // Create Monaco instance
        const monacoInstance = this.editorContainer.createMonacoEditor(
          editor.id,
          editor.content,
          editor.name
        );

        if (monacoInstance) {
          this.stateManager.setMonacoInstance(editor.id, monacoInstance);
        }
      } else if (!shouldHaveInstance && editor.monacoInstance) {
        // Dispose Monaco instance to free memory
        this.editorContainer.disposeMonacoEditor(editor.id, editor.monacoInstance);
        this.stateManager.setMonacoInstance(editor.id, undefined);
      } else if (shouldHaveInstance && editor.monacoInstance) {
        // Update content if needed
        const currentContent = editor.monacoInstance.getValue();
        if (currentContent !== editor.content) {
          // Content changed externally, update editor
          // Only do this not during user editing
          this.editorContainer.updateMonacoEditor(editor.id, editor.monacoInstance, editor.content);
        }
      }
    });
  }

  private getEditorElement(id: string): HTMLElement | null {
    return document.querySelector(`.editor-item[data-id="${id}"]`);
  }

  private isEditorVisible(element: HTMLElement | null): boolean {
    if (!element) return false;

    const container = document.querySelector('.editor-container') as HTMLElement;
    if (!container) return false;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Consider visible if within 3 editor widths of viewport
    const bufferZone = 2550; // 3 * 850px

    return (
      elementRect.right > containerRect.left - bufferZone &&
      elementRect.left < containerRect.right + bufferZone
    );
  }

  private async handleNewTab(): Promise<void> {
    const editor = await this.stateManager.createEditor();
    // Scroll to the new editor
    setTimeout(() => {
      this.editorContainer.scrollToEditor(editor.id);
    }, 100);
  }

  private handleSelectTab(id: string): void {
    this.editorContainer.scrollToEditor(id);
  }

  private async handleCloseTab(id: string): Promise<void> {
    await this.stateManager.removeEditor(id);
  }

  private handleReorder(fromIndex: number, toIndex: number): void {
    this.stateManager.reorderEditors(fromIndex, toIndex);
  }

  private handleRename(id: string, newName: string): void {
    this.stateManager.renameEditor(id, newName);
  }

  private handleContentChange(id: string, content: string): void {
    this.stateManager.updateEditorContent(id, content);
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + T: New tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        this.handleNewTab();
      }

      // Ctrl/Cmd + W: Close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        // Find focused/active tab and close it
        const activeElement = document.activeElement;
        const editorItem = activeElement?.closest('.editor-item');
        if (editorItem) {
          const id = editorItem.getAttribute('data-id');
          if (id) this.handleCloseTab(id);
        }
      }

      // Ctrl/Cmd + S: Save all
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.stateManager.saveAllEditors();
      }
    });
  }

  destroy(): void {
    this.unsubscribe();
    this.stateManager.disposeAll();
  }
}

// Initialize app when DOM is ready
let app: App;

document.addEventListener('DOMContentLoaded', async () => {
  app = new App();
  await app.init();
});

// Handle hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    if (app) {
      app.destroy();
    }
    app = new App();
    app.init();
  });
}

export { App };
