# OnlySpecs API 文档

## 启动

```bash
npm run api   # 默认端口 3580
```

环境变量 `ONLYSPECS_API_PORT` 可修改端口。

## 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /generate | 创建代码生成任务 |
| GET | /status/:taskId | 查询任务状态 |
| GET | /logs/:taskId | 获取任务日志 |
| GET | /download/:taskId | 下载生成代码 |
| GET | /tasks | 列出所有任务 |
| DELETE | /task/:taskId | 取消并清理任务（`?cleanup=true` 删除文件） |
| GET | /health | 健康检查 |

### 状态值

`pending` → `running` → `completed` / `failed`

## Python 调用示例

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
    data = requests.get(f"{API_BASE}/status/{task_id}").json()
    status = data["status"]
    print(f"Status: {status}")

    if status == "completed":
        print(f"Code path: {data['codePath']}")
        break
    elif status == "failed":
        print(f"Failed: {data.get('error')}")
        break

    time.sleep(5)

# 获取日志
logs = requests.get(f"{API_BASE}/logs/{task_id}").json()["logs"]
print("Logs:", logs)
```
