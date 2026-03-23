"""Cloud service wrapper for OSS and FC integration"""
import os
import sys
import json
import importlib.util
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# Load url-generate modules dynamically (directory has hyphen)
_base = Path(__file__).parent.parent / "url-generate"

# Load models first
_models_spec = importlib.util.spec_from_file_location("models", _base / "models.py")
_models = importlib.util.module_from_spec(_models_spec)
sys.modules["models"] = _models
_models_spec.loader.exec_module(_models)

# Load oss_service (depends on models)
_oss_spec = importlib.util.spec_from_file_location("url_gen_oss", _base / "services" / "oss_service.py")
_oss = importlib.util.module_from_spec(_oss_spec)
_oss_spec.loader.exec_module(_oss)

# Load fc_service
_fc_spec = importlib.util.spec_from_file_location("url_gen_fc", _base / "services" / "fc_service.py")
_fc = importlib.util.module_from_spec(_fc_spec)
_fc_spec.loader.exec_module(_fc)

def is_cloud_configured() -> bool:
    """Check if cloud credentials are configured"""
    required = ["OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET", "OSS_BUCKET_NAME", "OSS_ENDPOINT"]
    return all(os.getenv(key) for key in required)

async def upload_project_to_cloud(task_id: str, workspace_base: Path) -> Dict:
    """Upload local project files to OSS"""
    if not is_cloud_configured():
        raise HTTPException(status_code=503, detail="Cloud not configured. Please set OSS credentials in .env")

    task_dir = workspace_base / task_id
    code_dir = task_dir / "code_v0001"

    if not code_dir.exists():
        raise HTTPException(status_code=404, detail=f"Code directory not found: {code_dir}")

    # Read all text files
    files = []
    text_extensions = {'.html', '.css', '.js', '.py', '.md', '.txt', '.json', '.yaml', '.yml'}

    for file_path in code_dir.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in text_extensions:
            try:
                content = file_path.read_text(encoding='utf-8')
                rel_path = str(file_path.relative_to(code_dir))
                files.append(_models.SaveFileItem(path=rel_path, content=content))
            except Exception:
                pass

    if not files:
        raise HTTPException(status_code=400, detail="No text files found to upload")

    # Upload to OSS
    project_id = f"proj-{task_id.replace('task_', '')}"
    result = await _oss.save_project(files, project_id=project_id)

    # Save metadata
    metadata = {
        "project_id": project_id,
        "task_id": task_id,
        "uploaded_at": datetime.utcnow().isoformat(),
        "file_count": len(files),
        "preview_url": result.preview_url
    }
    metadata_path = task_dir / "cloud_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding='utf-8')

    return metadata

async def deploy_to_fc(project_id: str, template: str = "base-node18") -> Dict:
    """Create FC container for project preview"""
    if not is_cloud_configured():
        raise HTTPException(status_code=503, detail="Cloud not configured")

    result = await _fc.create_project_function(project_id, template)
    return result


async def delete_fc_deployment(project_id: str) -> bool:
    """Delete FC container"""
    if not is_cloud_configured():
        raise HTTPException(status_code=503, detail="Cloud not configured")

    return await _fc.delete_project_function(project_id)


def get_cloud_metadata(task_id: str, workspace_base: Path) -> Optional[Dict]:
    """Get cloud metadata for a task"""
    metadata_path = workspace_base / task_id / "cloud_metadata.json"
    if not metadata_path.exists():
        return None

    return json.loads(metadata_path.read_text(encoding='utf-8'))
