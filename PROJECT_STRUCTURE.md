# OnlySpecs 项目结构文档

## 项目概述

OnlySpecs 是一个基于 Electron 的多功能代码生成工具，集成了 Claude AI 来根据规格说明自动生成代码。项目经过多次迭代，现在包含以下主要功能模块：

1. **桌面应用** (Electron + Monaco Editor)
2. **Web 界面** (Web Server)
3. **无头 API 服务器** (Headless API)
4. **前端集成界面** (FastAPI + Vue 3)

---

## 目录结构

```
OnlySpecs/
├── src/                          # 源代码目录
│   ├── main/                     # Electron 主进程
│   │   ├── index.ts             # 主进程入口
│   │   ├── ipc-handlers.ts      # IPC 通信处理
│   │   └── claude/              # Claude SDK 集成
│   │       ├── index.ts         # Claude 客户端封装
│   │       ├── sdk.ts           # SDK 核心功能
│   │       └── types.ts         # TypeScript 类型定义
│   │
│   ├── renderer/                 # Electron 渲染进程（前端）
│   │   ├── index.ts             # 渲染进程入口
│   │   ├── components/          # UI 组件
│   │   │   ├── EditorContainer.ts        # 编辑器容器
│   │   │   ├── EditorWithTerminal.ts     # 编辑器+终端组合
│   │   │   ├── FileExplorer.ts           # 文件浏览器
│   │   │   ├── Terminal.ts               # 终端组件
│   │   │   ├── TabBar.ts                 # 标签栏
│   │   │   ├── Toolbar.ts                # 工具栏
│   │   │   ├── Modal.ts                  # 模态框
│   │   │   ├── SettingsModal.ts          # 设置对话框
│   │   │   ├── ResizablePanel.ts         # 可调整大小面板
│   │   │   └── SplitPane.ts              # 分割面板
│   │   └── state/               # 状态管理
│   │       ├── EditorStateManager.ts     # 编辑器状态
│   │       ├── SettingsManager.ts        # 设置管理
│   │       └── ThemeManager.ts           # 主题管理
│   │
│   ├── preload/                  # Electron 预加载脚本
│   │   └── index.ts             # 预加载脚本入口
│   │
│   ├── api-server/               # 无头 API 服务器
│   │   └── index.ts             # API 服务器入口（Express + node-pty）
│   │
│   ├── web-server/               # Web 界面服务器
│   │   ├── index.ts             # Web 服务器入口
│   │   └── shim.js              # 浏览器兼容性垫片
│   │
│   └── prompts/                  # AI 提示词模板
│       ├── summarizeSpecs.ts    # 规格总结提示词 v1
│       └── summarizeSpecs2.ts   # 规格总结提示词 v2
│
├── api-integration/              # FastAPI 前端集成（新增）
│   ├── app.py                   # FastAPI 应用（API 代理 + SSE）
│   ├── requirements.txt         # Python 依赖
│   ├── .env                     # 环境变量配置
│   ├── .env.example             # 环境变量模板
│   ├── start.sh                 # 快速启动脚本
│   ├── static/
│   │   └── index.html          # Vue 3 单页应用
│   └── README.md                # 使用文档
│
├── tests/                        # 测试文件
│   ├── claude-sdk.test.ts       # Claude SDK 测试
│   ├── api-test.ts              # API 服务器测试
│   └── README.md                # 测试文档
│
├── docs/                         # 文档目录
│   ├── specs.md                 # 项目规格说明
│   ├── API.md                   # API 文档
│   ├── API_QUICKSTART.md        # API 快速入门
│   └── PROJECT_STRUCTURE.md     # 本文档
│
├── .claude/                      # Claude Code 配置
│   └── settings.local.json      # 本地设置
│
├── package.json                  # Node.js 项目配置
├── tsconfig.json                 # TypeScript 配置
├── forge.config.mjs              # Electron Forge 配置
├── vite.renderer.mjs             # Vite 渲染进程配置
└── README.md                     # 项目说明

生成的代码存储位置：
~/Documents/OnlySpecs/api-workspaces/
└── {taskId}/
    ├── specs_v0001.md           # 用户输入的规格说明
    └── code_v0001/              # 生成的代码目录
```

---

## 核心模块详解

### 1. Electron 桌面应用

**技术栈：** Electron + TypeScript + Monaco Editor + xterm.js

**主要功能：**
- 多标签页代码编辑器（Monaco Editor）
- 集成终端（xterm.js + node-pty）
- 文件浏览器
- 主题切换（亮色/暗色）
- 设置管理

**关键文件：**
- `src/main/index.ts` - Electron 主进程，窗口管理
- `src/renderer/index.ts` - 渲染进程入口，UI 初始化
- `src/main/claude/sdk.ts` - Claude SDK 集成，AI 代码生成

**启动命令：**
```bash
npm start        # 开发模式
npm run dev      # 同上
npm run package  # 打包应用
```

---

### 2. 无头 API 服务器

**技术栈：** Express + TypeScript + node-pty

**主要功能：**
- 通过 HTTP API 接受代码生成请求
- 使用 node-pty 启动 Claude CLI 进程
- 实时捕获 Claude CLI 输出日志
- 管理多个并发生成任务

**API 端点：**
- `POST /generate` - 创建新的代码生成任务
- `GET /status/:taskId` - 查询任务状态
- `GET /logs/:taskId` - 获取任务日志
- `GET /download/:taskId` - 下载生成的代码
- `GET /tasks` - 列出所有任务
- `DELETE /task/:taskId` - 取消并清理任务
- `GET /health` - 健康检查

**关键文件：**
- `src/api-server/index.ts` - API 服务器实现

**启动命令：**
```bash
npm run api      # 启动 API 服务器（默认端口 3580）
```

**工作流程：**
1. 接收 POST /generate 请求（包含 prompt）
2. 创建工作目录：`~/Documents/OnlySpecs/api-workspaces/{taskId}/`
3. 写入规格文件：`specs_v0001.md`
4. 启动 Claude CLI 进程（通过 node-pty）
5. 自动确认工作目录信任提示
6. 发送生成指令给 Claude CLI
7. 实时捕获输出日志
8. 代码生成到：`code_v0001/` 目录

---

### 3. Web 界面服务器

**技术栈：** Express + Vite + TypeScript

**主要功能：**
- 提供 Web 版本的 OnlySpecs 界面
- 使用 Vite 构建前端资源
- 浏览器中运行（无需安装 Electron）

**关键文件：**
- `src/web-server/index.ts` - Web 服务器实现
- `vite.renderer.mjs` - Vite 构建配置

**启动命令：**
```bash
npm run web      # 构建并启动 Web 服务器
```

---

### 4. FastAPI 前端集成（最新添加）

**技术栈：** FastAPI (Python) + Vue 3 (CDN) + Tailwind CSS

**主要功能：**
- 提供用户友好的 Web 界面
- 作为中间层代理 OnlySpecs API
- SSE (Server-Sent Events) 实时推送日志
- 日志 ANSI 代码清理和格式化
- 任务历史记录管理
- 代码下载功能

**架构：**
```
用户浏览器 (Vue 3)
    ↓ HTTP/SSE
FastAPI 后端 (端口 9000)
    ↓ HTTP
OnlySpecs API (端口 3580)
    ↓ node-pty
Claude CLI
    ↓
生成代码
```

**API 端点（FastAPI 层）：**
- `POST /api/generate` - 创建生成任务（代理到 OnlySpecs API）
- `GET /api/status/{task_id}` - 查询任务状态
- `GET /api/logs/{task_id}` - SSE 流式推送日志
- `GET /api/tasks` - 列出所有任务
- `GET /api/download/{task_id}` - 下载生成的代码
- `GET /` - 前端页面（静态文件）

**关键文件：**
- `api-integration/app.py` - FastAPI 应用
  - CORS 配置
  - API 代理逻辑
  - SSE 日志流实现
  - ANSI 代码清理
- `api-integration/static/index.html` - Vue 3 单页应用
  - 输入界面
  - 实时日志显示
  - 任务状态跟踪
  - 历史任务列表

**启动命令：**
```bash
cd api-integration
./start.sh       # 快速启动（自动安装依赖）

# 或手动启动
pip install -r requirements.txt
python app.py    # 或 uvicorn app:app --host 0.0.0.0 --port 9000
```

**使用流程：**
1. 启动 OnlySpecs API 服务器（端口 3580）
2. 启动 FastAPI 应用（端口 9000）
3. 访问 http://localhost:9000
4. 输入软件需求描述
5. 点击"开始生成"
6. 实时查看日志输出
7. 生成完成后下载代码

**日志处理：**
- 后端：使用正则表达式清理 ANSI 转义码
- 前端：HTML 转义防止 XSS
- 前端：高亮时间戳、成功、错误、警告信息
- 前端：自动滚动到最新日志

---

## 技术栈总览

### 后端技术
- **Node.js + TypeScript** - 主要开发语言
- **Electron** - 桌面应用框架
- **Express** - Web 服务器框架
- **node-pty** - 伪终端，用于启动 Claude CLI
- **FastAPI (Python)** - API 代理和 SSE 服务器
- **@anthropic-ai/claude-agent-sdk** - Claude AI SDK

### 前端技术
- **Monaco Editor** - 代码编辑器（VS Code 同款）
- **xterm.js** - 终端模拟器
- **Vue 3 (CDN)** - 前端框架（FastAPI 集成）
- **Tailwind CSS (CDN)** - CSS 框架
- **Axios** - HTTP 客户端
- **Vite** - 前端构建工具

### 开发工具
- **TypeScript** - 类型安全
- **Electron Forge** - Electron 应用打包
- **tsx** - TypeScript 执行器
- **ESLint** - 代码检查

---

## 数据流

### 桌面应用数据流
```
用户输入 → Renderer Process → IPC → Main Process → Claude SDK → Claude API → 生成代码
```

### API 服务器数据流
```
HTTP 请求 → Express → 创建任务 → node-pty → Claude CLI → 捕获输出 → 存储日志 → HTTP 响应
```

### FastAPI 集成数据流
```
浏览器 → Vue 3 → Axios → FastAPI → httpx → OnlySpecs API → node-pty → Claude CLI
                                                                              ↓
浏览器 ← SSE ← FastAPI ← 轮询日志 ← OnlySpecs API ← 实时捕获 ← Claude CLI 输出
```

---

## 配置文件

### package.json
- 项目元数据
- npm 脚本命令
- 依赖管理

### tsconfig.json
- TypeScript 编译选项
- 模块解析配置

### forge.config.mjs
- Electron Forge 打包配置
- 支持的平台和格式

### vite.renderer.mjs
- Vite 构建配置
- 渲染进程资源打包

### api-integration/.env
- FastAPI 环境变量
- OnlySpecs API URL
- 服务器端口配置

---

## 开发工作流

### 1. 开发桌面应用
```bash
npm install          # 安装依赖
npm run dev          # 启动开发模式
npm run lint         # 代码检查
npm run package      # 打包应用
```

### 2. 开发 API 服务器
```bash
npm run api          # 启动 API 服务器
npm run test:api     # 测试 API
```

### 3. 开发 Web 界面
```bash
npm run build:renderer  # 构建前端
npm run web            # 启动 Web 服务器
```

### 4. 开发 FastAPI 集成
```bash
cd api-integration
pip install -r requirements.txt
python app.py        # 启动 FastAPI 服务器

# 在另一个终端
cd ~/OnlySpecs
npm run api          # 启动 OnlySpecs API
```

---

## 测试

### Claude SDK 测试
```bash
npm test             # 运行 SDK 测试
npm run test:mock    # 使用 mock 数据测试
```

### API 测试
```bash
npm run test:api         # 测试 API 端点
npm run test:api:wait    # 测试并等待完成
```

---

## 部署

### 桌面应用
```bash
npm run make         # 创建安装包（.deb, .rpm, .zip 等）
```

### API 服务器
```bash
# 使用 PM2 或 systemd 部署
pm2 start "npm run api" --name onlyspecs-api
```

### FastAPI 集成
```bash
# 使用 systemd 或 Docker 部署
uvicorn app:app --host 0.0.0.0 --port 9000 --workers 4
```

---

## 常见问题

### 1. Claude CLI 权限提示
**问题：** API 服务器启动 Claude CLI 时卡在权限确认提示

**解决：** 已在 `src/api-server/index.ts` 中添加自动确认逻辑：
```typescript
setTimeout(() => {
  ptyProcess.write('1\r');  // 自动发送 "1" 确认信任
}, 2000);
```

### 2. 日志乱码
**问题：** Web 界面显示 ANSI 转义码

**解决：**
- 后端：`app.py` 中使用正则清理 ANSI 代码
- 前端：`index.html` 中格式化和高亮日志

### 3. 端口冲突
**问题：** 端口已被占用

**解决：**
- API 服务器：修改 `ONLYSPECS_API_PORT` 环境变量
- FastAPI：修改 `api-integration/.env` 中的 `PORT`

---

完整的低代码平台功能方案。

  📋 计划总结

  核心功能： 在 Web 界面添加 4 种输出类型选择：

  1. 📄 源代码 - 可编辑的源文件
  2. 🌐 Web 应用 - 单文件 HTML，浏览器直接运行
  3. 💻 桌面程序 - Windows .exe 可执行文件（自动打包）
  4. 📱 手机应用 - PWA 渐进式 Web 应用

  实现方案：
  - 前端：精美的卡片选择器（4 个大卡片）
  - 后端：根据选择自动增强 prompt
  - 打包：使用 Docker + PyInstaller 自动生成 .exe

  关键技术：
  - Prompt 增强：自动添加输出格式指令
  - Docker 打包：cdrx/pyinstaller-windows 镜像
  - 无缝体验：用户只需选择类型，系统自动处理

  完整计划已保存在：/home/ryan/.claude/plans/spicy-inventing-swan.md


  

## 未来规划

1. **任务队列** - 限制并发任务数量
2. **用户认证** - 添加用户登录和权限管理
3. **代码预览** - 在 Web 界面直接预览生成的代码
4. **OSS 集成** - 自动上传生成的代码到云存储
5. **WebSocket** - 替代 SSE 实现双向通信
6. **Docker 化** - 提供 Docker 镜像简化部署
7. **日志分页** - 处理大量日志的性能优化

---

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

---

## 许可证

MIT License

---

**最后更新：** 2026-03-22
**版本：** 1.0.0
