#!/bin/bash
# Quick start script for the session viewer

echo "🚀 Starting Claude Session Viewer..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3 to run the viewer"
    exit 1
fi

# Start the server
cd "$(dirname "$0")"
python3 serve.py
