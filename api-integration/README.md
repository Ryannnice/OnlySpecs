# OnlySpecs 前端集成

基于 FastAPI + Vue 3 的 OnlySpecs 前端界面，让用户可以通过 Web 界面使用 OnlySpecs API 生成代码。

## 功能特性

- 📝 输入软件需求 prompt
- 🚀 一键触发代码生成
- 📊 实时查看生成进度和日志（SSE 流式推送）
- 💾 生成完成后下载代码
- 📜 查看历史任务列表

## 技术栈

- **后端**: FastAPI (Python)
- **前端**: Vue 3 (CDN) + Tailwind CSS
- **通信**: REST API + Server-Sent Events (SSE)

## 快速开始

### 1. 安装依赖

```bash
cd ~/OnlySpecs/api-integration
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，确保 ONLYSPECS_API_URL 指向正确的 API 服务器
```

### 3. 启动 OnlySpecs API 服务器

在另一个终端中启动 OnlySpecs API 服务器：

```bash
cd ~/OnlySpecs
npm run api
```

默认端口: 3580

### 4. 启动 FastAPI 应用

```bash
cd ~/OnlySpecs/api-integration
python app.py
```

或使用 uvicorn:

```bash
uvicorn app:app --host 0.0.0.0 --port 9000 --reload
```

### 5. 访问前端界面

打开浏览器访问: http://localhost:9000

## API 端点

### POST /api/generate
创建新的代码生成任务

**请求体:**
```json
{
  "prompt": "创建一个简单的待办事项应用"
}
```

**响应:**
```json
{
  "task_id": "abc123",
  "status": "pending",
  "message": "Task created successfully"
}
```

### GET /api/status/{task_id}
查询任务状态

**响应:**
```json
{
  "taskId": "abc123",
  "status": "running",
  "workDir": "/path/to/generated/code",
  "logs": ["log line 1", "log line 2"]
}
```

### GET /api/logs/{task_id}
实时获取任务日志（SSE 流式）

**响应:** Server-Sent Events 流

### GET /api/tasks
列出所有任务

**响应:**
```json
{
  "tasks": [
    {
      "taskId": "abc123",
      "status": "completed",
      "prompt": "创建一个待办事项应用",
      "workDir": "/path/to/code"
    }
  ]
}
```

### GET /api/download/{task_id}
下载生成的代码（ZIP 文件）

## 使用流程

1. 在输入框中描述你的软件需求
2. 点击"开始生成"按钮
3. 实时查看 Claude CLI 的输出日志
4. 生成完成后，可以：
   - 下载代码 ZIP 文件
   - 在文件管理器中打开工作目录
5. 查看历史任务列表，点击可重新加载任务详情

## 项目结构

```
api-integration/
├── app.py              # FastAPI 应用
├── requirements.txt    # Python 依赖
├── .env               # 环境变量配置
├── .env.example       # 环境变量模板
├── static/
│   └── index.html     # Vue 3 前端页面
└── README.md          # 本文档
```

## 开发说明

### 修改端口

编辑 `.env` 文件中的 `PORT` 变量，或在启动时指定：

```bash
PORT=8000 python app.py
```

### 修改 API 地址

如果 OnlySpecs API 服务器运行在不同的地址或端口，修改 `.env` 文件中的 `ONLYSPECS_API_URL`。

### 前端开发

前端是单文件 HTML 应用，使用 CDN 加载 Vue 3 和 Tailwind CSS。修改 `static/index.html` 即可。

## 故障排除

### 无法连接到 OnlySpecs API

确保 OnlySpecs API 服务器正在运行：

```bash
curl http://localhost:3580/api/tasks
```

### CORS 错误

FastAPI 应用已配置 CORS，允许所有来源。如果仍有问题，检查浏览器控制台。

### 日志不更新

检查浏览器是否支持 Server-Sent Events (SSE)。现代浏览器都支持。

## 许可证

与 OnlySpecs 项目相同
