# OnlySpecs Headless API

无头 API 模式允许通过 HTTP 请求调用 OnlySpecs 的代码生成功能。

## 启动 API 服务器

```bash
npm run api
```

默认端口：`3580`（可通过环境变量 `ONLYSPECS_API_PORT` 修改）

## API 端点

### 1. POST /generate

创建新的代码生成任务。

**请求：**
```json
{
  "prompt": "创建一个简单的待办事项应用，使用 React 和 TypeScript"
}
```

**响应：**
```json
{
  "taskId": "task_1234567890_abc123",
  "status": "pending",
  "message": "Task created successfully"
}
```

### 2. GET /status/:taskId

查询任务状态。

**响应：**
```json
{
  "taskId": "task_1234567890_abc123",
  "status": "running",
  "workspacePath": "/home/user/Documents/OnlySpecs/api-workspaces/task_1234567890_abc123",
  "codePath": "/home/user/Documents/OnlySpecs/api-workspaces/task_1234567890_abc123/code_v0001",
  "createdAt": "2026-03-22T10:00:00.000Z",
  "updatedAt": "2026-03-22T10:05:00.000Z"
}
```

状态值：
- `pending`: 任务已创建，等待开始
- `running`: 正在生成代码
- `completed`: 生成完成
- `failed`: 生成失败

### 3. GET /logs/:taskId

获取任务日志。

**响应：**
```json
{
  "taskId": "task_1234567890_abc123",
  "logs": [
    "[2026-03-22T10:00:00.000Z] Specs file created",
    "[2026-03-22T10:00:01.000Z] Starting Claude CLI...",
    "Claude output..."
  ]
}
```

### 4. GET /download/:taskId

下载生成的代码。

**响应：**
```json
{
  "taskId": "task_1234567890_abc123",
  "codePath": "/home/user/Documents/OnlySpecs/api-workspaces/task_1234567890_abc123/code_v0001",
  "workspacePath": "/home/user/Documents/OnlySpecs/api-workspaces/task_1234567890_abc123",
  "message": "Code generation completed. Access files at the provided path."
}
```

### 5. DELETE /task/:taskId

取消并清理任务。

**查询参数：**
- `cleanup=true`: 删除工作目录

**响应：**
```json
{
  "message": "Task cancelled and cleaned up",
  "taskId": "task_1234567890_abc123"
}
```

### 6. GET /tasks

列出所有任务。

**响应：**
```json
{
  "tasks": [
    {
      "taskId": "task_1234567890_abc123",
      "status": "completed",
      "createdAt": "2026-03-22T10:00:00.000Z",
      "updatedAt": "2026-03-22T10:10:00.000Z"
    }
  ]
}
```

### 7. GET /health

健康检查。

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-03-22T10:00:00.000Z"
}
```

## Python 客户端示例

```python
import requests
import time

API_BASE = "http://localhost:3580"

# 创建任务
response = requests.post(f"{API_BASE}/generate", json={
    "prompt": "创建一个简单的计算器应用"
})
task_id = response.json()["taskId"]
print(f"Task created: {task_id}")

# 轮询状态
while True:
    status_response = requests.get(f"{API_BASE}/status/{task_id}")
    status_data = status_response.json()
    status = status_data["status"]

    print(f"Status: {status}")

    if status == "completed":
        print("Generation completed!")
        print(f"Code path: {status_data['codePath']}")
        break
    elif status == "failed":
        print(f"Generation failed: {status_data.get('error')}")
        break

    time.sleep(5)

# 获取日志
logs_response = requests.get(f"{API_BASE}/logs/{task_id}")
print("Logs:", logs_response.json()["logs"])
```

## FastAPI 集成示例

```python
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()
ONLYSPECS_API = "http://localhost:3580"

@app.post("/create-software")
async def create_software(prompt: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{ONLYSPECS_API}/generate",
            json={"prompt": prompt}
        )
        return response.json()

@app.get("/software-status/{task_id}")
async def get_status(task_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{ONLYSPECS_API}/status/{task_id}"
        )
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Task not found")
        return response.json()
```

## 注意事项

1. **Claude CLI 依赖**：确保系统已安装 Claude CLI 并配置好 API 密钥
2. **工作目录**：生成的代码存储在 `~/Documents/OnlySpecs/api-workspaces/`
3. **并发限制**：当前实现没有并发限制，生产环境建议添加任务队列
4. **文件下载**：当前返回文件路径，生产环境建议实现 ZIP 打包和流式下载
5. **日志大小**：长时间运行的任务可能产生大量日志，建议实现日志分页或限制
