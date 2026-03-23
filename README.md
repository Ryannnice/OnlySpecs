# OnlySpecs

基于 Electron 的代码生成工具，集成 Claude AI，根据规格说明自动生成代码。

## 目录结构

```
OnlySpecs/
├── src/                    # 源代码
│   ├── main/               # Electron 主进程
│   ├── preload/            # 安全桥梁层
│   ├── renderer/           # 前端 UI
│   ├── api-server/         # 无头 API 服务器
│   ├── web-server/         # Web 界面服务器
│   └── prompts/            # AI 提示词
├── api-integration/        # FastAPI 前端集成
├── tests/                  # 测试文件
├── docs/                   # 文档
└── systemd/                # systemd 服务配置
```

## 快速启动

### 1. 桌面应用

```bash
npm install
npm run dev
```

### 2. 无头 API 服务器（端口 3580）

```bash
npm run api
```

### 3. Web 界面

```bash
npm run web
```

### 4. FastAPI 集成界面（端口 9000）

```bash
# 先启动 API 服务器
npm run api

# 再启动 FastAPI
cd api-integration
./start.sh
# 访问 http://localhost:9000
```

## 核心 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /generate | 创建代码生成任务 |
| GET | /status/:taskId | 查询任务状态 |
| GET | /logs/:taskId | 获取任务日志 |
| GET | /download/:taskId | 下载生成代码 |
| GET | /tasks | 列出所有任务 |
| DELETE | /task/:taskId | 取消并清理任务 |
| GET | /health | 健康检查 |

详细 API 文档见 [docs/API.md](docs/API.md)。

## 配置

应用配置存储在 `~/Documents/OnlySpecs/config.json`：

```json
{
  "apiKey": "your-anthropic-api-key",
  "baseUrl": "https://api.anthropic.com"
}
```

## 测试

```bash
npm run test:api       # API 测试
npm test               # SDK 测试
```

## 许可证

MIT
