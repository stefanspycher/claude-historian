# Usage Guide

## Starting the Application

### Option 1: Quick Start Script
```bash
cd app
./start.sh
```

### Option 2: Manual Start
```bash
cd app
python3 serve.py
```

The server will start on `http://localhost:8000`

## Browsing Sessions

### 1. Initial View
When you open the app, you'll see:
- **Recent Sessions**: Previously viewed sessions for quick access
- **Project Browser**: Dropdown to select a project

### 2. Select a Project
1. Click the project dropdown
2. Choose a project (shows session count)
3. Sessions for that project will load automatically

### 3. Select a Session
1. Click on a session in the list
2. Session will be highlighted
3. Click "Load Session" button

## Viewing a Session

### Header
The session header displays:
- **Session ID**: Full UUID (clickable)
  - Click the session ID to view **Session Files Modal**
  - Shows all files loaded, missing, and failed during session loading
- **Model**: Claude model used (e.g., claude-sonnet-4)
- **Timestamp**: When the session was created

### Session Files Modal
Click the session ID to see detailed file tracking:
- **✓ Loaded Files** (green): Successfully loaded files
  - Main session file
  - All sub-agent files that loaded
  - Shows full file paths
- **⚠ Missing Files** (yellow): Files that should exist but don't
  - Sub-agent files where agentId was detected but file not found
  - Shows expected path and which node triggered it
- **✗ Failed Files** (red): Files that failed to load
  - Network errors, permission issues, etc.
  - Shows error messages
- **Copy Button**: Click 📋 to copy any file path to clipboard

### Tree View (Left Panel)
- **Expand/Collapse**: Click the arrow (▶/▼) next to nodes with children
- **Select Node**: Click on any node to see details
- **Node Colors**:
  - 🔵 Blue = User messages
  - 🟢 Green = Claude responses
  - 🟡 Orange = Tool calls
  - 🟣 Purple = Sub-agents

### Detail Panel (Right Panel)
Shows detailed information for the selected node:
- **Metadata**: Timestamp, duration
- **Thinking**: Claude's internal reasoning (if available)
- **Content**: Full message content
- **Tool Details**: Input parameters and output results
- **Errors**: Error messages for failed operations

### Statistics Bar
Shows session metrics:
- Total nodes
- Tool calls count
- Sub-agents count
- Errors count
- Maximum depth
- Total tool execution time

## Using Controls

### Toolbar Controls

**Filter Dropdown**
- Filter by node type (All, User, Assistant, Tool Calls, Sub-agents)

**Thinking Toggle** (👁️)
- Show/hide thinking blocks in detail panel
- Active when enabled (green highlight)

**Expand All**
- Expands all nodes in the tree

**Collapse All**
- Collapses all nodes in the tree

**Search Box**
- Type to search node content
- Searches across all text, tool inputs/outputs
- Results update automatically (300ms debounce)

### Exporting Sessions

1. Click "Export" button in header
2. Choose format:
   - **Markdown**: Full markdown with code blocks
   - **HTML**: Styled HTML page
3. Optional: Check "Exclude thinking blocks"
4. Click "Download"
5. File saves to your Downloads folder

## Keyboard Shortcuts (Future)

Will be added in future version:
- `Cmd/Ctrl + F`: Focus search
- `Cmd/Ctrl + E`: Export
- `Escape`: Close session
- `Space`: Expand/collapse selected node

## Understanding the Tree Structure

### Hierarchy
```
User Message
└── Assistant Response
    ├── Tool Call 1
    │   └── Sub-Agent (if delegated)
    │       └── (Sub-agent's own tree)
    ├── Tool Call 2
    └── Follow-up Assistant Message
```

### Node Types

**User** (Blue)
- User's messages and questions
- Contains assistant responses as children

**Assistant** (Green)
- Claude's responses
- May include thinking blocks
- Contains tool calls as children

**Tool Call** (Orange)
- Tool execution (Read, Write, Shell, etc.)
- Shows input parameters and output
- May have sub-agents as children
- Can have recovery tool calls as children (if error occurred)

**Sub-Agent** (Purple)
- Delegated tasks (Plan mode, Debug mode, etc.)
- Contains its own message tree
- Can be nested (sub-agents can have sub-agents)

## Troubleshooting

### Server Won't Start
- Check Python 3 is installed: `python3 --version`
- Check port 8000 is available: `lsof -i :8000`
- Try different port: `PORT=8001 python3 serve.py`

### No Projects Showing
- Verify `~/.claude/projects/` directory exists
- Check you have Claude Code sessions recorded
- Check file permissions

### Session Won't Load
- Verify session file exists: `ls ~/.claude/projects/<project>/<session-id>.jsonl`
- Check browser console for errors (F12)
- Check server logs for errors

### Sub-Agents Not Loading
- Click the **session ID** to open the Session Files Modal
- Check the **Missing Files** section to see which sub-agent files are missing
- Verify sub-agent directory exists: `ls ~/.claude/projects/<project>/<session-id>/subagents/`
- Check browser console for 404 errors
- Sub-agents may not exist for all sessions

### Slow Performance
- Large sessions (1000+ events) may be slow
- Try filtering by type to reduce visible nodes
- Use search to find specific content
- Consider exporting instead of viewing in browser

## Tips

1. **Recent Sessions**: Use recent sessions list for quick access to frequently viewed sessions

2. **File Tracking**: Click the session ID to see all files loaded during session building
   - Useful for debugging missing sub-agents
   - Shows full file paths for manual inspection
   - Copy paths to clipboard for quick access

3. **Search**: Use search to quickly find specific tool calls, errors, or content

4. **Filters**: Use type filter to focus on specific aspects:
   - Tool Calls: See all file operations
   - Errors: Find all failed operations
   - Sub-agents: See delegated tasks

5. **Export**: Export sessions for:
   - Sharing with team (HTML)
   - Documentation (Markdown)
   - Archival purposes

6. **Thinking Blocks**: Toggle thinking visibility to focus on actions vs. reasoning

## Data Location

Sessions are stored at:
```
~/.claude/projects/<normalized-project-path>/<session-id>.jsonl
```

Sub-agents are stored at:
```
~/.claude/projects/<normalized-project-path>/<session-id>/subagents/agent-<agent-id>.jsonl
```

Project path normalization:
- `/Users/john/Code/app` → `Users-john-Code-app`
- Replace `/` and `.` with `-`
