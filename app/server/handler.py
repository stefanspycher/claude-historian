"""
Main HTTP request handler.
Routes requests to appropriate handlers.
"""

import http.server
import urllib.parse
import json
from .routes import projects, sessions, session, subagent, agents

class SessionViewerHandler(http.server.SimpleHTTPRequestHandler):
    """Main request handler with API routing."""
    
    # Route mapping
    ROUTES = {
        'projects': projects.handle,
        'sessions': sessions.handle,
        'session': session.handle,
        'subagent': subagent.handle,
        'agents': agents.handle,
        'health': lambda h, p: h.send_json({'status': 'ok'})
    }
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path.startswith('/api/'):
            self.handle_api(parsed)
        else:
            super().do_GET()
    
    def handle_api(self, parsed):
        endpoint = parsed.path[5:]  # Remove '/api/'
        params = urllib.parse.parse_qs(parsed.query)
        
        # Flatten single-value params
        params = {k: v[0] if len(v) == 1 else v for k, v in params.items()}
        
        handler = self.ROUTES.get(endpoint)
        if handler:
            try:
                handler(self, params)
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_error_json(500, str(e))
        else:
            self.send_error_json(404, f"Unknown endpoint: {endpoint}")
    
    def send_json(self, data, status=200):
        """Send JSON response."""
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)
    
    def send_error_json(self, status, message, code=None):
        """Send error as JSON."""
        self.send_json({
            'error': message,
            'code': code or f'ERROR_{status}'
        }, status)
