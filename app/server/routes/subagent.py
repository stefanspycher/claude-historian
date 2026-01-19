"""Handler for /api/subagent endpoint."""

import os
from ..utils.jsonl import load_jsonl_file
from ..utils.security import validate_subagent_path, validate_agent_path

def handle(handler, params):
    """Load a sub-agent session file.
    
    Supports both flat and nested agent structures:
    - Flat: agent-*.jsonl in project root (type='flat')
    - Nested: session/subagents/agent-*.jsonl (type='nested', default)
    """
    project = params.get('project')
    session_id = params.get('sessionId')
    agent_id = params.get('agentId')
    agent_type = params.get('type', 'nested')  # 'flat' or 'nested'
    
    if not all([project, session_id, agent_id]):
        handler.send_error_json(400, "Missing required parameters")
        return
    
    # Try new validate_agent_path first (supports both types)
    path = validate_agent_path(project, agent_id, agent_type, session_id)
    
    # Fallback to legacy validate_subagent_path for backward compatibility
    if not path and agent_type == 'nested':
        path = validate_subagent_path(project, session_id, agent_id)
    
    if not path:
        handler.send_error_json(404, f"Agent not found: {agent_id} (type={agent_type})")
        return
    
    # Expand path to absolute for client display
    absolute_path = os.path.abspath(os.path.expanduser(path))
    
    events, errors = load_jsonl_file(path)
    handler.send_json({
        'agentId': agent_id,
        'sessionId': session_id,
        'project': project,
        'type': agent_type,
        'path': absolute_path,
        'events': events,
        'errors': errors
    })
