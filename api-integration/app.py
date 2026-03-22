import asyncio
import json
import os
import re
from typing import AsyncGenerator, Optional
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

def strip_ansi_codes(text: str) -> str:
    """Remove ANSI escape codes from text"""
    return ANSI_ESCAPE_PATTERN.sub('', text)

app = FastAPI(title="OnlySpecs Frontend Integration")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OnlySpecs API configuration
ONLYSPECS_API_URL = os.getenv("ONLYSPECS_API_URL", "http://localhost:3580")
API_TIMEOUT = 300.0  # 5 minutes

# Request/Response models
class GenerateRequest(BaseModel):
    prompt: str

class GenerateResponse(BaseModel):
    task_id: str
    status: str
    message: str

# API endpoints
@app.post("/api/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest):
    """Create a new code generation task"""
    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            response = await client.post(
                f"{ONLYSPECS_API_URL}/generate",
                json={"prompt": request.prompt}
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
    """Get the status of a generation task"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/status/{task_id}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/logs/{task_id}")
async def stream_logs(task_id: str):
    """Stream task logs using Server-Sent Events"""
    async def log_generator() -> AsyncGenerator[str, None]:
        last_log_count = 0
        max_retries = 180  # 3 minutes with 1 second intervals
        retry_count = 0

        while retry_count < max_retries:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Get logs from /logs endpoint
                    logs_response = await client.get(
                        f"{ONLYSPECS_API_URL}/logs/{task_id}"
                    )
                    logs_response.raise_for_status()
                    logs_data = logs_response.json()
                    logs = logs_data.get("logs", [])

                    # Get status
                    status_response = await client.get(
                        f"{ONLYSPECS_API_URL}/status/{task_id}"
                    )
                    status_response.raise_for_status()
                    status_data = status_response.json()

                    # Send new logs (strip ANSI codes)
                    if len(logs) > last_log_count:
                        for log in logs[last_log_count:]:
                            clean_log = strip_ansi_codes(log)
                            yield f"data: {json.dumps({'type': 'log', 'content': clean_log})}\n\n"
                        last_log_count = len(logs)

                    # Check if task is complete
                    status = status_data.get("status")
                    if status in ["completed", "failed"]:
                        yield f"data: {json.dumps({'type': 'status', 'status': status})}\n\n"
                        break

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

            await asyncio.sleep(1)
            retry_count += 1

        # Send completion message
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(log_generator(), media_type="text/event-stream")

@app.get("/api/tasks")
async def list_tasks():
    """List all generation tasks"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/tasks")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

@app.get("/api/download/{task_id}")
async def download_code(task_id: str):
    """Download generated code as a zip file"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{ONLYSPECS_API_URL}/download/{task_id}")
            response.raise_for_status()

            # Save to temporary file and return
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            return FileResponse(
                tmp_path,
                media_type="application/zip",
                filename=f"onlyspecs-{task_id}.zip"
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")

# Mount static files (frontend)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "9000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
