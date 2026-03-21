```
  src/                                                                                                                                          
  ├── main/          ← Electron 主进程（Node.js 环境）                                                                                          
  ├── preload/       ← 安全桥梁层                                                                                                               
  ├── renderer/      ← 前端 UI（浏览器环境）                                                                                                    
  └── prompts/       ← AI 提示词                                                                                                                
                                                                                                                                                
  ---                                                                                                                                           
  src/main/ — 主进程                                                                                                                            
                    
  ┌─────────────────┬────────────────────────────────────────────────────────────────────────────┐                                              
  │      文件       │                                    作用                                    │                                              
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────┤                                              
  │ index.ts        │ 程序入口。创建 BrowserWindow，注册 IPC 处理器，管理应用生命周期            │                                              
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────┤                                              
  │ ipc-handlers.ts │ 核心。注册所有 IPC 事件处理器：文件读写、终端 PTY、GitHub clone、配置读写  │                                              
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────┤                                              
  │ claude/index.ts │ 导出 Claude SDK 模块的入口                                                 │                                              
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────┤                                              
  │ claude/sdk.ts   │ 封装 @anthropic-ai/claude-agent-sdk，处理 CLI 路径解析（含 ASAR 打包兼容） │                                              
  ├─────────────────┼────────────────────────────────────────────────────────────────────────────┤                                              
  │ claude/types.ts │ Claude 相关的 TypeScript 类型定义（ClaudeConfig, ClaudeQueryOptions 等）   │
  └─────────────────┴────────────────────────────────────────────────────────────────────────────┘                                              
                  
  ---                                                                                                                                           
  src/preload/ — 预加载层（安全桥梁）
                                     
  ┌──────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │   文件   │                                                    作用                                                    │                     
  ├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ index.ts │ 用 contextBridge 把主进程能力安全暴露给渲染层，形成 window.electronAPI。渲染层只能通过这个对象与主进程通信 │                     
  └──────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                
  ---
  src/renderer/ — 渲染进程（UI 层）                                                                                                             
                                                                                                                                                
  入口
                                                                                                                                                
  ┌────────────┬────────────────────────────────────────────────────┐
  │    文件    │                        作用                        │
  ├────────────┼────────────────────────────────────────────────────┤
  │ index.html │ HTML 模板，加载 Monaco CDN、xterm CSS              │
  ├────────────┼────────────────────────────────────────────────────┤
  │ index.ts   │ App 类，组装所有组件、管理应用逻辑、处理键盘快捷键 │                                                                           
  ├────────────┼────────────────────────────────────────────────────┤                                                                           
  │ styles.css │ 全局样式                                           │                                                                           
  └────────────┴────────────────────────────────────────────────────┘                                                                           
                  
  components/ — UI 组件                                                                                                                         
  
  ┌───────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐                                
  │         文件          │                                        作用                                        │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ EditorContainer.ts    │ 管理所有编辑器实例的容器，创建/更新 Monaco 编辑器                                  │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ EditorWithTerminal.ts │ 单个"编辑器+终端"面板，含 Monaco 编辑器、终端、Markdown 预览、Generate/Review 按钮 │                                
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ TabBar.ts             │ 顶部标签栏，支持新建/关闭/重命名/拖拽排序                                          │                                
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ Toolbar.ts            │ 工具栏（主题切换、新建项目、打开项目、Get Specs、设置）                            │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ FileExplorer.ts       │ 左侧文件树面板，展示项目目录结构                                                   │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ Terminal.ts           │ 封装 xterm.js，提供 PTY 终端 UI                                                    │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ Modal.ts              │ 通用弹窗组件                                                                       │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ SettingsModal.ts      │ 设置弹窗（API Key、Base URL）                                                      │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ ResizablePanel.ts     │ 可拖拽调整宽度的面板（用于文件树）                                                 │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                                
  │ SplitPane.ts          │ 上下分割面板（编辑器与终端之间）                                                   │
  └───────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘                                
                  
  state/ — 状态管理                                                                                                                             
                  
  ┌───────────────────────┬───────────────────────────────────────────────────────────────┐                                                     
  │         文件          │                             作用                              │
  ├───────────────────────┼───────────────────────────────────────────────────────────────┤                                                     
  │ EditorStateManager.ts │ 管理所有编辑器的状态（内容、名称、顺序），负责持久化到主进程  │
  ├───────────────────────┼───────────────────────────────────────────────────────────────┤
  │ SettingsManager.ts    │ 管理应用配置（API Key、上次打开的项目路径），读写 config.json │                                                     
  ├───────────────────────┼───────────────────────────────────────────────────────────────┤                                                     
  │ ThemeManager.ts       │ 管理亮/暗主题，通知所有订阅者切换                             │                                                     
  └───────────────────────┴───────────────────────────────────────────────────────────────┘                                                     
                  
  ---                                                                                                                                           
  src/prompts/ — AI 提示词
                                                                                                                                                
  ┌────────────────────┬────────────────────────────────────────────────────────────────────┐
  │        文件        │                                作用                                │
  ├────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ summarizeSpecs.ts  │ 用于 GitHub import 功能：告诉 Claude 如何分析仓库并生成 specs 文档 │
  ├────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ summarizeSpecs2.ts │ 同上的备用/改进版本                                                │                                                   
  └────────────────────┴────────────────────────────────────────────────────────────────────┘                                                   
                                                                                                                                                
  ---                                                                                                                                           
  数据流总结      

  用户操作
    → renderer/components (UI事件)
    → renderer/index.ts (App逻辑)                                                                                                               
    → window.electronAPI (preload桥梁)                                                                                                          
    → main/ipc-handlers.ts (Node.js处理)                                                                                                        
    → 文件系统 / node-pty / GitHub
```


# OnlySpecs

A powerful Electron-based desktop application for managing software specifications and implementations with an integrated Monaco Editor, multi-terminal support, and Claude AI-powered code analysis.

## Overview

OnlySpecs is designed to help developers organize their projects by specification versions and matching implementation versions. It provides a seamless workflow for writing specifications, analyzing codebases, and implementing features with AI assistance.

## Features

### Core Editor
- **Multi-tab Monaco Editor** - Full-featured code editor with syntax highlighting, IntelliSense, and VS Code-like editing experience
- **Tab Management** - Create, rename, delete, and reorder editor tabs with persistent state
- **Auto-save** - Automatic persistence of editor content across sessions

### Integrated Terminal
- **Multi-terminal Support** - Run multiple terminals simultaneously
- **Full PTY Emulation** - Powered by `node-pty` and `xterm.js` for authentic terminal experience
- **Claude CLI Integration** - Automatic detection and configuration for Claude CLI commands
- **Theme Support** - Terminal colors adapt to light/dark themes

### Project Management
- **Version-controlled Specs** - Organize specifications as `specs_v0001.md`, `specs_v0002.md`, etc.
- **Version-controlled Code** - Match implementations in `code_v0001/`, `code_v0002/`, etc.
- **File Explorer** - Browse project directories with expandable tree view
- **Quick Actions** - Create, delete files and folders directly from the UI

### AI-Powered Analysis
- **Claude Agent SDK Integration** - Leverage Claude AI for codebase analysis
- **GitHub Import** - Clone and analyze GitHub repositories
- **Spec Generation** - Automatically generate detailed architectural specifications from codebases
- **Progress Tracking** - Real-time feedback during AI analysis

### User Interface
- **Dark/Light Themes** - Choose your preferred color scheme
- **Resizable Panels** - Customize your workspace layout
- **Settings Modal** - Configure API keys and preferences
- **Responsive Design** - Adapts to different screen sizes

## Architecture

```
OnlySpecs/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts            # Main entry point, window creation
│   │   ├── ipc-handlers.ts     # IPC handlers for renderer communication
│   │   └── claude/             # Claude SDK integration
│   │       ├── index.ts        # Module exports
│   │       ├── sdk.ts          # ClaudeSDK class implementation
│   │       └── types.ts        # TypeScript interfaces
│   ├── preload/                 # Preload script (context bridge)
│   │   └── index.ts            # Exposes electronAPI to renderer
│   ├── renderer/                # Renderer process (UI)
│   │   ├── index.ts            # Main app class
│   │   ├── index.html          # HTML template
│   │   ├── styles.css          # Application styles
│   │   ├── components/         # UI components
│   │   │   ├── EditorContainer.ts
│   │   │   ├── EditorWithTerminal.ts
│   │   │   ├── FileExplorer.ts
│   │   │   ├── Modal.ts
│   │   │   ├── ResizablePanel.ts
│   │   │   ├── SettingsModal.ts
│   │   │   ├── SplitPane.ts
│   │   │   ├── TabBar.ts
│   │   │   ├── Terminal.ts
│   │   │   └── Toolbar.ts
│   │   └── state/              # State management
│   │       ├── EditorStateManager.ts
│   │       ├── SettingsManager.ts
│   │       └── ThemeManager.ts
│   └── prompts/                 # AI prompts
│       ├── summarizeSpecs.ts    # Spec generation prompt
│       └── summarizeSpecs2.ts   # Alternative prompt
├── tests/                       # Test files
├── forge.config.mjs            # Electron Forge configuration
├── vite.main.mjs               # Vite config for main process
├── vite.preload.mjs            # Vite config for preload
├── vite.renderer.mjs           # Vite config for renderer
└── package.json
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Electron 30 |
| Build Tool | Vite 5 |
| Language | TypeScript 5.5 |
| Code Editor | Monaco Editor |
| Terminal | xterm.js + node-pty |
| AI Integration | Claude Agent SDK (@anthropic-ai/claude-agent-sdk) |
| Markdown | marked |
| Packaging | Electron Forge |

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Git (for GitHub import feature)
- Claude CLI (optional, for AI features)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/OnlySpecs.git
cd OnlySpecs

# Install dependencies
npm install

# Rebuild native modules (node-pty)
npm run postinstall
```

## Development

```bash
# Start development server
npm run dev

# Or use the alias
npm start
```

This will launch the Electron app with hot-reload enabled via Vite.

## Building

```bash
# Package the application
npm run package

# Create distributable installers
npm run make

# Publish to distributors
npm run publish
```

## Configuration

### API Configuration

The application stores configuration in `~/Documents/OnlySpecs/config.json`:

```json
{
  "apiKey": "your-anthropic-api-key",
  "baseUrl": "https://api.anthropic.com",
  "lastProjectPath": "/path/to/last/project"
}
```

You can configure these settings through the Settings modal in the application.

### Editor Storage

Editor content is automatically saved to `~/Documents/OnlySpecs/editors/`:
- Individual editor files: `{id}.json`
- Metadata (tab order): `metadata.json`

## IPC API Reference

The preload script exposes the following APIs via `window.electronAPI`:

### Editor Operations
| Method | Description |
|--------|-------------|
| `loadAllEditors()` | Load all saved editors |
| `saveEditor(editor)` | Save a single editor |
| `saveAllEditors(editors)` | Save all editors |
| `renameEditor(id, name)` | Rename an editor |
| `deleteEditor(id)` | Delete an editor |
| `saveOrder(order)` | Save tab order |
| `getNextIndex()` | Get next untitled editor index |
| `incrementNextIndex()` | Increment and get next index |

### Terminal Operations
| Method | Description |
|--------|-------------|
| `createTerminal(sessionId, options)` | Create a new PTY session |
| `writeTerminal(sessionId, data)` | Write data to terminal |
| `runTerminalCommand(sessionId, command)` | Run a command in terminal |
| `resizeTerminal(sessionId, cols, rows)` | Resize terminal |
| `killTerminal(sessionId)` | Kill terminal session |
| `onTerminalData(sessionId, callback)` | Listen for terminal output |
| `onTerminalExit(sessionId, callback)` | Listen for terminal exit |

### File System Operations
| Method | Description |
|--------|-------------|
| `readFile(path)` | Read file content |
| `writeFile(path, content)` | Write file content |
| `readDirectory(path)` | List directory contents |
| `selectDirectory()` | Open directory picker dialog |
| `createDirectory(path)` | Create a new directory |
| `deleteFile(path)` | Delete a file |
| `deleteFolder(path)` | Delete a folder recursively |
| `pathExists(path)` | Check if path exists |

### Configuration Operations
| Method | Description |
|--------|-------------|
| `loadConfig()` | Load application config |
| `saveConfig(config)` | Save application config |
| `createProject()` | Create a new OnlySpecs project |

### GitHub Operations
| Method | Description |
|--------|-------------|
| `importGithubRepo(url, prompt)` | Clone and prepare repo for analysis |
| `onGithubProgress(callback)` | Listen for import progress updates |

## Project Workflow

OnlySpecs follows a specification-driven development workflow:

1. **Create a Project** - Use the "New Project" button to create a new OnlySpecs project
2. **Write Specifications** - Create `specs_v0001.md` with detailed requirements
3. **Analyze Existing Code** - Import a GitHub repo or open a folder to analyze
4. **Generate Specs from Code** - Use Claude AI to auto-generate specifications
5. **Implement** - Create corresponding `code_v0001/` folder with implementation
6. **Iterate** - Create new versions as requirements evolve

### Project Structure Example

```
my-project/
├── README.md
├── LICENSE
├── specs_v0001.md          # Initial specifications
├── specs_v0002.md          # Updated specifications
├── specs_v0003.md          # Latest specifications
├── code_v0001/             # Implementation v1
│   ├── src/
│   └── tests/
├── code_v0002/             # Implementation v2
│   ├── src/
│   └── tests/
└── code_v0003/             # Implementation v3
    ├── src/
    └── tests/
```

## Testing

```bash
# Run tests
npm test

# Run tests with mocking
npm run test:mock
```

## Troubleshooting

### Common Issues

1. **node-pty build fails**
   - Ensure you have build tools installed:
     - macOS: `xcode-select --install`
     - Linux: `sudo apt install build-essential`
     - Windows: Install Visual Studio Build Tools

2. **Terminal not starting**
   - Check if your shell is correctly configured in `$SHELL` environment variable
   - Verify node-pty was rebuilt correctly: `npm run postinstall`

3. **Claude integration not working**
   - Ensure Claude CLI is installed: `claude --version`
   - Configure your API key in Settings
   - Check internet connectivity

4. **Application won't start**
   - Clear the Vite cache: `rm -rf .vite`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor that powers VS Code
- [xterm.js](https://xtermjs.org/) - Terminal emulator for the web
- [node-pty](https://github.com/microsoft/node-pty) - Fork pseudoterminals in Node.js
- [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) - AI-powered code analysis
- [Electron](https://www.electronjs.org/) - Build cross-platform desktop apps
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
