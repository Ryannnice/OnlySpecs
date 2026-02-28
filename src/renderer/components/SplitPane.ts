export interface SplitPaneOptions {
  minHeight?: number;
  maxHeight?: number;
  initialHeight?: number;
}

export class SplitPane {
  private topElement: HTMLElement;
  private bottomElement: HTMLElement;
  private resizeHandle!: HTMLElement;
  private minHeight: number;
  private maxHeight: number;
  private isResizing: boolean = false;
  private startY: number = 0;
  private startHeight: number = 0;
  private height: number;

  // Save to localStorage
  private readonly STORAGE_KEY = 'split-pane-height';

  constructor(
    topElement: HTMLElement,
    bottomElement: HTMLElement,
    options: SplitPaneOptions = {}
  ) {
    this.topElement = topElement;
    this.bottomElement = bottomElement;
    this.minHeight = options.minHeight ?? 100;
    this.maxHeight = options.maxHeight ?? window.innerHeight - 200;

    // Try to load saved height
    const savedHeight = this.loadHeight();
    this.height = options.initialHeight ?? savedHeight ?? window.innerHeight * 0.7;

    this.createResizeHandle();
    this.applyHeight();
    this.setupEventListeners();
  }

  private createResizeHandle(): void {
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'split-resize-handle';
    this.resizeHandle.innerHTML = '<div class="resize-handle-dots"></div>';

    // Insert between top and bottom elements
    this.topElement.insertAdjacentElement('afterend', this.resizeHandle);
  }

  private setupEventListeners(): void {
    this.resizeHandle.addEventListener('mousedown', this.startResize.bind(this));

    document.addEventListener('mousemove', this.handleResizeMove.bind(this));
    document.addEventListener('mouseup', this.handleResizeEnd.bind(this));

    // Handle window resize
    window.addEventListener('resize', () => {
      this.maxHeight = window.innerHeight - 200;
      this.applyHeight();
    });
  }

  private startResize(e: MouseEvent): void {
    e.preventDefault();
    this.isResizing = true;
    this.startY = e.clientY;
    this.startHeight = this.topElement.offsetHeight;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    this.resizeHandle.classList.add('active');
  }

  private handleResizeMove(e: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaY = e.clientY - this.startY;
    this.height = Math.max(
      this.minHeight,
      Math.min(this.maxHeight, this.startHeight + deltaY)
    );

    this.applyHeight();
    this.saveHeight();
  }

  private handleResizeEnd(): void {
    if (!this.isResizing) return;

    this.isResizing = false;

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    this.resizeHandle.classList.remove('active');
  }

  private applyHeight(): void {
    this.topElement.style.height = `${this.height}px`;
    this.topElement.style.flex = 'none';

    // Bottom element takes remaining space
    this.bottomElement.style.flex = '1';
    this.bottomElement.style.minHeight = '0';
  }

  private saveHeight(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, this.height.toString());
    } catch (e) {
      // Ignore storage errors
    }
  }

  private loadHeight(): number | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch (e) {
      return null;
    }
  }

  public setHeight(height: number): void {
    this.height = Math.max(this.minHeight, Math.min(this.maxHeight, height));
    this.applyHeight();
    this.saveHeight();
  }

  public getHeight(): number {
    return this.height;
  }
}
