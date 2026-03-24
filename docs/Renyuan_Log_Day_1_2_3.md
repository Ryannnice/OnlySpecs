# **稔远的个人学习要点；仅个人纪录供参考，不含专业知识细节**


# ***2025.3.19***

## 知识学习
### 图解Transformer 
非常清晰的图示教程，用矩阵拆解Transformer，难度梯度很合适
[教程](https://jalammar.github.io/illustrated-transformer/)

### TypeScript/npm包管理

#### TypeScript[(清华大学的AI教育项目)](https://github.com/Ryannnice/CUHK-LLM-Edu/edit/main/README.md)

整个项目绝大部分使用TypeScript,文件结构、调用逻辑非常复杂
TypeScript 是 JavaScript 的超集

#### npm

npm = Node Package Manager（Node.js 包管理器）

安装库和工具/管理依赖（项目里用到的第三方包）/**运行脚本**（比如启动 Vue、React 或 Node 项目）
*npm run <脚本名>: 运行 package.json 里的脚本*

### FastAPI python框架了解
第一次实习，第一次接触偏工程的项目：不同于科研的是，可行性/整体模块的缝合、运行似乎比细致的优化更重要

清华的开源教育项目未采用前后端分离架构

使用.json格式请求体完成数据/信息传递

前端直接通过函数调用REST API:
```
 fastapi_backend/                                           
    └── static/                                              
        ├── index.html        # 主页（需求输入 + 设置）      
        ├── generate.html     # 生成流程页（SSE 大纲流 + 进度）
        ├── classroom.html    # 课堂播放页（幻灯片/测验/聊天）
        ├── app.js            # 全局工具：API 调用、设置存储、路由                                     
        ├── generate.js       # 生成流程逻辑                 
        ├── classroom.js      # 课堂播放逻辑（幻灯片渲染、测验、聊天）                   
        └── style.css         # 全局样式     
```


## 实践

### Fast API
在原本的原本的REST API接口上，建立/fastapi_backend文件夹，用Fast API封装全部18个功能的api
原有.ts文件前端直接调用api的所有逻辑均保留，与Fast后端接口不冲突

实现后端分离之后，建立/fastapi_backend/static文件夹，仅使用js/html初步实现前端功能，以验证Fast API后端接口可行性


# ***2025.3.20***

## 知识学习

### 开源库OnlySpecs
这是自动生成软件的agent系统，可能对项目第二部分*WorkShop*有帮助
（上午团队实现workshop功能时发现直接调用LLM实现代码（软件编程）能力有限：贪吃蛇不成功，推箱子成功）
试图部署该开源项目，接入我们的项目


## 实践

### Linux bash
上午claude api爆了，以为是网络问题重新配置安装一遍windows WSL的linux的网络环境


# ***2025.3.21***

## 知识学习

### 开源库OnlySpecs

#### node-pty

pty.spawn("claude")

相当于**在程序里打开**一个**终端**窗口

#### AIEngine 

一个“可以驱动 Claude CLI 干活”的执行器

```
return new Promise((resolve, reject) => {
    proc.onExit((e) => {
        if (e.exitCode === 0) resolve()
        else reject(new Error(...))
    })
})
```
```
┌─────────────┐
│ run() 调用  │
│ await engine│
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Promise     │   <-- pending 状态
│ resolve/reject 内部管子
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ proc.onExit │  <-- Claude CLI 退出触发
│ e.exitCode  │
└─────┬───────┘
      │
      ▼
if(exitCode==0) resolve()  else reject(error)
      │
      ▼
Promise 状态变更 → 外层 await/then/catch 收到结果
```

#### Shim 

是一种兼容层或适配器，用于在不修改原有代码的情况下，让新旧接口或系统之间能够协同工作

这很适用于最小化更改，让该开源项目快速应用于我们的项目中，以此为起点吧

#### Node.js Web 服务器

Node.js 是一个运行环境，可以用 JavaScript 写服务端程序

"Node.js Web 服务器"就是用 Node.js 写的 HTTP 服务，比如用 Express、Fastify、Koa 等框架搭建的后端，和阿里云服务器不冲突

```
阿里云 ECS（服务器硬件/系统）
    └── Nginx（反向代理，监听 80/443 端口）
          └── Node.js 进程（监听 3000 端口）
                └── 你的业务代码      
```


## 实践

### Web版OnlySpecs功能测试

已完成在web上的部署，使用简单的html转跳

汉化前端菜单栏

### 融入大项目的Workshop部分：

**我们项目Workshop的原架构：**

```
用户 → Vue
        │
        ▼
FastAPI /generate
        │
        ▼
DeepSeek 生成 HTML
        │
        ▼
FastAPI /upload
        │
        ▼
阿里云 OSS
        │
        ▼
返回 URL
        │
        ▼
Vue 展示
```

**开源软件OnlySpecs的原架构：**
```
Electron UI
    ↓
Renderer (DOM + Monaco)
    ↓
IPC
    ↓
Main Process
    ↓
node-pty
    ↓
Claude CLI
```

**新架构融合，两种方案：**

***方案一，分离式：***
```
 大项目
 ├── Vue 仪表盘（前端）   → Docker: Nginx 静态托管，端口 80
 ├── FastAPI 后端         → Docker: Uvicorn，端口 9000
 │   ├── /generate        → DeepSeek 流式生成 HTML
 │   └── /upload          → 阿里云 OSS 上传
 └── OnlySpecs（待加入）  → Docker: Node.js，端口 3579
     └── 功能：Specs 编写、Claude AI 代码生成、终端
```

***方案二，通过Fast API使用功能，仅替换掉LLM，使用claude agent编写软件：***
```
Vue 前端
    ↓ POST /generate-software { prompt }
  FastAPI
    ↓ 调用 OnlySpecs Node.js 服务（HTTP 或子进程）
  OnlySpecs Web Server
    ↓ 写 specs.md → 启动 Claude CLI
  Claude CLI（node-pty）
    ↓ 生成代码
  返回结果（文件路径 / OSS URL）
    ↑ 流式进度推送（SSE / WebSocket）
  Vue 前端展示


FastAPI 端点设计
  # POST /generate-software
  # 输入：用户 prompt
  # 输出：SSE 流式进度 + 最终代码 URL

  @app.post("/generate-software")
  async def generate_software(prompt: str):
      # 1. 调用 OnlySpecs API 创建 specs 文件
      # 2. 触发 Generate from Specs
      # 3. 流式返回进度
      # 4. 完成后上传到 OSS，返回 URL
```

先尝试方案二，先设计无头OnlySpecs的API




# ***2025.3.22***

## 知识学习


## 实践

Fast API 编写完成，核心是/generate 根据用户指令来交给OnlySpecs，利用其功能生成

api测试成功（文档：/home/ryan/OnlySpecs/docs/API_QUICKSTART.md，测试：终端运行 npm run test:api）

接下来对接我们的项目第二部分Workshop：
实现方式参考原框架，写出仿制的前端：/home/ryan/OnlySpecs/api-integration

整个Pipeline:

```
  📁 Project Structure        

  ~/OnlySpecs/api-integration/                   
  ├── app.py              # FastAPI backend (API proxy + SSE streaming)
  ├── requirements.txt    # Python dependencies          
  ├── .env               # Environment configuration         
  ├── .env.example       # Environment template           
  ├── start.sh           # Quick start script                                            
  ├── static/                                                                                             
  │   └── index.html     # Vue 3 frontend (312 lines)
  └── README.md          # Complete documentation                                                                                               
                                                                                                                                                
  🎯 Key Features Implemented

  Backend (FastAPI):                      
  - ✅ CORS-enabled API proxy to OnlySpecs API  
  - ✅ SSE streaming for real-time log updates
  - ✅ Endpoints: /api/generate, /api/status, /api/logs, /api/tasks, /api/download
  - ✅ Error handling and timeout controls                      
                                                                                                                                                
  Frontend (Vue 3 + Tailwind):         
  - ✅ Clean, responsive UI with Chinese localization
  - ✅ Real-time log display with auto-scroll
  - ✅ Task status tracking (pending/running/completed/failed)
  - ✅ History task list with click-to-load        
  - ✅ Download generated code as ZIP                    
  - ✅ EventSource for SSE log streaming           
                                                                                                                                                
  🚀 Quick Start                   

  # 1. Start OnlySpecs API (in one terminal)  
  cd ~/OnlySpecs      
  npm run api            

  # 2. Start frontend (in another terminal)                       
  cd ~/OnlySpecs/api-integration  
  ./start.sh                          
                                                                                                    
  Then visit: http://localhost:9000     

  📝 Usage Flow                            
  1. Enter software requirements in the text area                                                                                               
  2. Click "开始生成" (Start Generation)                  
  3. Watch real-time Claude CLI logs                            
  4. Download code when complete or open in file explorer
  5. View history tasks in the collapsible section                  
                                                                                                                                                
  The implementation follows the plan exactly, using SSE for real-time updates and providing a simple, user-friendly interface for interacting  
  with OnlySpecs.    
```

已经能完美运行，依靠简洁的web界面，通过Fast API和OnlySpecs交互

***输入-->OnlySpecs-->Claude CLI-->输出***，用户只负责敲几个字：项目第二部分低代码的思想

debug修复内容：

1. claude开始但是不工作，代码写不进去项目文件夹 / claude 不动，接收不到指令：--print 标志可以完全跳过交互式 UI，直接输出结果。不需要 pty 模拟，改用子进程即可。用 spawn + --print 替换整个 pty 方案，彻底解决交互式 UI 问题。

2. 下载 ZIP之后win系统打不开：之前是把 OnlySpecs API 返回的 JSON 当 ZIP 存的，当然打不开。现在后端拿到 codePath，用 shutil.make_archive 真正打包成 ZIP，Win11 可以直接解压。

3. “在文件管理器中打开”的按钮点不动：新增了 /api/open/{task_id} 接口，调用 xdg-open 打开 Linux 文件管理器，同时在界面显示代码路径。
WSL2 里 xdg-open 无法直接打开 Windows 文件管理器。需要用 explorer.exe 来打开，但路径要转换成 Windows 格式。
转换出来是 \\wsl.localhost\Ubuntu\... 格式，Win11 的文件资源管理器可以直接打开这个 UNC 路径。
```
\\wsl.localhost\Ubuntu\home\ryan\Documents\OnlySpecs\api-workspaces\task_1774168877875_1u1yudaz6\code_v0001
```

***全部修复***

朝着更更更低代码平台进发：


📋 计划总结

核心功能： 在 Web 界面添加 4 种输出类型选择：

1. 📄 源代码 - 可编辑的源文件
2. 🌐 Web 应用 - 单文件 HTML，浏览器直接运行
3. 💻 桌面程序 - Windows .exe 可执行文件（自动打包）
4. 📱 手机应用 - PWA 渐进式 Web 应用

用户使用Pipeline:

```
用户浏览器
    │
    ▼
Vue 前端
    │
    ▼
FastAPI API
    │
    ▼
OnlySpecs AI Engine （调用Claude CLI）
    │
    ▼
生成代码
    │
    ▼
Build Worker（Docker）
    │
    ▼
编译为 .exe
    │
    ▼
上传到 OSS
    │
    ▼
用户下载
```

本地项目列表已更新：

新功能：
1. 类型标签 - 每个项目左侧显示彩色标签：
  - 📄 源代码（紫色）
  - 🌐 Web应用（靛蓝色）
  - 💻 桌面程序（橙色）
  - 📱 手机应用（粉色）
2. 对应按钮 - 根据项目类型显示不同的主功能按钮：
  - 源代码：📄 线上查看 + 📦 下载源码
  - Web应用：🌐 线上运行 + 📦 下载源码
  - 桌面程序：💻 下载 .exe + 📦 下载源码
  - 手机应用：📱 下载应用 + 📦 下载源码


```
  部署步骤：

  1. 在阿里云服务器上安装依赖：
  安装Node.js
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs

  安装Python
  sudo apt-get install python3 python3-pip

  安装Docker
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER

  安装Claude CLI
  npm install -g @anthropic-ai/claude-code

  2. 配置Claude API密钥：
  export ANTHROPIC_API_KEY="your-api-key-here"
                                              
  3. 打包项目：                              
  cd ~/OnlySpecs                            
  tar -czf onlyspecs-deploy.tar.gz \ 
    src/ \                                  
    api-integration/ \   
    package.json\                          
    tsconfig.json                                                                                                                             
  4. 上传到服务器：                         
  scp onlyspecs-deploy.tar.gz user@your-server:/home/user/      

  5. 在服务器上解压并启动：                 
  tar -xzf onlyspecs-deploy.tar.gz                               
  npm install                               
  docker pull cdrx/pyinstaller-windows        
                                           
  启动服务                                 
  npm run api &                             
  cd api-integration && python3 app.py &                               

  6. 配置防火墙：
  sudo ufw allow 3580                                   
  sudo ufw allow 9000                       

  访问：http://your-server-ip:9000 
```




# ***2025.3.23***

## 知识学习

### Docker

```
https://www.bilibili.com/video/BV1THKyzBER6/?share_source=copy_web&vd_source=035cd776909e96dadfc9bbaeb1588cd4
```

### Fast API

Fast API配合**后端开发**：
```
https://www.bilibili.com/video/BV1eUxve7Ein/?share_source=copy_web&vd_source=035cd776909e96dadfc9bbaeb1588cd4
```
```
https://fastapi.org.cn/python-types/#pydantic-models
```

###

上下文工程 Context Engineering

### 谕书的Workshop框架和API：

项目框架采用FC容器(每个项目一个)，而不是fs操作本地文件
```
OSS+FC的架构：
┌─────────────────────────────────────────────────────┐
│                    用户浏览器                         │
│  左：对话+文件树    中：代码查看    右：预览iframe      │
└──────────┬──────────────────────────────┬───────────┘
           │              │ iframe src
           ▼                             ▼
┌─────────────────┐            ┌──────────────────────┐
│  你的FastAPI服务 │            │  FC容器(每个项目一个) │
│  (项目管理/调度) │            │   dev server:9000    │
└────────┬────────┘            └──────────┬───────────┘
         │                                │
    ┌────┴──────────────────────────┐     │
    │         阿里云基础设施         │     │
    │  OSS(代码+静态)  RDS(MySQL)    |◄───┘
    │  ACR(镜像仓库)   MNS(消息队列) │
    └───────────────────────────────┘
```
这个线上部署运行架构值得融合，今天做这件事：

## 实践


```
OnlySpecs 的现有架构梳理：       

  四种运行模式:                            
  ┌──────────────┬───────────────┬──────┬─────────────────────┐                                                                             
  │     模式     │     入口      │ 端口 │        说明         │                                                                             
  ├──────────────┼───────────────┼──────┼─────────────────────┤                                                                             
  │ 桌面应用     │ npm run dev   │ —    │ Electron + IPC      │                                                                             
  ├──────────────┼───────────────┼──────┼─────────────────────┤                                                                             
  │ 无头 API     │ npm run api   │ 3580 │ Express + 子进程    │                                                                             
  ├──────────────┼───────────────┼──────┼─────────────────────┤                                                                             
  │ Web 界面     │ npm run web   │ 3579 │ Express + WebSocket │                                                                             
  ├──────────────┼───────────────┼──────┼─────────────────────┤                                                                             
  │ FastAPI 前端 │ python app.py │ 9000 │ 代理 API + SSE      │
  └──────────────┴───────────────┴──────┴─────────────────────┘                                                                       
  核心数据流:

  桌面模式：
  Renderer (Monaco/xterm) → IPC → ipc-handlers.ts → 文件系统 / node-pty / Claude SDK         

  API模式：                               
  HTTP POST /generate → 创建任务 → 启动 claude CLI子进程 → 写入 code_v0001/                                                                 
  HTTP GET /logs/:id→ 轮询日志                      

  Web 模式：                                        
  浏览器 → WebSocket → web-server（复用 ipc-handlers 逻辑）→ 文件系统 / node-pty                                                                                                                                  
  FastAPI 模式：                            
  Vue3 → FastAPI (9000) → HTTP → API Server (3580) → claude CLI↑ SSE 实时日志流
  
  关键文件                                  
                                                                                                                                            
  ┌──────────────────────────┬─────────────────────────────────────────────┐
  │           文件           │                    作用                     │                                                                
  ├──────────────────────────┼─────────────────────────────────────────────┤                                                                
  │ src/main/ipc-handlers.ts │ 所有 IPC 处理（编辑器、终端、文件、GitHub） │                                                                
  ├──────────────────────────┼─────────────────────────────────────────────┤                                                                
  │ src/main/claude/sdk.ts   │ Claude Agent SDK 封装，流式输出             │                                                                
  ├──────────────────────────┼─────────────────────────────────────────────┤                                                                
  │ src/renderer/index.ts    │ 主App 类，组装所有 UI组件                   │                                                                
  ├──────────────────────────┼─────────────────────────────────────────────┤                                                                
  │ src/api-server/index.ts  │ 无头 API，任务管理 + 子进程调度             │
  ├──────────────────────────┼─────────────────────────────────────────────┤                                                                
  │ src/web-server/index.ts  │ WebSocket 服务，镜像 IPC 协议               │
  ├──────────────────────────┼─────────────────────────────────────────────┤                                                                
  │ api-integration/app.py   │ FastAPI 代理 + SSE + ZIP 下载 + 项目管理    │
  └──────────────────────────┴─────────────────────────────────────────────┘                                                                
                                                            
  ---                                                                                                                                       
  数据存储                                                  
                                            
  ~/Documents/OnlySpecs/
  ├── editors/          # 编辑器内容（每个 tab 一个 JSON）
  ├── config.json       # API Key、上次项目路径 
  ├── api-workspaces/   # API 模式生成的代码             
  │   └── task_*/                         
  │├── specs_v0001.md                       
  │       └── code_v0001/                 
  └── tmp/              # GitHub import 临时克隆目录    

  两个独立的 Claude 调用路径：                                     
  1. 桌面/Web 模式 — 通过 claude/sdk.ts 调用 @anthropic-ai/claude-agent-sdk，流式返回结果给 UI
  2. API 模式 — 直接 spawn claude CLI 子进程，用 node-pty 捕获输出，存入任务日志                                                            
                                                                                                                                            
  两条路径互相独立，不共享代码。       
```


# ***2025.3.23***

## 知识学习


## 实践

### Debug 网络代理

### 完善数据流向

优化prompt以暴露onlyspecs原有复杂文档生成能力

