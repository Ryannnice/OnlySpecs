import asyncio
import json
import os
import re
import shutil
import tempfile
from typing import AsyncGenerator
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ANSI escape code pattern
ANSI_ESCAPE_PATTERN = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

# Translation mapping for common Claude CLI messages
TRANSLATIONS = {
    # Status messages
    "Starting": "正在启动",
    "Reading": "正在读取",
    "Writing": "正在写入",
    "Creating": "正在创建",
    "Generating": "正在生成",
    "Analyzing": "正在分析",
    "Processing": "正在处理",
    "Completed": "已完成",
    "Failed": "失败",
    "Error": "错误",
    "Warning": "警告",
    "Success": "成功",

    # File operations
    "file": "文件",
    "directory": "目录",
    "folder": "文件夹",
    "created": "已创建",
    "updated": "已更新",
    "deleted": "已删除",
    "modified": "已修改",

    # Code generation
    "Implementing": "正在实现",
    "Refactoring": "正在重构",
    "Testing": "正在测试",
    "Debugging": "正在调试",
    "Optimizing": "正在优化",

    # Common phrases
    "Let me": "让我",
    "I'll": "我将",
    "I will": "我将",
    "I'm going to": "我将要",
    "I've": "我已经",
    "I have": "我已经",
    "Done": "完成",
    "Finished": "已完成",
    "Complete": "完成",
}

def strip_ansi_codes(text: str) -> str:
    return ANSI_ESCAPE_PATTERN.sub('', text)

def translate_log(text: str) -> str:
    """Translate common English phrases to Chinese"""
    result = text
    for en, zh in TRANSLATIONS.items():
        # Case-insensitive replacement
        result = re.sub(r'\b' + re.escape(en) + r'\b', zh, result, flags=re.IGNORECASE)
    return result

# 前端对接OnlySpecs的核心prompt增强
def enhance_prompt(prompt: str, output_type: str) -> str:
    """Enhance prompt based on output type"""
    enhancements = {
        "web": "\n\nIMPORTANT: Generate as a single-file HTML application with embedded CSS and JavaScript. No external dependencies. Must run directly in browser.",
        "exe": "\n\nIMPORTANT: Generate as a Python desktop application using pygame or tkinter. Include requirements.txt with all dependencies.",
        "pwa": "\n\nIMPORTANT: Generate as a Progressive Web App with manifest.json. Single HTML file with responsive design for mobile devices."
    }
    return prompt + enhancements.get(output_type, "")

app = FastAPI(title="OnlySpecs Frontend Integration")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ONLYSPECS_API_URL = os.getenv("ONLYSPECS_API_URL", "http://localhost:3580")
API_TIMEOUT = 300.0

# Bypass proxy for localhost
HTTPX_PROXIES = {"all://": None}

class GenerateRequest(BaseModel):
    prompt: str
    outputType: str = "source"

class GenerateResponse(BaseModel):
    task_id: str
    status: str
    message: str

@app.post("/api/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest):
    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT, proxies=HTTPX_PROXIES) as client:
            response = await client.post(
                f"{ONLYSPECS_API_URL}/generate",
                json={
                    "prompt": request.prompt,
                    "outputType": request.outputType
                }
            )
            response.raise_for_status()
            data = response.json()
            return GenerateResponse(
                task_id=data["taskId"],
                status=data["status"],
                message=data.get("message", "Task created successfully")
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/status/{task_id}")
async def get_task_status(task_id: str):
    try:
        async with httpx.AsyncClient(timeout=30.0, proxies=HTTPX_PROXIES) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/status/{task_id}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/logs/{task_id}")
async def stream_logs(task_id: str):
    async def log_generator() -> AsyncGenerator[str, None]:
        last_log_count = 0
        max_retries = 600  # 10 minutes
        retry_count = 0

        while retry_count < max_retries:
            try:
                async with httpx.AsyncClient(timeout=30.0, proxies=HTTPX_PROXIES) as client:
                    logs_response = await client.get(f"{ONLYSPECS_API_URL}/logs/{task_id}")
                    logs_response.raise_for_status()
                    logs = logs_response.json().get("logs", [])

                    status_response = await client.get(f"{ONLYSPECS_API_URL}/status/{task_id}")
                    status_response.raise_for_status()
                    status_data = status_response.json()

                    if len(logs) > last_log_count:
                        for log in logs[last_log_count:]:
                            clean_log = strip_ansi_codes(log)
                            translated_log = translate_log(clean_log)
                            yield f"data: {json.dumps({'type': 'log', 'content': translated_log})}\n\n"
                        last_log_count = len(logs)

                    status = status_data.get("status")
                    if status in ["completed", "failed"]:
                        # Also return codePath so frontend can show it
                        yield f"data: {json.dumps({'type': 'status', 'status': status, 'codePath': status_data.get('codePath', '')})}\n\n"
                        break

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

            await asyncio.sleep(1)
            retry_count += 1

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(log_generator(), media_type="text/event-stream")

@app.get("/api/tasks")
async def list_tasks():
    try:
        async with httpx.AsyncClient(timeout=30.0, proxies=HTTPX_PROXIES) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/tasks")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/download/{task_id}")
async def download_code(task_id: str):
    """Zip the generated code directory and stream it to the browser"""
    try:
        async with httpx.AsyncClient(timeout=30.0, proxies=HTTPX_PROXIES) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/download/{task_id}")
            response.raise_for_status()
            data = response.json()

        code_path = data.get("codePath")
        if not code_path or not Path(code_path).exists():
            raise HTTPException(status_code=404, detail="Generated code directory not found")

        # Create ZIP in a temp directory
        tmp_dir = tempfile.mkdtemp()
        zip_base = os.path.join(tmp_dir, f"onlyspecs-{task_id}")
        zip_path = shutil.make_archive(zip_base, "zip", root_dir=str(Path(code_path).parent), base_dir=Path(code_path).name)

        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"onlyspecs-{task_id}.zip",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/open/{task_id}")
async def open_in_explorer(task_id: str):
    """Open the code directory in the system file manager"""
    try:
        async with httpx.AsyncClient(timeout=30.0, proxies=HTTPX_PROXIES) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/download/{task_id}")
            response.raise_for_status()
            data = response.json()

        code_path = data.get("codePath", "")
        if not code_path or not Path(code_path).exists():
            raise HTTPException(status_code=404, detail="Code directory not found")

        import subprocess
        # WSL2: use explorer.exe to open in Windows File Explorer
        # Convert Linux path to Windows path via wslpath
        result = subprocess.run(["wslpath", "-w", code_path], capture_output=True, text=True)
        if result.returncode == 0:
            win_path = result.stdout.strip()
            subprocess.Popen(["explorer.exe", win_path])
        else:
            subprocess.Popen(["xdg-open", code_path])
        return {"path": code_path, "message": "Opened in file manager"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
async def list_local_projects():
    """List all local project folders"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"

    if not workspace_base.exists():
        return {"projects": []}

    projects = []
    for task_dir in sorted(workspace_base.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if task_dir.is_dir() and task_dir.name.startswith("task_"):
            code_path = task_dir / "code_v0001"
            specs_path = task_dir / "specs_v0001.md"

            specs_content = ""
            output_type = "source"  # Default type

            if specs_path.exists():
                with open(specs_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    specs_content = content[:200]

                    # Detect output type from specs content
                    if "single-file HTML" in content or "browser" in content:
                        output_type = "web"
                    elif "desktop application" in content or "pygame" in content or "tkinter" in content:
                        output_type = "exe"
                    elif "Progressive Web App" in content or "PWA" in content:
                        output_type = "pwa"

            files = []
            if code_path.exists():
                files = [f.name for f in code_path.iterdir() if f.is_file()]

            projects.append({
                "taskId": task_dir.name,
                "path": str(task_dir),
                "codePath": str(code_path) if code_path.exists() else None,
                "specsPreview": specs_content,
                "files": files,
                "createdAt": task_dir.stat().st_mtime,
                "outputType": output_type
            })

    return {"projects": projects}

@app.delete("/api/projects/{task_id}")
async def delete_project(task_id: str):
    """Delete a local project folder"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
    task_dir = workspace_base / task_id

    if not task_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        shutil.rmtree(task_dir)
        return {"message": "Project deleted successfully", "taskId": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{task_id}/download")
async def download_project(task_id: str):
    """Download a local project as ZIP"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
    task_dir = workspace_base / task_id
    code_path = task_dir / "code_v0001"

    if not code_path.exists():
        raise HTTPException(status_code=404, detail="Project code not found")

    tmp_dir = tempfile.mkdtemp()
    zip_base = os.path.join(tmp_dir, f"onlyspecs-{task_id}")
    zip_path = shutil.make_archive(zip_base, "zip", root_dir=str(code_path.parent), base_dir=code_path.name)

    return FileResponse(zip_path, media_type="application/zip", filename=f"{task_id}.zip")

@app.get("/api/projects/{task_id}/open")
async def open_project(task_id: str):
    """Open project folder in file manager"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
    code_path = workspace_base / task_id / "code_v0001"

    if not code_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    import subprocess
    result = subprocess.run(["wslpath", "-w", str(code_path)], capture_output=True, text=True)
    if result.returncode == 0:
        win_path = result.stdout.strip()
        subprocess.Popen(["explorer.exe", win_path])
    else:
        subprocess.Popen(["xdg-open", str(code_path)])

    return {"path": str(code_path), "message": "Opened in file manager"}

@app.post("/api/package/{task_id}")
async def package_to_exe(task_id: str):
    """Generate packaging instructions for Windows"""
    try:
        workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
        task_dir = workspace_base / task_id
        code_path = task_dir / "code_v0001"

        if not code_path.exists():
            raise HTTPException(status_code=404, detail="代码目录不存在")

        py_files = list(code_path.glob("*.py"))
        if not py_files:
            raise HTTPException(status_code=400, detail="未找到Python文件")

        main_file = py_files[0]

        # Create packaging instructions
        instructions = f"""# Windows 打包说明

## 方法 1：使用 PyInstaller（推荐）

1. 在 Windows 上安装 Python 3.10+
2. 打开命令提示符，运行：
   ```
   pip install pyinstaller
   cd {code_path}
   pyinstaller --onefile --noconsole {main_file.name}
   ```
3. 生成的 .exe 在 dist 文件夹中

## 方法 2：使用 auto-py-to-exe（图形界面）

1. 安装：`pip install auto-py-to-exe`
2. 运行：`auto-py-to-exe`
3. 选择脚本文件：{main_file.name}
4. 选择 "One File" 和 "Window Based"
5. 点击 "CONVERT .PY TO .EXE"

打包时间：约 30-60 秒
"""

        instructions_path = code_path / "打包说明.txt"
        instructions_path.write_text(instructions, encoding='utf-8')

        return {
            "exePath": str(instructions_path),
            "message": "已生成打包说明文件，请在 Windows 上按说明操作"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"错误: {str(e)}")

@app.get("/api/download-exe/{task_id}")
async def download_exe(task_id: str):
    """Download the packaging instructions file"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
    task_dir = workspace_base / task_id
    code_path = task_dir / "code_v0001"

    instructions_path = code_path / "打包说明.txt"

    if not instructions_path.exists():
        raise HTTPException(status_code=404, detail="打包说明文件不存在")

    return FileResponse(instructions_path, media_type="text/plain", filename="打包说明.txt")

@app.get("/api/projects/{task_id}/files")
async def get_project_files(task_id: str):
    """Get all files in a project with their content"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
    code_path = workspace_base / task_id / "code_v0001"

    if not code_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    files = []
    for file_path in code_path.rglob("*"):
        if file_path.is_file():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                files.append({
                    "name": file_path.name,
                    "path": str(file_path.relative_to(code_path)),
                    "content": content,
                    "size": file_path.stat().st_size
                })
            except:
                pass  # Skip binary files

    return {"files": files}

@app.get("/api/projects/{task_id}/preview")
async def preview_project(task_id: str):
    """Serve HTML file for preview"""
    workspace_base = Path.home() / "Documents" / "OnlySpecs" / "api-workspaces"
    code_path = workspace_base / task_id / "code_v0001"

    if not code_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    # Find HTML file
    html_files = list(code_path.glob("*.html"))
    if not html_files:
        raise HTTPException(status_code=404, detail="No HTML file found")

    return FileResponse(html_files[0], media_type="text/html")

# Mount static files (frontend)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "9000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
