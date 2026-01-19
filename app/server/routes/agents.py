"""Handler for /api/agents endpoint - Agent discovery using Approach A."""

import os
import re
import json
import glob
from ..utils.security import get_claude_dir, is_safe_path

def handle(handler, params):
    """Discover agents for a session by reading sessionId from agent files."""
    project = params.get('project')
    session_id = params.get('sessionId')
    
    if not all([project, session_id]):
        handler.send_error_json(400, "Missing required parameters: project, sessionId")
        return
    
    # Sanitize inputs
    project = os.path.basename(project)
    session_id = os.path.basename(session_id)
    
    project_path = os.path.join(get_claude_dir(), "projects", project)
    
    if not os.path.exists(project_path):
        handler.send_error_json(404, f"Project not found: {project}")
        return
    
    agents = discover_agents(project_path, session_id)
    
    handler.send_json({
        'sessionId': session_id,
        'project': project,
        'agents': agents
    })


def discover_agents(project_path, target_session_id):
    """
    Find all agents that reference the target session.
    
    Approach A: Read sessionId field from agent files to build relationships.
    Supports both flat (project root) and nested (session/subagents/) structures.
    """
    agents = []
    
    # 1. Check flat agents (in project root)
    flat_pattern = os.path.join(project_path, 'agent-*.jsonl')
    for agent_path in glob.glob(flat_pattern):
        if not is_safe_path(agent_path):
            continue
            
        agent_id = extract_agent_id_from_path(agent_path)
        if agent_id and session_references_match(agent_path, target_session_id):
            agents.append({
                'agentId': agent_id,
                'path': agent_path,
                'type': 'flat'
            })
    
    # 2. Check nested agents (in session/subagents/)
    subagents_dir = os.path.join(project_path, target_session_id, 'subagents')
    if os.path.exists(subagents_dir) and os.path.isdir(subagents_dir):
        nested_pattern = os.path.join(subagents_dir, 'agent-*.jsonl')
        for agent_path in glob.glob(nested_pattern):
            if not is_safe_path(agent_path):
                continue
                
            agent_id = extract_agent_id_from_path(agent_path)
            if agent_id:
                # Nested agents implicitly belong to this session by directory structure
                # But we still verify by checking sessionId in the file
                if session_references_match(agent_path, target_session_id):
                    agents.append({
                        'agentId': agent_id,
                        'path': agent_path,
                        'type': 'nested'
                    })
    
    return agents


def extract_agent_id_from_path(path):
    """Extract agent ID from filename like agent-a1b2c3d.jsonl"""
    filename = os.path.basename(path)
    match = re.match(r'^agent-([a-f0-9]{7})\.jsonl$', filename)
    return match.group(1) if match else None


def session_references_match(agent_path, target_session_id):
    """
    Check if an agent file references the target session.
    
    Reads the first few lines of the agent file to find sessionId fields.
    Returns True if any line contains a matching sessionId.
    """
    try:
        with open(agent_path, 'r', encoding='utf-8') as f:
            # Read first 10 lines (usually enough to find sessionId)
            for i, line in enumerate(f):
                if i >= 10:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    data = json.loads(line)
                    if data.get('sessionId') == target_session_id:
                        return True
                except json.JSONDecodeError:
                    continue
                    
    except (IOError, OSError) as e:
        print(f"Error reading agent file {agent_path}: {e}")
        
    return False
