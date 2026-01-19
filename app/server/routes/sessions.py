"""Handler for /api/sessions endpoint."""

from ..utils.discovery import list_sessions_for_project

def handle(handler, params):
    """List sessions for a project."""
    project = params.get('project')
    limit = int(params.get('limit', 50))
    
    if not project:
        handler.send_error_json(400, "Missing 'project' parameter")
        return
    
    sessions = list_sessions_for_project(project, limit)
    handler.send_json({
        'project': project,
        'sessions': sessions
    })
