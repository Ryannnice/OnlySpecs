export class ThemeManager {
  private currentTheme: 'light' | 'dark' = 'dark';
  private listeners: Set<(theme: 'light' | 'dark') => void> = new Set();

  constructor() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.currentTheme = 'light';
      }
    }
    this.applyTheme();
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveTheme();
    this.notifyListeners();
  }

  setTheme(theme: 'light' | 'dark'): void {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      this.applyTheme();
      this.saveTheme();
      this.notifyListeners();
    }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  private saveTheme(): void {
    localStorage.setItem('theme', this.currentTheme);
  }

  subscribe(listener: (theme: 'light' | 'dark') => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  /**
   * Get Monaco theme name based on current theme
   */
  getMonacoTheme(): string {
    return this.currentTheme === 'light' ? 'vs-light' : 'vs-dark';
  }
}
