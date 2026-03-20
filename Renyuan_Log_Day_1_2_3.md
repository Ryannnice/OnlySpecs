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
使用.json格式请求体完成信息传递
前端直接通过函数调用REST API


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