#!/usr/bin/env python3
"""
Session Viewer Server - Entry Point
Modular HTTP server for the Claude Session Viewer.
"""

import os
import sys

# Add server directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.handler import SessionViewerHandler
from http.server import HTTPServer

PORT = int(os.environ.get('PORT', 8000))

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    server = HTTPServer(('', PORT), SessionViewerHandler)
    print(f"✅ Server running at http://localhost:{PORT}/")
    print(f"📂 Serving files from: {os.getcwd()}")
    print(f"🌐 Open http://localhost:{PORT}/index.html in your browser")
    print(f"\nPress Ctrl+C to stop the server")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")

if __name__ == '__main__':
    main()
