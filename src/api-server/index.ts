import express from 'express';
import { createServer } from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createRequire } from 'module';
import type { IPty } from 'node-pty';

const require = createRequire(import.meta.url);
const pty = require('node-pty') as typeof import('node-pty');

const PORT = Number(process.env.ONLYSPECS_API_PORT ?? 3580);
const WORKSPACE_BASE = path.join(os.homedir(), 'Documents', 'OnlySpecs', 'api-workspaces');

interface Task {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  prompt: string;
  workspacePath: string;
  specsPath: string;
  codePath: string;
  logs: string[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  ptyProcess?: IPty;
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

async function startClaudeGeneration(task: Task): Promise<void> {
  task.status = 'running';
  task.updatedAt = new Date();

  try {
    // Write specs file
    await fs.writeFile(task.specsPath, task.prompt, 'utf-8');
    task.logs.push(`[${new Date().toISOString()}] Specs file created: ${task.specsPath}`);

    // Create code directory
    await ensureDir(task.codePath);
    task.logs.push(`[${new Date().toISOString()}] Code directory created: ${task.codePath}`);

    // Start Claude CLI via node-pty
    const claudeCommand = 'claude';
    const args = ['--dangerously-skip-permissions'];

    task.logs.push(`[${new Date().toISOString()}] Starting Claude CLI...`);

    const ptyProcess = pty.spawn(claudeCommand, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: task.workspacePath,
      env: process.env as { [key: string]: string },
    });

    task.ptyProcess = ptyProcess;

    // Capture output
    ptyProcess.onData((data) => {
      task.logs.push(data);
      task.updatedAt = new Date();
    });

    // Auto-confirm trust prompt and send initial prompt to Claude
    setTimeout(() => {
      // Send "1" to confirm trust prompt
      ptyProcess.write('1\r');
      task.logs.push(`[${new Date().toISOString()}] Auto-confirmed workspace trust`);
    }, 2000);

    setTimeout(() => {
      const prompt = `Read the specs file at ${task.specsPath} and implement the code in ${task.codePath}. Follow the specifications exactly.`;
      ptyProcess.write(prompt + '\r');
      task.logs.push(`[${new Date().toISOString()}] Sent prompt to Claude`);
    }, 4000);

    // Handle process exit
    ptyProcess.onExit(({ exitCode }) => {
      if (exitCode === 0) {
        task.status = 'completed';
        task.logs.push(`[${new Date().toISOString()}] Claude CLI completed successfully`);
      } else {
        task.status = 'failed';
        task.error = `Claude CLI exited with code ${exitCode}`;
        task.logs.push(`[${new Date().toISOString()}] ${task.error}`);
      }
      task.updatedAt = new Date();
      task.ptyProcess = undefined;
    });

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
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt. Must be a non-empty string.' });
    }

    const taskId = generateTaskId();
    const { workspacePath, specsPath, codePath } = await createWorkspace(taskId);

    const task: Task = {
      id: taskId,
      status: 'pending',
      prompt,
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
    if (task.ptyProcess) {
      task.ptyProcess.kill();
      task.ptyProcess = undefined;
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

