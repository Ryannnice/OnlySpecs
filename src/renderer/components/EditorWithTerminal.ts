import { Terminal } from './Terminal';
import { ThemeManager } from '../state/ThemeManager';
import { marked } from 'marked';

export interface EditorWithTerminalOptions {
  onContentChange: (id: string, content: string) => void;
  onCompareToggle: (id: string) => void;
  onPreviewToggle: (id: string) => void;
  themeManager: ThemeManager;
  isCompareDisabled: boolean;
  isCompareSelected: boolean;
  isPreviewSelected: boolean;
}

export class EditorWithTerminal {
  private container: HTMLElement;
  private editorElement!: HTMLElement;
  private previewElement!: HTMLElement;
  private previewResizeHandle!: HTMLElement;
  private terminalContainer!: HTMLElement;
  private terminal: Terminal | null = null;
  private terminalToggle!: HTMLElement;
  private compareCheckbox!: HTMLInputElement;
  private compareLabel!: HTMLElement;
  private previewCheckbox!: HTMLInputElement;
  private previewLabel!: HTMLElement;
  private isTerminalExpanded: boolean = false;
  private isPreviewMode: boolean = false;
  private onContentChange: (id: string, content: string) => void;
  private onCompareToggle: (id: string) => void;
  private onPreviewToggle: (id: string) => void;
  private themeManager: ThemeManager;
  private monacoInstance: any = null;
  private diffEditorInstance: any = null;
  private originalEditorInstance: any = null;
  private editorId: string = '';

  // Store terminal state
  private static terminalStates = new Map<string, boolean>();

  // Store preview width state (percentage)
  private static previewWidths = new Map<string, number>();
  private previewWidth: number = 50; // Default 50%

  // Resize state
  private isResizing: boolean = false;
  private resizeStartX: number = 0;
  private resizeStartWidth: number = 0;

  constructor(
    id: string,
    name: string,
    container: HTMLElement,
    options: EditorWithTerminalOptions
  ) {
    this.container = container;
    this.onContentChange = options.onContentChange;
    this.onCompareToggle = options.onCompareToggle;
    this.onPreviewToggle = options.onPreviewToggle;
    this.themeManager = options.themeManager;
    this.editorId = id;

    // Restore terminal state for this editor
    this.isTerminalExpanded = EditorWithTerminal.terminalStates.get(id) || false;
    this.isPreviewMode = options.isPreviewSelected || false;

    // Restore preview width state
    this.previewWidth = EditorWithTerminal.previewWidths.get(id) || 50;

    this.render(id, name, options.isCompareDisabled, options.isCompareSelected, options.isPreviewSelected);
    this.setupTerminalToggle(id);
    this.setupCompareCheckbox(id);
    this.setupPreviewCheckbox(id);
    this.setupPreviewResize();
  }

  private render(id: string, name: string, isCompareDisabled: boolean, isCompareSelected: boolean, isPreviewSelected: boolean): void {
    this.container.className = 'editor-with-terminal';
    this.container.innerHTML = '';

    // Compare and Preview checkbox section (at the top)
    const checkboxesSection = document.createElement('div');
    checkboxesSection.className = 'checkboxes-section';

    // Compare checkbox
    this.compareCheckbox = document.createElement('input');
    this.compareCheckbox.type = 'checkbox';
    this.compareCheckbox.className = 'compare-checkbox';
    this.compareCheckbox.id = `compare-${id}`;
    this.compareCheckbox.checked = isCompareSelected;
    // Disable based on both the isCompareDisabled parameter and preview state
    this.compareCheckbox.disabled = isCompareDisabled || isPreviewSelected;

    this.compareLabel = document.createElement('label');
    this.compareLabel.className = 'compare-checkbox-label';
    (this.compareLabel as HTMLLabelElement).htmlFor = `compare-${id}`;
    this.compareLabel.textContent = 'Compare';

    // Preview checkbox
    this.previewCheckbox = document.createElement('input');
    this.previewCheckbox.type = 'checkbox';
    this.previewCheckbox.className = 'preview-checkbox';
    this.previewCheckbox.id = `preview-${id}`;
    this.previewCheckbox.checked = isPreviewSelected;

    this.previewLabel = document.createElement('label');
    this.previewLabel.className = 'preview-checkbox-label';
    (this.previewLabel as HTMLLabelElement).htmlFor = `preview-${id}`;
    this.previewLabel.textContent = 'Preview';

    checkboxesSection.appendChild(this.compareCheckbox);
    checkboxesSection.appendChild(this.compareLabel);
    checkboxesSection.appendChild(this.previewCheckbox);
    checkboxesSection.appendChild(this.previewLabel);

    // Create a wrapper for editor and preview to be side by side
    const editorPreviewWrapper = document.createElement('div');
    editorPreviewWrapper.className = 'editor-preview-wrapper';

    // Preview section (hidden by default) - LEFT SIDE
    this.previewElement = document.createElement('div');
    this.previewElement.className = 'preview-section';
    this.previewElement.dataset.id = id;
    this.previewElement.style.display = isPreviewSelected ? 'block' : 'none';
    this.previewElement.style.flex = isPreviewSelected ? `0 0 ${this.previewWidth}%` : '0 0 0%';

    // Preview resize handle
    this.previewResizeHandle = document.createElement('div');
    this.previewResizeHandle.className = 'preview-resize-handle';
    this.previewResizeHandle.style.display = isPreviewSelected ? 'block' : 'none';

    // Editor section - RIGHT SIDE
    this.editorElement = document.createElement('div');
    this.editorElement.className = 'editor-section';
    this.editorElement.dataset.id = id;
    // Editor takes full width when preview is not active
    this.editorElement.style.flex = isPreviewSelected ? `0 0 ${100 - this.previewWidth}%` : '1 1 auto';

    const monacoContainer = document.createElement('div');
    monacoContainer.className = 'monaco-container';
    monacoContainer.dataset.editorId = id;
    this.editorElement.appendChild(monacoContainer);

    // Add preview, resize handle, and editor to the wrapper (preview on left, editor on right)
    editorPreviewWrapper.appendChild(this.previewElement);
    editorPreviewWrapper.appendChild(this.previewResizeHandle);
    editorPreviewWrapper.appendChild(this.editorElement);

    // Terminal toggle button section
    const toggleSection = document.createElement('div');
    toggleSection.className = 'terminal-toggle-section';

    this.terminalToggle = document.createElement('button');
    this.terminalToggle.className = 'terminal-toggle-btn';
    this.terminalToggle.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 8L1 3h10L6 8z"/>
      </svg>
      <span>Terminal</span>
    `;
    this.terminalToggle.title = this.isTerminalExpanded ? 'Hide Terminal' : 'Show Terminal';

    toggleSection.appendChild(this.terminalToggle);

    // Terminal section (initially hidden)
    this.terminalContainer = document.createElement('div');
    this.terminalContainer.className = 'terminal-section';
    this.terminalContainer.style.display = this.isTerminalExpanded ? 'flex' : 'none';

    // Assemble
    this.container.appendChild(checkboxesSection);
    this.container.appendChild(editorPreviewWrapper);
    this.container.appendChild(toggleSection);
    this.container.appendChild(this.terminalContainer);
  }

  private setupTerminalToggle(id: string): void {
    this.terminalToggle.addEventListener('click', () => {
      this.toggleTerminal(id);
    });
  }

  private setupCompareCheckbox(id: string): void {
    this.compareCheckbox.addEventListener('change', () => {
      this.onCompareToggle(id);
    });
  }

  private setupPreviewCheckbox(id: string): void {
    this.previewCheckbox.addEventListener('change', async () => {
      const isChecked = this.previewCheckbox.checked;

      // Update local state first
      this.isPreviewMode = isChecked;

      // Show/hide preview panel (keep editor visible)
      if (isChecked) {
        this.previewElement.style.display = 'block';
        this.previewResizeHandle.style.display = 'block';
        // Apply the stored width
        this.updatePreviewWidth();
        // Render markdown content
        this.updatePreviewContent();
      } else {
        this.previewElement.style.display = 'none';
        this.previewResizeHandle.style.display = 'none';
        // Editor takes full width when preview is hidden
        this.editorElement.style.flex = '1 1 auto';
      }

      // Then trigger preview toggle callback to update parent state
      // By this point, this.isPreviewMode is already updated, so updatePreviewState
      // won't change the checkbox state
      this.onPreviewToggle(id);
    });
  }

  private setupPreviewResize(): void {
    this.previewResizeHandle.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      this.resizeStartX = e.clientX;
      this.resizeStartWidth = this.previewWidth;

      document.addEventListener('mousemove', this.handleResizeMove);
      document.addEventListener('mouseup', this.handleResizeEnd);

      e.preventDefault();
      e.stopPropagation();
    });
  }

  private handleResizeMove = (e: MouseEvent): void => {
    if (!this.isResizing) return;

    const wrapper = this.previewResizeHandle.parentElement;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const deltaX = e.clientX - this.resizeStartX;
    const deltaPercent = (deltaX / wrapperRect.width) * 100;

    let newWidth = this.resizeStartWidth + deltaPercent;

    // Constrain width between 10% and 90%
    newWidth = Math.max(10, Math.min(90, newWidth));

    this.previewWidth = newWidth;
    EditorWithTerminal.previewWidths.set(this.editorId, this.previewWidth);

    this.updatePreviewWidth();
  };

  private handleResizeEnd = (): void => {
    if (!this.isResizing) return;

    this.isResizing = false;
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);
  };

  private updatePreviewWidth(): void {
    this.previewElement.style.flex = `0 0 ${this.previewWidth}%`;
    this.editorElement.style.flex = `0 0 ${100 - this.previewWidth}%`;
  }

  /**
   * Update the preview content with current editor content rendered as markdown
   */
  updatePreviewContent(): void {
    if (!this.isPreviewMode) return;

    // Get current content from Monaco editor
    const content = this.getCurrentEditorContent();

    // Render markdown
    const htmlContent = marked.parse(content);

    // Update preview element
    this.previewElement.innerHTML = htmlContent as string;
  }

  /**
   * Get the current content from the Monaco editor
   */
  private getCurrentEditorContent(): string {
    // Try to get content from Monaco instance
    if (this.monacoInstance) {
      try {
        // Check if it's a diff editor or normal editor
        if (this.monacoInstance.getEditor) {
          // It's a diff editor, get modified content
          const modifiedEditor = this.monacoInstance.getModifiedEditor();
          if (modifiedEditor) {
            return modifiedEditor.getValue();
          }
        } else {
          // It's a normal editor
          return this.monacoInstance.getValue();
        }
      } catch (e) {
        console.warn('[Preview] Failed to get content from Monaco:', e);
      }
    }

    return '';
  }

  private toggleTerminal(id: string): void {
    this.isTerminalExpanded = !this.isTerminalExpanded;
    EditorWithTerminal.terminalStates.set(id, this.isTerminalExpanded);

    // Update button
    this.terminalToggle.title = this.isTerminalExpanded ? 'Hide Terminal' : 'Show Terminal';
    this.terminalToggle.classList.toggle('active', this.isTerminalExpanded);

    // Update icon rotation
    const icon = this.terminalToggle.querySelector('svg');
    if (icon) {
      icon.style.transform = this.isTerminalExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    // Show/hide terminal
    if (this.isTerminalExpanded) {
      this.terminalContainer.style.display = 'flex';
      if (!this.terminal) {
        this.terminal = new Terminal(this.terminalContainer, this.themeManager.getCurrentTheme());
        // Trigger a fit after a short delay
        setTimeout(() => {
          if (this.terminal) {
            (this.terminal as any).fit();
          }
        }, 100);
      }
    } else {
      this.terminalContainer.style.display = 'none';
    }

    // Trigger resize event for Monaco to adjust
    window.dispatchEvent(new Event('resize'));
  }

  updateCompareState(isDisabled: boolean, isSelected: boolean): void {
    // The isDisabled parameter already accounts for preview mode (calculated in EditorContainer)
    // so we don't need to check this.isPreviewMode here
    this.compareCheckbox.disabled = isDisabled;
    this.compareCheckbox.checked = isSelected;
  }

  updatePreviewState(isSelected: boolean): void {
    // Only update if the state is different to avoid overwriting user input
    if (this.previewCheckbox.checked !== isSelected) {
      this.previewCheckbox.checked = isSelected;
    }

    // Always update isPreviewMode to stay in sync
    const wasPreviewMode = this.isPreviewMode;
    this.isPreviewMode = isSelected;

    // Only update visibility if the mode actually changed
    if (wasPreviewMode !== isSelected) {
      if (isSelected) {
        this.previewElement.style.display = 'block';
        this.previewResizeHandle.style.display = 'block';
        this.updatePreviewWidth();
        this.updatePreviewContent();
      } else {
        this.previewElement.style.display = 'none';
        this.previewResizeHandle.style.display = 'none';
        this.editorElement.style.flex = '1 1 auto';
      }
    }
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  getMonacoContainer(): HTMLElement {
    return this.editorElement.querySelector('.monaco-container') as HTMLElement;
  }

  getPreviewContainer(): HTMLElement {
    return this.previewElement;
  }

  setMonacoInstance(instance: any): void {
    this.monacoInstance = instance;
  }

  getMonacoInstance(): any {
    return this.monacoInstance;
  }

  setDiffEditorInstance(instance: any): void {
    this.diffEditorInstance = instance;
  }

  getDiffEditorInstance(): any {
    return this.diffEditorInstance;
  }

  setOriginalEditorInstance(instance: any): void {
    this.originalEditorInstance = instance;
  }

  getOriginalEditorInstance(): any {
    return this.originalEditorInstance;
  }

  getEditorId(): string {
    return this.editorId;
  }

  setTheme(theme: 'light' | 'dark'): void {
    // Update terminal theme
    if (this.terminal) {
      this.terminal.setTheme(theme);
    }

    // Update Monaco editor theme
    if (this.monacoInstance) {
      this.monacoInstance.updateOptions({
        theme: theme === 'dark' ? 'vs-dark' : 'vs'
      });
    }

    // Update diff editor theme
    if (this.diffEditorInstance) {
      this.diffEditorInstance.updateOptions({
        theme: theme === 'dark' ? 'vs-dark' : 'vs'
      });
    }
  }

  dispose(): void {
    if (this.diffEditorInstance) {
      this.diffEditorInstance.dispose();
      this.diffEditorInstance = null;
    }
    if (this.monacoInstance) {
      this.monacoInstance.dispose();
      this.monacoInstance = null;
    }
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
  }

  isTerminalVisible(): boolean {
    return this.isTerminalExpanded;
  }
}
