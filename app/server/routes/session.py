"""Handler for /api/session endpoint."""

import os
from ..utils.jsonl import load_jsonl_file
from ..utils.security import validate_session_path

def handle(handler, params):
    """Load a session file."""
    project = params.get('project')
    session_id = params.get('sessionId')
    
    if not project or not session_id:
        handler.send_error_json(400, "Missing required parameters")
        return
    
    path = validate_session_path(project, session_id)
    if not path:
        handler.send_error_json(404, "Session not found")
        return
    
    # Expand path to absolute for client display
    absolute_path = os.path.abspath(os.path.expanduser(path))
    
    events, errors = load_jsonl_file(path)
    handler.send_json({
        'sessionId': session_id,
        'project': project,
        'path': absolute_path,
        'events': events,
        'errors': errors
    })
