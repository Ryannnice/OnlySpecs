import { Modal } from './Modal';
import { AppConfig } from '../state/SettingsManager';

export class SettingsModal {
  private modal: Modal | null = null;
  private onConfigChange: (config: Partial<AppConfig>) => Promise<void>;
  private currentConfig: AppConfig;

  constructor(
    onConfigChange: (config: Partial<AppConfig>) => Promise<void>,
    currentConfig: AppConfig
  ) {
    this.onConfigChange = onConfigChange;
    this.currentConfig = currentConfig;
  }

  open(): void {
    if (this.modal) return;

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-primary);">
            API 密钥
          </label>
          <input
            type="text"
            id="settings-api-key"
            placeholder="sk-ant-api03-..."
            value="${this.currentConfig.apiKey || ''}"
            style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 14px; box-sizing: border-box; font-family: 'Monaco', 'Menlo', monospace;"
          />
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
            用于访问 Claude 的 Anthropic API 密钥
          </p>
        </div>

        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-primary);">
            接口地址
          </label>
          <input
            type="text"
            id="settings-base-url"
            placeholder="https://api.anthropic.com"
            value="${this.currentConfig.baseUrl || 'https://api.anthropic.com'}"
            style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 14px; box-sizing: border-box;"
          />
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
            API 接口地址（默认：https://api.anthropic.com）
          </p>
        </div>

        <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 6px; border-left: 3px solid var(--accent-color);">
          <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
            <strong style="color: var(--text-primary);">注意：</strong> 设置保存至 <code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 3px;">~/Documents/OnlySpecs/config.json</code>。您的 API 密钥仅保存在本地，只会发送至配置的接口地址。
          </p>
        </div>
      </div>
    `;

    this.modal = new Modal({
      title: '设置',
      content: content,
      onConfirm: () => this.handleSave(),
      onCancel: () => this.handleClose(),
      confirmText: '保存',
      cancelText: '取消',
      width: '500px',
    });

    this.modal.open();
  }

  private async handleSave(): Promise<void> {
    const apiKeyInput = document.querySelector('#settings-api-key') as HTMLInputElement;
    const baseUrlInput = document.querySelector('#settings-base-url') as HTMLInputElement;

    const newConfig: Partial<AppConfig> = {
      apiKey: apiKeyInput?.value?.trim() || '',
      baseUrl: baseUrlInput?.value?.trim() || 'https://api.anthropic.com',
    };

    await this.onConfigChange(newConfig);
    this.handleClose();
  }

  private handleClose(): void {
    if (this.modal) {
      this.modal.close();
      this.modal = null;
    }
  }

  updateCurrentConfig(config: AppConfig): void {
    this.currentConfig = config;
  }
}
