# OnlySpecs Headless API - 快速启动指南

## 概述

OnlySpecs Headless API 允许你通过 HTTP 请求调用 OnlySpecs 的代码生成功能，非常适合集成到其他系统（如 FastAPI、Django 等）。

## 前置要求

1. **Node.js** (v18+)
2. **Claude CLI** - 已安装并配置好 API 密钥
   ```bash
   # 检查 Claude CLI 是否安装
   claude --version
   ```

## 快速启动

### 1. 启动 API 服务器

```bash
cd /home/ryan/OnlySpecs
npm run api
```

服务器将在 `http://0.0.0.0:3580` 启动。

### 2. 测试 API

在另一个终端运行测试脚本：

```bash
# 快速测试（不等待完成）
npm run test:api

# 完整测试（等待任务完成）
npm run test:api:wait
```

### 3. 手动测试

使用 curl 测试：

```bash
# 健康检查
curl http://localhost:3580/health

# 创建任务
curl -X POST http://localhost:3580/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "创建一个简单的 Hello World HTML 页面"}'

# 查询状态（替换 TASK_ID）
curl http://localhost:3580/status/TASK_ID

# 查看日志
curl http://localhost:3580/logs/TASK_ID

# 列出所有任务
curl http://localhost:3580/tasks
```

## 与 FastAPI 集成

### FastAPI 服务端代码

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
import asyncio

app = FastAPI()
ONLYSPECS_API = "http://localhost:3580"

class GenerateRequest(BaseModel):
    prompt: str

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

@app.post("/api/generate-software", response_model=TaskResponse)
async def generate_software(request: GenerateRequest):
    """创建软件生成任务"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{ONLYSPECS_API}/generate",
                json={"prompt": request.prompt},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()

            return TaskResponse(
                task_id=data["taskId"],
                status=data["status"],
                message=data.get("message", "Task created")
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/task-status/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{ONLYSPECS_API}/status/{task_id}",
                timeout=10.0
            )
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Task not found")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/task-logs/{task_id}")
async def get_task_logs(task_id: str):
    """获取任务日志"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{ONLYSPECS_API}/logs/{task_id}",
                timeout=10.0
            )
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Task not found")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 启动 FastAPI 服务

```bash
# 安装依赖
pip install fastapi uvicorn httpx

# 启动服务
python main.py
```

### 测试 FastAPI 端点

```bash
# 创建任务
curl -X POST http://localhost:8000/api/generate-software \
  -H "Content-Type: application/json" \
  -d '{"prompt": "创建一个待办事项应用"}'

# 查询状态
curl http://localhost:8000/api/task-status/TASK_ID

# 查看日志
curl http://localhost:8000/api/task-logs/TASK_ID
```

***已测试成功***

## 前端集成（Vue/React）

### Vue 3 示例

```vue
<template>
  <div class="software-generator">
    <h2>AI 软件生成器</h2>

    <textarea
      v-model="prompt"
      placeholder="描述你想要的软件..."
      rows="6"
    ></textarea>

    <button @click="generateSoftware" :disabled="loading">
      {{ loading ? '生成中...' : '生成软件' }}
    </button>

    <div v-if="taskId" class="status">
      <h3>任务状态: {{ status }}</h3>
      <div class="logs">
        <pre>{{ logs.join('\n') }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const API_BASE = 'http://localhost:8000/api';
const prompt = ref('');
const taskId = ref('');
const status = ref('');
const logs = ref([]);
const loading = ref(false);

async function generateSoftware() {
  if (!prompt.value.trim()) return;

  loading.value = true;

  try {
    // 创建任务
    const response = await fetch(`${API_BASE}/generate-software`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value })
    });

    const data = await response.json();
    taskId.value = data.task_id;
    status.value = data.status;

    // 轮询状态
    pollStatus();
  } catch (error) {
    console.error('Error:', error);
    alert('生成失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

async function pollStatus() {
  const interval = setInterval(async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/task-status/${taskId.value}`),
        fetch(`${API_BASE}/task-logs/${taskId.value}`)
      ]);

      const statusData = await statusRes.json();
      const logsData = await logsRes.json();

      status.value = statusData.status;
      logs.value = logsData.logs;

      if (statusData.status === 'completed' || statusData.status === 'failed') {
        clearInterval(interval);
        if (statusData.status === 'completed') {
          alert('软件生成完成！');
        } else {
          alert('生成失败: ' + statusData.error);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      clearInterval(interval);
    }
  }, 3000);
}
</script>

<style scoped>
.software-generator {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

textarea {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  font-family: monospace;
}

button {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.logs {
  background: #f5f5f5;
  padding: 10px;
  margin-top: 10px;
  max-height: 400px;
  overflow-y: auto;
}

pre {
  margin: 0;
  font-size: 12px;
}
</style>
```

## 配置选项

### 环境变量

```bash
# API 服务器端口（默认 3580）
export ONLYSPECS_API_PORT=3580

# 工作目录（默认 ~/Documents/OnlySpecs/api-workspaces）
# 可以在代码中修改 WORKSPACE_BASE 常量
```

## 生产部署建议

1. **添加认证**：使用 JWT 或 API Key 保护端点
2. **任务队列**：使用 Bull 或 Redis 管理并发任务
3. **文件存储**：集成 OSS（阿里云、AWS S3）存储生成的代码
4. **日志管理**：使用 Winston 或 Pino 进行结构化日志
5. **监控**：添加 Prometheus metrics 和健康检查
6. **限流**：使用 express-rate-limit 防止滥用
7. **WebSocket**：实现实时日志推送（替代轮询）

## 故障排查

### API 服务器无法启动

```bash
# 检查端口是否被占用
lsof -i :3580

# 检查 node-pty 是否正确安装
npm run postinstall
```

### Claude CLI 无法执行

```bash
# 检查 Claude CLI 是否在 PATH 中
which claude

# 检查 API 密钥是否配置
claude --version
```

### 任务一直处于 pending 状态

检查 API 服务器日志，可能是 Claude CLI 启动失败。

## 更多信息

- 完整 API 文档：`docs/API.md`
- 测试脚本：`tests/api-test.ts`终端运行 npm run test:api 后，见下方测试内容
- 源代码：`src/api-server/index.ts`


api测试脚本测试通过：
```
(base) ryan@ENVYKatana:~/OnlySpecs$ npm run test:api

> only-specs@1.0.0 test:api
> npx tsx tests/api-test.ts

OnlySpecs API Test Suite
API Base URL: http://localhost:3580

=== Testing Health Check ===
Health: { status: 'ok', timestamp: '2026-03-22T04:31:18.223Z' }

=== Testing List Tasks ===
Total tasks: 3
  - task_1774153414535_0pjz1dv94: running
  - task_1774153828526_1cmnjjbw2: running
  - task_1774153836805_22xzjshaz: running

=== Testing Task Creation ===
Prompt: # Simple Calculator Specification

Create a basic calculator web application with the following features:

## Requirements
1. HTML interface with number buttons (0-9)
2. Basic operations: +, -, *, /
3. Display showing current input and result
4. Clear button to reset
5. Simple CSS styling

## Technical Stack
- Pure HTML, CSS, and JavaScript
- No frameworks required
- Single HTML file

## Acceptance Criteria
- All buttons should be clickable
- Operations should work correctly
- Display should update in real-time
Response: {
  taskId: 'task_1774153878235_4wq65mlbg',
  status: 'running',
  message: 'Task created successfully'
}
✓ Task created: task_1774153878235_4wq65mlbg

=== Testing Get Status ===
Status: running
Workspace: /home/ryan/Documents/OnlySpecs/api-workspaces/task_1774153878235_4wq65mlbg
Code Path: /home/ryan/Documents/OnlySpecs/api-workspaces/task_1774153878235_4wq65mlbg/code_v0001

=== Testing Get Logs ===
Logs (3 entries):
   [2026-03-22T04:31:18.237Z] Specs file created: /home/ryan/Documents/OnlySpecs/api-workspaces/task_17
   [2026-03-22T04:31:18.238Z] Code directory created: /home/ryan/Documents/OnlySpecs/api-workspaces/tas
   [2026-03-22T04:31:18.238Z] Starting Claude CLI...

⚠ Skipping completion wait. Use --wait flag to wait for completion.
Task ID: task_1774153878235_4wq65mlbg
Check status: curl http://localhost:3580/status/task_1774153878235_4wq65mlbg

✓ All tests completed!
```