# OnlySpecs 前端集成

基于 FastAPI + Vue 3 的 Web 界面，通过 SSE 实时展示代码生成日志。

## 快速启动

```bash
# 1. 启动 OnlySpecs API（另一个终端）
cd ~/OnlySpecs && npm run api

# 2. 启动 FastAPI
cd ~/OnlySpecs/api-integration
./start.sh
# 访问 http://localhost:9000
```

手动启动：

```bash
pip install -r requirements.txt
python app.py
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/generate | 创建代码生成任务 |
| GET | /api/status/{task_id} | 查询任务状态 |
| GET | /api/logs/{task_id} | SSE 实时日志流 |
| GET | /api/tasks | 列出所有任务 |
| GET | /api/download/{task_id} | 下载生成代码（ZIP） |
| GET | / | 前端页面 |

## 配置

编辑 `.env` 文件：

```
ONLYSPECS_API_URL=http://localhost:3580
PORT=9000
```
