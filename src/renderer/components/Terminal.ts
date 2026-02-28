import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

export class Terminal {
  private container: HTMLElement;
  private xterm: XTerminal;
  private fitAddon: FitAddon;
  private webLinksAddon: WebLinksAddon;
  private sessionId: string;
  private pid: number | null = null;
  private isDisposed = false;
  private unsubscribeData?: () => void;
  private unsubscribeExit?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.sessionId = `terminal-${Date.now()}-${Math.random()}`;

    this.xterm = new XTerminal({
      allowProposedApi: true,
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"Menlo", "Monaco", "Courier New", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: 1000,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        cursorAccent: '#1e1e1e',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    });

    this.fitAddon = new FitAddon();
    this.webLinksAddon = new WebLinksAddon();

    this.xterm.loadAddon(this.fitAddon);
    this.xterm.loadAddon(this.webLinksAddon);

    this.render();
    this.setupEventListeners();
    this.startTerminal();
  }

  private render(): void {
    this.container.className = 'terminal-container';
    this.container.innerHTML = `
      <div class="terminal-header">
        <span class="terminal-title">Terminal</span>
      </div>
      <div class="terminal-xterm" id="terminal-xterm"></div>
    `;

    const xtermContainer = this.container.querySelector('#terminal-xterm')!;
    this.xterm.open(xtermContainer as HTMLElement);
  }

  private setupEventListeners(): void {
    // Send user input to PTY
    this.xterm.onData((data) => {
      if (window.electronAPI) {
        window.electronAPI.writeTerminal(this.sessionId, data);
      }
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.fit();
    });

    // Handle container resize via ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      this.fit();
    });
    resizeObserver.observe(this.container);
  }

  private async startTerminal(): Promise<void> {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.createTerminal(this.sessionId);
      this.pid = result.pid;

      // Listen for data from PTY
      this.unsubscribeData = window.electronAPI.onTerminalData(this.sessionId, (data) => {
        if (!this.isDisposed) {
          this.xterm.write(data);
        }
      });

      // Listen for PTY exit
      this.unsubscribeExit = window.electronAPI.onTerminalExit(
        this.sessionId,
        (exitCode, signal) => {
          console.log(`Terminal exited with code ${exitCode}, signal ${signal}`);
        }
      );

      // Initial fit
      setTimeout(() => this.fit(), 100);
    } catch (error) {
      console.error('Failed to start terminal:', error);
      this.xterm.write('\r\n\x1b[31mFailed to start terminal. See console for details.\x1b[0m\r\n');
    }
  }

  private fit(): void {
    if (!this.isDisposed) {
      this.fitAddon.fit();

      // Get new dimensions and tell PTY
      const dims = { cols: this.xterm.cols, rows: this.xterm.rows };
      if (window.electronAPI) {
        window.electronAPI.resizeTerminal(this.sessionId, dims.cols, dims.rows);
      }
    }
  }

  focus(): void {
    this.xterm.focus();
  }

  dispose(): void {
    this.isDisposed = true;

    if (this.unsubscribeData) {
      this.unsubscribeData();
    }

    if (this.unsubscribeExit) {
      this.unsubscribeExit();
    }

    if (window.electronAPI) {
      window.electronAPI.killTerminal(this.sessionId);
    }

    this.xterm.dispose();
  }
}
