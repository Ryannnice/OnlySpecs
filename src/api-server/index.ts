import express from 'express';
import { createServer } from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { summarizeSpecs } from '../prompts/summarizeSpecs';

const PORT = Number(process.env.ONLYSPECS_API_PORT ?? 3580);
const WORKSPACE_BASE = path.join(os.homedir(), 'Documents', 'OnlySpecs', 'api-workspaces');

const OUTPUT_TYPE_CONSTRAINTS: Record<string, string> = {
  web: '单文件 HTML 应用，内嵌 CSS 和 JavaScript，无外部依赖，可直接在浏览器运行',
  exe: 'Python 桌面应用，使用 pygame 或 tkinter，包含 requirements.txt 列出所有依赖',
  pwa: '渐进式 Web 应用，包含 manifest.json，响应式设计适配移动设备',
  source: '标准源代码结构，遵循最佳实践和代码规范'
};

interface Task {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  prompt: string;
  outputType?: string;
  workspacePath: string;
  specsPath: string;
  codePath: string;
  logs: string[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  childProcess?: ReturnType<typeof spawn>;
}

const tasks = new Map<string, Task>();

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function createWorkspace(taskId: string): Promise<{ workspacePath: string; specsPath: string; codePath: string }> {
  const workspacePath = path.join(WORKSPACE_BASE, taskId);
  await ensureDir(workspacePath);

  const specsPath = path.join(workspacePath, 'specs_v0001.md');
  const codePath = path.join(workspacePath, 'code_v0001');

  return { workspacePath, specsPath, codePath };
}

async function runClaudeProcess(task: Task, prompt: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['--dangerously-skip-permissions', '--print'];
    const child = spawn('claude', args, {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    task.childProcess = child;
    child.stdin.write(prompt);
    child.stdin.end();

    child.stdout.on('data', (data: Buffer) => {
      task.logs.push(data.toString());
      task.updatedAt = new Date();
    });

    child.stderr.on('data', (data: Buffer) => {
      task.logs.push(`[STDERR] ${data.toString()}`);
      task.updatedAt = new Date();
    });

    child.on('close', (exitCode) => {
      task.childProcess = undefined;
      if (exitCode === 0) {
        resolve();
      } else {
        task.status = 'failed';
        task.error = `Claude CLI exited with code ${exitCode}`;
        reject(new Error(task.error));
      }
    });
  });
}

async function startClaudeGeneration(task: Task): Promise<void> {
  task.status = 'running';
  task.updatedAt = new Date();

  try {
    const outputType = task.outputType || 'source';

    // Phase 1: Prepare files
    await fs.writeFile(task.specsPath, task.prompt, 'utf-8');
    task.logs.push(`[${new Date().toISOString()}] Specs file created`);

    const instructionsContent = `${summarizeSpecs}

---

## 用户需求

${task.prompt}

## 输出类型要求

**类型**: ${outputType}
**约束**: ${OUTPUT_TYPE_CONSTRAINTS[outputType]}
`;

    const instructionsPath = path.join(task.workspacePath, 'summarize_specs_instructions.md');
    await fs.writeFile(instructionsPath, instructionsContent, 'utf-8');
    task.logs.push(`[${new Date().toISOString()}] Instructions file created`);

    await ensureDir(task.codePath);

    // Phase 2: Architecture analysis and code generation
    const generatePrompt = `请执行以下任务：

第一步：阅读 specs_v0001.md 了解用户需求，阅读 summarize_specs_instructions.md 了解架构分析框架。

第二步：在当前目录创建 output_specs.md，按照框架的 14 个章节详细分析项目架构（每个章节至少 3-5 段详细说明）。

第三步：基于 output_specs.md 的架构分析，在 ${task.codePath} 实现完整代码。必须包含：
- 完整的项目结构（多个文件，不只是单个 HTML）
- 所有必要的配置文件
- 依赖管理文件
- README 说明文档

严格遵循输出类型约束：${OUTPUT_TYPE_CONSTRAINTS[outputType]}

不要问问题，直接开始。`;
    await runClaudeProcess(task, generatePrompt, task.workspacePath);

    // Phase 3: Test and fix
    if (task.status === 'running') {
      task.logs.push(`[${new Date().toISOString()}] Starting test and fix phase...`);

      const testPrompt = `请在当前文件夹运行构建和测试，创建 100-1000 个测试用例（单元测试+集成测试）。如有错误，修复代码并重新运行直到所有测试通过。打印测试结果。不要问问题，完成后立即退出。`;

      await runClaudeProcess(task, testPrompt, task.codePath);
    }

    task.status = 'completed';
    task.logs.push(`[${new Date().toISOString()}] All phases completed successfully`);
    task.updatedAt = new Date();

  } catch (error: any) {
    task.status = 'failed';
    task.error = error.message || 'Unknown error';
    task.logs.push(`[${new Date().toISOString()}] Error: ${task.error}`);
    task.updatedAt = new Date();
  }
}

// Express app setup
const app = express();
app.use(express.json());

// CORS middleware for FastAPI integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// POST /generate - Create a new generation task
app.post('/generate', async (req, res) => {
  try {
    const { prompt, outputType = 'source' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt. Must be a non-empty string.' });
    }

    const taskId = generateTaskId();
    const { workspacePath, specsPath, codePath } = await createWorkspace(taskId);

    const task: Task = {
      id: taskId,
      status: 'pending',
      prompt,
      outputType,
      workspacePath,
      specsPath,
      codePath,
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.set(taskId, task);

    // Start generation asynchronously
    startClaudeGeneration(task).catch(err => {
      console.error(`Task ${taskId} failed:`, err);
    });

    res.json({
      taskId,
      status: task.status,
      message: 'Task created successfully',
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /status/:taskId - Get task status
app.get('/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    taskId: task.id,
    status: task.status,
    workspacePath: task.workspacePath,
    codePath: task.codePath,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    error: task.error,
  });
});

// GET /logs/:taskId - Get task logs (streaming support)
app.get('/logs/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    taskId: task.id,
    logs: task.logs,
  });
});

// GET /download/:taskId - Download generated code as zip
app.get('/download/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status !== 'completed') {
    return res.status(400).json({ error: 'Task not completed yet' });
  }

  try {
    // Check if code directory exists
    await fs.access(task.codePath);

    // For now, return the path. In production, you'd zip and stream the files
    res.json({
      taskId: task.id,
      codePath: task.codePath,
      workspacePath: task.workspacePath,
      message: 'Code generation completed. Access files at the provided path.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to access generated code', details: error.message });
  }
});

// DELETE /task/:taskId - Cancel and cleanup a task
app.delete('/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  try {
    // Kill the process if running
    if (task.childProcess) {
      task.childProcess.kill();
      task.childProcess = undefined;
    }

    // Optionally cleanup workspace
    const { cleanup } = req.query;
    if (cleanup === 'true') {
      await fs.rm(task.workspacePath, { recursive: true, force: true });
    }

    tasks.delete(taskId);

    res.json({
      message: 'Task cancelled and cleaned up',
      taskId,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to cleanup task', details: error.message });
  }
});

// GET /tasks - List all tasks
app.get('/tasks', (req, res) => {
  const taskList = Array.from(tasks.values()).map(task => ({
    taskId: task.id,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    error: task.error,
  }));

  res.json({ tasks: taskList });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize workspace directory
async function initialize() {
  await ensureDir(WORKSPACE_BASE);
  console.log(`Workspace directory: ${WORKSPACE_BASE}`);
}

// Start server
const server = createServer(app);

initialize().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`OnlySpecs API Server running at http://0.0.0.0:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  POST   /generate       - Create new generation task`);
    console.log(`  GET    /status/:taskId - Get task status`);
    console.log(`  GET    /logs/:taskId   - Get task logs`);
    console.log(`  GET    /download/:taskId - Download generated code`);
    console.log(`  DELETE /task/:taskId   - Cancel and cleanup task`);
    console.log(`  GET    /tasks          - List all tasks`);
    console.log(`  GET    /health         - Health check`);
  });
}).catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});

