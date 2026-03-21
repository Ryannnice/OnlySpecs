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

原架构：

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


新架构：

```
 大项目
 ├── Vue 仪表盘（前端）   → Docker: Nginx 静态托管，端口 80
 ├── FastAPI 后端         → Docker: Uvicorn，端口 9000
 │   ├── /generate        → DeepSeek 流式生成 HTML
 │   └── /upload          → 阿里云 OSS 上传
 └── OnlySpecs（待加入）  → Docker: Node.js，端口 3579
     └── 功能：Specs 编写、Claude AI 代码生成、终端
```

