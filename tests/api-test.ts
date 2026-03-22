/**
 * Test script for OnlySpecs Headless API
 *
 * Usage: npx tsx tests/api-test.ts
 */

interface TaskResponse {
  taskId: string;
  status: string;
  message?: string;
}

interface StatusResponse {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  workspacePath: string;
  codePath: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

const API_BASE = process.env.ONLYSPECS_API_URL || 'http://localhost:3580';

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  console.log('Health:', data);
  return response.ok;
}

async function testCreateTask(prompt: string): Promise<string | null> {
  console.log('\n=== Testing Task Creation ===');
  console.log('Prompt:', prompt);

  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data: TaskResponse = await response.json();
  console.log('Response:', data);

  if (response.ok && data.taskId) {
    console.log(`✓ Task created: ${data.taskId}`);
    return data.taskId;
  } else {
    console.error('✗ Failed to create task');
    return null;
  }
}

async function testGetStatus(taskId: string): Promise<StatusResponse | null> {
  console.log('\n=== Testing Get Status ===');
  const response = await fetch(`${API_BASE}/status/${taskId}`);

  if (!response.ok) {
    console.error(`✗ Failed to get status: ${response.status}`);
    return null;
  }

  const data: StatusResponse = await response.json();
  console.log('Status:', data.status);
  console.log('Workspace:', data.workspacePath);
  console.log('Code Path:', data.codePath);

  return data;
}

async function testGetLogs(taskId: string) {
  console.log('\n=== Testing Get Logs ===');
  const response = await fetch(`${API_BASE}/logs/${taskId}`);

  if (!response.ok) {
    console.error(`✗ Failed to get logs: ${response.status}`);
    return;
  }

  const data = await response.json();
  console.log(`Logs (${data.logs.length} entries):`);
  data.logs.slice(0, 5).forEach((log: string) => {
    console.log('  ', log.substring(0, 100));
  });
  if (data.logs.length > 5) {
    console.log(`  ... and ${data.logs.length - 5} more`);
  }
}

async function testListTasks() {
  console.log('\n=== Testing List Tasks ===');
  const response = await fetch(`${API_BASE}/tasks`);
  const data = await response.json();
  console.log(`Total tasks: ${data.tasks.length}`);
  data.tasks.forEach((task: any) => {
    console.log(`  - ${task.taskId}: ${task.status}`);
  });
}

async function pollTaskCompletion(taskId: string, maxWaitSeconds: number = 300): Promise<boolean> {
  console.log('\n=== Polling Task Completion ===');
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await testGetStatus(taskId);

    if (!status) {
      console.error('✗ Failed to get status');
      return false;
    }

    if (status.status === 'completed') {
      console.log('✓ Task completed successfully!');
      return true;
    } else if (status.status === 'failed') {
      console.error('✗ Task failed:', status.error);
      return false;
    }

    console.log(`Status: ${status.status}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.error('✗ Timeout waiting for task completion');
  return false;
}

async function main() {
  console.log('OnlySpecs API Test Suite');
  console.log('API Base URL:', API_BASE);

  try {
    // Test 1: Health check
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      console.error('Health check failed. Is the API server running?');
      process.exit(1);
    }

    // Test 2: List existing tasks
    await testListTasks();

    // Test 3: Create a simple task
    const prompt = `# Simple Calculator Specification

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
- Display should update in real-time`;

    const taskId = await testCreateTask(prompt);

    if (!taskId) {
      console.error('Failed to create task');
      process.exit(1);
    }

    // Test 4: Get initial status
    await testGetStatus(taskId);

    // Test 5: Get logs
    await testGetLogs(taskId);

    // Test 6: Poll for completion (optional, can be skipped for quick test)
    const shouldWait = process.argv.includes('--wait');
    if (shouldWait) {
      const completed = await pollTaskCompletion(taskId, 300);

      if (completed) {
        // Test 7: Get final logs
        await testGetLogs(taskId);

        // Test 8: Download (get path)
        console.log('\n=== Testing Download ===');
        const downloadResponse = await fetch(`${API_BASE}/download/${taskId}`);
        const downloadData = await downloadResponse.json();
        console.log('Download info:', downloadData);
      }
    } else {
      console.log('\n⚠ Skipping completion wait. Use --wait flag to wait for completion.');
      console.log(`Task ID: ${taskId}`);
      console.log(`Check status: curl ${API_BASE}/status/${taskId}`);
    }

    console.log('\n✓ All tests completed!');

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

main();
