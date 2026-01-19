"""Handler for /api/projects endpoint."""

import os
from ..utils.discovery import get_projects_dir, list_project_directories

def handle(handler, params):
    """List all projects."""
    projects_dir = get_projects_dir()
    
    if not os.path.exists(projects_dir):
        handler.send_json({'projects': []})
        return
    
    projects = list_project_directories(projects_dir)
    handler.send_json({'projects': projects})
