"""Session discovery utilities."""

import os
import json
import subprocess
from datetime import datetime

def get_projects_dir():
    """Get projects directory path."""
    return os.path.expanduser("~/.claude/projects")

def list_project_directories(projects_dir):
    """List all project directories with metadata."""
    projects = []
    
    for name in os.listdir(projects_dir):
        path = os.path.join(projects_dir, name)
        if not os.path.isdir(path):
            continue
        
        # Count sessions
        try:
            session_count = len([f for f in os.listdir(path) if f.endswith('.jsonl')])
        except (OSError, PermissionError):
            session_count = 0
        
        # Get modification time
        try:
            mtime = os.path.getmtime(path)
            last_modified = datetime.fromtimestamp(mtime).isoformat() + 'Z'
        except OSError:
            last_modified = datetime.now().isoformat() + 'Z'
        
        projects.append({
            'name': name,
            'path': path,
            'sessionCount': session_count,
            'lastModified': last_modified
        })
    
    # Sort by last modified
    projects.sort(key=lambda p: p['lastModified'], reverse=True)
    return projects

def list_sessions_for_project(project_name, limit=50):
    """List sessions for a project using index or fallback."""
    projects_dir = get_projects_dir()
    project_path = os.path.join(projects_dir, project_name)
    
    if not os.path.exists(project_path):
        return []
    
    index_path = os.path.join(project_path, 'sessions-index.json')
    
    # Try sessions-index.json first
    if os.path.exists(index_path):
        sessions = load_sessions_from_index(index_path, limit)
        if sessions is not None:
            return sessions
    
    # Fallback to directory listing
    return list_sessions_from_directory(project_path, limit)

def load_sessions_from_index(index_path, limit):
    """Load sessions from sessions-index.json using jq."""
    try:
        cmd = [
            'jq', '-r',
            f'.entries | sort_by(.fileMtime) | reverse | limit({limit};.[]) | '
            '@json',
            index_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        
        if result.returncode != 0:
            return None
        
        sessions = []
        for line in result.stdout.strip().split('\n'):
            if line:
                entry = json.loads(line)
                sessions.append({
                    'sessionId': entry.get('sessionId'),
                    'timestamp': entry.get('modified'),
                    'firstPrompt': entry.get('firstPrompt', '')[:100],
                    'messageCount': entry.get('messageCount', 0),
                    'hasSubAgents': False,  # Would need to check subagents dir
                    'hasErrors': False
                })
        
        return sessions
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        return None

def list_sessions_from_directory(project_path, limit):
    """Fallback: list sessions from directory."""
    sessions = []
    
    try:
        for filename in os.listdir(project_path):
            if not filename.endswith('.jsonl'):
                continue
            
            session_id = filename[:-6]
            file_path = os.path.join(project_path, filename)
            
            try:
                mtime = os.path.getmtime(file_path)
                timestamp = datetime.fromtimestamp(mtime).isoformat() + 'Z'
            except OSError:
                timestamp = datetime.now().isoformat() + 'Z'
            
            sessions.append({
                'sessionId': session_id,
                'timestamp': timestamp,
                'firstPrompt': '',
                'messageCount': 0,
                'hasSubAgents': False,
                'hasErrors': False
            })
    except (OSError, PermissionError):
        return []
    
    # Sort by timestamp descending
    sessions.sort(key=lambda s: s['timestamp'], reverse=True)
    return sessions[:limit]
