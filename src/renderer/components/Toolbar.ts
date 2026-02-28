export class Toolbar {
  private container: HTMLElement;
  private themeToggleBtn: HTMLElement;
  private onToggleTheme: () => void;

  constructor(
    container: HTMLElement,
    options: {
      onToggleTheme: () => void;
    }
  ) {
    this.container = container;
    this.onToggleTheme = options.onToggleTheme;

    this.render();
  }

  private render(): void {
    this.container.className = 'toolbar';
    this.container.innerHTML = '';

    // App title
    const title = document.createElement('div');
    title.className = 'toolbar-title';
    title.textContent = 'OnlySpecs';
    this.container.appendChild(title);

    // Right side controls
    const controls = document.createElement('div');
    controls.className = 'toolbar-controls';

    // Theme toggle button
    this.themeToggleBtn = this.createThemeToggleBtn();
    controls.appendChild(this.themeToggleBtn);

    this.container.appendChild(controls);
  }

  private createThemeToggleBtn(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle-btn';
    btn.title = 'Toggle theme (Ctrl/Cmd + Shift + T)';

    // Sun icon for light mode
    const sunIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;

    // Moon icon for dark mode
    const moonIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;

    btn.innerHTML = moonIcon; // Default to moon (dark mode)
    btn.addEventListener('click', () => {
      this.onToggleTheme();
      this.updateThemeIcon(btn);
    });

    return btn;
  }

  private updateThemeIcon(btn: HTMLElement): void {
    const currentTheme = document.documentElement.getAttribute('data-theme');

    // Moon icon for dark mode, Sun for light mode
    const moonIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;

    const sunIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;

    btn.innerHTML = currentTheme === 'light' ? sunIcon : moonIcon;
  }

  updateThemeButtonIcon(): void {
    this.updateThemeIcon(this.themeToggleBtn);
  }
}
