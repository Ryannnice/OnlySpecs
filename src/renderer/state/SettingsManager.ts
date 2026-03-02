export interface AppConfig {
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_CONFIG: AppConfig = {
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
};

export class SettingsManager {
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private listeners: Set<(config: AppConfig) => void> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    // Config will be loaded asynchronously
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (window.electronAPI && typeof window.electronAPI.loadConfig === 'function') {
        const loaded = await window.electronAPI.loadConfig();
        this.config = { ...DEFAULT_CONFIG, ...loaded };
        console.log('[SettingsManager] Config loaded from file:', this.config);
      } else {
        console.warn('[SettingsManager] electronAPI.loadConfig not available, using defaults');
      }
    } catch (error) {
      console.error('[SettingsManager] Failed to load config:', error);
    }

    this.isInitialized = true;
    this.notifyListeners();
  }

  private async saveConfig(): Promise<void> {
    try {
      if (window.electronAPI && typeof window.electronAPI.saveConfig === 'function') {
        await window.electronAPI.saveConfig(this.config);
        console.log('[SettingsManager] Config saved to file:', this.config);
      } else {
        console.warn('[SettingsManager] electronAPI.saveConfig not available');
      }
    } catch (error) {
      console.error('[SettingsManager] Failed to save config:', error);
    }
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    this.notifyListeners();
  }

  subscribe(callback: (config: AppConfig) => void): () => void {
    this.listeners.add(callback);
    // Immediately call with current config
    callback(this.config);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.config));
  }

  getApiKey(): string {
    return this.config.apiKey;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  async setApiKey(apiKey: string): Promise<void> {
    await this.updateConfig({ apiKey });
  }

  async setBaseUrl(baseUrl: string): Promise<void> {
    await this.updateConfig({ baseUrl });
  }
}
