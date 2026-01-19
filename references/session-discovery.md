# Session Discovery Reference

Finding, searching, and listing Claude sessions across projects.

## Session Location Structure

All Claude sessions are stored in:
```
~/.claude/projects/
```

Each project has its own directory with normalized path names.

### Session Index File

Claude maintains a `sessions-index.json` file in each project directory that contains metadata for all sessions:
```
~/.claude/projects/<project-name>/sessions-index.json
```

**Warning:** This file can become very large (25,000+ tokens) and **should not be read directly** using the Read tool. Instead, use one of these strategies:

#### Strategy 1: Use jq to extract data (Preferred)
```bash
# Get recent sessions with metadata
jq -r '.entries | sort_by(.fileMtime) | reverse | limit(10;.[]) | 
  "\(.modified) | \(.sessionId) | \(.firstPrompt[:80])"' \
  ~/.claude/projects/<project-name>/sessions-index.json

# Get session by ID
jq -r '.entries[] | select(.sessionId == "<session-id>")' \
  ~/.claude/projects/<project-name>/sessions-index.json

# Count total sessions
jq '.entries | length' ~/.claude/projects/<project-name>/sessions-index.json
```

#### Strategy 2: Read with offset/limit
If jq is not available, read the file in chunks:
```python
# Read first 100 lines to see structure
Read(path, offset=1, limit=100)

# Read next chunk if needed
Read(path, offset=101, limit=100)
```

#### Strategy 3: Grep for specific session IDs
```bash
grep -A 5 '"sessionId": "<session-id>"' \
  ~/.claude/projects/<project-name>/sessions-index.json
```

#### sessions-index.json Structure
```json
{
  "version": 1,
  "entries": [
    {
      "sessionId": "3c4ba832-9bb9-4f95-8eb8-aea4ec18c9f8",
      "fullPath": "/path/to/session.jsonl",
      "fileMtime": 1737190057203,
      "firstPrompt": "User's first message...",
      "messageCount": 67,
      "created": "2026-01-18T07:32:37.203Z",
      "modified": "2026-01-18T07:32:37.203Z",
      "gitBranch": "master",
      "projectPath": "/Users/name/project",
      "isSidechain": false
    }
  ]
}
```

**Key fields:**
- `entries[]` - Array of session metadata objects
- `sessionId` - Session identifier (UUID format)
- `fullPath` - Absolute path to session .jsonl file
- `modified` - Last modified timestamp (ISO 8601)
- `fileMtime` - Unix timestamp in milliseconds
- `firstPrompt` - First user message (useful for context preview)
- `messageCount` - Number of messages in session

## Project Directory Naming

**Normalization rule:** Replace `/` and `.` with `-`

```
/Users/john/Code/myproject     → Users-john-Code-myproject
/Users/jane/Sites/app.demo     → Users-jane-Sites-app-demo
/home/dev/workspace/test       → home-dev-workspace-test
```

**Reverse lookup:** Given a project directory name, cannot reliably reconstruct original path.

## Listing All Projects

```bash
ls -1 ~/.claude/projects/
```

Returns directory names like:
```
Users-john-Code-project-a
Users-john-Code-project-b
Users-jane-Sites-webapp
```

**Filtering by user:**
```bash
ls -1 ~/.claude/projects/ | grep "^Users-john"
```

## Finding Sessions for a Project

Given a project path:

```python
import os

def list_project_sessions(project_path):
    home = os.path.expanduser("~")
    normalized = project_path.replace('/', '-').replace('.', '-')
    project_dir = os.path.join(home, ".claude", "projects", normalized)
    
    if not os.path.exists(project_dir):
        return []
    
    sessions = []
    for filename in os.listdir(project_dir):
        if filename.endswith('.jsonl'):
            session_id = filename[:-6]  # Remove .jsonl
            sessions.append(session_id)
    
    return sessions
```

**Example:**
```python
sessions = list_project_sessions("/Users/john/Code/myapp")
# Returns: ["session-abc123", "session-xyz789", ...]
```

## Session Metadata Extraction

Extract metadata without loading entire session:

```python
import json
from datetime import datetime

def get_session_info(session_file):
    """Get basic info from first and last events."""
    
    with open(session_file, 'r') as f:
        lines = f.readlines()
    
    if not lines:
        return None
    
    # First event
    first = json.loads(lines[0])
    # Last event
    last = json.loads(lines[-1])
    
    return {
        "session_id": os.path.basename(session_file)[:-6],
        "start_time": first.get("timestamp"),
        "end_time": last.get("timestamp"),
        "event_count": len(lines),
        "has_errors": any("is_error" in line for line in lines),
        "has_subagents": any("agentId" in line for line in lines),
    }
```

## Searching Sessions by Content

Search for sessions containing specific text in user messages:

```python
import re

def search_sessions(project_path, query, case_sensitive=False):
    """Find sessions where user mentioned query."""
    
    sessions = list_project_sessions(project_path)
    matches = []
    
    flags = 0 if case_sensitive else re.IGNORECASE
    pattern = re.compile(query, flags)
    
    for session_id in sessions:
        session_file = get_session_file_path(project_path, session_id)
        
        with open(session_file, 'r') as f:
            for line in f:
                try:
                    event = json.loads(line)
                    if event.get("type") == "user":
                        content = extract_text_content(event)
                        if pattern.search(content):
                            matches.append(session_id)
                            break  # Found in this session, move to next
                except:
                    continue
    
    return matches

def extract_text_content(event):
    """Extract all text from event content."""
    content = event.get("message", {}).get("content", [])
    
    if isinstance(content, str):
        return content
    
    texts = []
    if isinstance(content, list):
        for item in content:
            if item.get("type") == "text":
                texts.append(item.get("text", ""))
    
    return " ".join(texts)
```

**Example:**
```python
# Find sessions where user mentioned "React component"
matches = search_sessions("/Users/john/Code/myapp", "React component")
# Returns: ["session-abc123", "session-def456"]
```

## Filtering by Date Range

Find sessions within a time period:

```python
from datetime import datetime, timedelta

def filter_sessions_by_date(project_path, start_date=None, end_date=None):
    """Filter sessions by date range."""
    
    sessions = list_project_sessions(project_path)
    filtered = []
    
    for session_id in sessions:
        session_file = get_session_file_path(project_path, session_id)
        info = get_session_info(session_file)
        
        if not info or not info["start_time"]:
            continue
        
        session_date = datetime.fromisoformat(info["start_time"].replace('Z', '+00:00'))
        
        if start_date and session_date < start_date:
            continue
        if end_date and session_date > end_date:
            continue
        
        filtered.append(session_id)
    
    return filtered
```

**Example:**
```python
# Sessions from last week
from datetime import datetime, timedelta
week_ago = datetime.now() - timedelta(days=7)
recent = filter_sessions_by_date("/Users/john/Code/myapp", start_date=week_ago)
```

## Finding Sessions with Sub-Agents

Identify sessions that used delegation:

```python
def find_sessions_with_subagents(project_path):
    """Find sessions that delegated to sub-agents."""
    
    sessions = list_project_sessions(project_path)
    with_agents = []
    
    for session_id in sessions:
        session_file = get_session_file_path(project_path, session_id)
        
        # Check for subagent directory
        home = os.path.expanduser("~")
        normalized = project_path.replace('/', '-').replace('.', '-')
        subagent_dir = os.path.join(
            home, ".claude", "projects", normalized, session_id, "subagents"
        )
        
        if os.path.exists(subagent_dir) and os.listdir(subagent_dir):
            with_agents.append(session_id)
    
    return with_agents
```

## Listing All Sessions (Global)

Find sessions across all projects:

```python
def list_all_sessions():
    """List all sessions across all projects."""
    
    home = os.path.expanduser("~")
    projects_dir = os.path.join(home, ".claude", "projects")
    
    all_sessions = []
    
    for project_name in os.listdir(projects_dir):
        project_dir = os.path.join(projects_dir, project_name)
        
        if not os.path.isdir(project_dir):
            continue
        
        for filename in os.listdir(project_dir):
            if filename.endswith('.jsonl'):
                session_id = filename[:-6]
                all_sessions.append({
                    "project": project_name,
                    "session_id": session_id,
                    "path": os.path.join(project_dir, filename)
                })
    
    return all_sessions
```

**Example output:**
```python
[
    {
        "project": "Users-john-Code-myapp",
        "session_id": "session-abc123",
        "path": "~/.claude/projects/Users-john-Code-myapp/session-abc123.jsonl"
    },
    ...
]
```

## Session Statistics

Get aggregate statistics:

```python
def get_session_statistics(project_path):
    """Calculate statistics for project sessions."""
    
    sessions = list_project_sessions(project_path)
    stats = {
        "total_sessions": len(sessions),
        "total_events": 0,
        "sessions_with_errors": 0,
        "sessions_with_subagents": 0,
        "avg_events_per_session": 0,
        "date_range": None
    }
    
    dates = []
    
    for session_id in sessions:
        session_file = get_session_file_path(project_path, session_id)
        info = get_session_info(session_file)
        
        if info:
            stats["total_events"] += info["event_count"]
            if info["has_errors"]:
                stats["sessions_with_errors"] += 1
            if info["has_subagents"]:
                stats["sessions_with_subagents"] += 1
            
            if info["start_time"]:
                dates.append(info["start_time"])
    
    if stats["total_sessions"] > 0:
        stats["avg_events_per_session"] = stats["total_events"] / stats["total_sessions"]
    
    if dates:
        dates.sort()
        stats["date_range"] = {
            "earliest": dates[0],
            "latest": dates[-1]
        }
    
    return stats
```

**Example output:**
```python
{
    "total_sessions": 47,
    "total_events": 2341,
    "sessions_with_errors": 3,
    "sessions_with_subagents": 12,
    "avg_events_per_session": 49.8,
    "date_range": {
        "earliest": "2026-01-01T10:00:00.000Z",
        "latest": "2026-01-17T20:31:59.197Z"
    }
}
```

## Interactive Selection

Present sessions to user for selection:

```python
def interactive_session_picker(project_path):
    """Let user pick from available sessions."""
    
    sessions = list_project_sessions(project_path)
    
    if not sessions:
        print("No sessions found for this project.")
        return None
    
    print(f"\nFound {len(sessions)} sessions:")
    print()
    
    for i, session_id in enumerate(sessions, 1):
        session_file = get_session_file_path(project_path, session_id)
        info = get_session_info(session_file)
        
        timestamp = info["start_time"] if info else "Unknown"
        event_count = info["event_count"] if info else "?"
        
        print(f"{i}. {session_id}")
        print(f"   Started: {timestamp}")
        print(f"   Events: {event_count}")
        
        if info and info["has_subagents"]:
            print(f"   🤖 Has sub-agents")
        if info and info["has_errors"]:
            print(f"   ⚠️  Contains errors")
        print()
    
    # User would select a number
    # Return selected session_id
```

### User Selection Patterns

Users can select sessions in various natural ways:

**By number:**
- "show #1"
- "the first one"
- "number 3"
- "show session 2"

**By description:**
- "the most recent"
- "the one with errors"
- "the session with sub-agents"
- "the longest one" (highest event count)

**By time:**
- "the one from this morning"
- "yesterday's session"
- "the one at 2pm"

**Parse user response:**
```python
def parse_selection(user_input, session_list):
    """Parse user selection from natural language."""
    
    # Number patterns
    num_match = re.search(r'#?(\d+)', user_input)
    if num_match:
        index = int(num_match.group(1)) - 1
        if 0 <= index < len(session_list):
            return session_list[index]
    
    # Keywords
    lower = user_input.lower()
    
    if "recent" in lower or "latest" in lower or "last" in lower:
        return session_list[0]  # Most recent
    
    if "error" in lower:
        for session in session_list:
            if session["info"].get("has_errors"):
                return session
    
    if "sub" in lower or "agent" in lower or "delegation" in lower:
        for session in session_list:
            if session["info"].get("has_subagents"):
                return session
    
    if "long" in lower or "big" in lower:
        # Return session with most events
        return max(session_list, key=lambda s: s["info"].get("event_count", 0))
    
    return None
```

### Compact Display Format

For better readability in conversation:

```python
def display_sessions_compact(session_data):
    """Display sessions in compact format."""
    
    print(f"Found {len(session_data)} recent sessions:\n")
    
    for i, session in enumerate(session_data, 1):
        info = session["info"]
        
        # One line per session
        timestamp = format_timestamp(info["start_time"]) if info else "Unknown"
        events = info.get("event_count", "?") if info else "?"
        
        # Flags
        flags = []
        if info and info.get("has_subagents"):
            flags.append("🤖")
        if info and info.get("has_errors"):
            flags.append("⚠️")
        
        flag_str = " ".join(flags) if flags else ""
        
        print(f"{i}. {timestamp} | {events} events {flag_str}")
    
    print("\nWhich session would you like to review?")
```

**Example output:**
```
Found 5 recent sessions:

1. 2026-01-18 14:23:45 | 67 events 🤖
2. 2026-01-18 09:15:20 | 143 events ⚠️
3. 2026-01-17 20:31:59 | 89 events
4. 2026-01-17 15:42:10 | 34 events
5. 2026-01-17 11:20:33 | 156 events 🤖

Which session would you like to review?
```

## Recent Sessions (Quick Access)

Get most recent sessions for quick access:

```python
def get_recent_sessions(project_path, limit=10):
    """Get most recent sessions sorted by date."""
    
    sessions = list_project_sessions(project_path)
    session_data = []
    
    for session_id in sessions:
        session_file = get_session_file_path(project_path, session_id)
        info = get_session_info(session_file)
        
        if info and info["start_time"]:
            session_data.append({
                "session_id": session_id,
                "start_time": info["start_time"],
                "info": info
            })
    
    # Sort by start_time descending
    session_data.sort(key=lambda x: x["start_time"], reverse=True)
    
    return session_data[:limit]
```

**Example:**
```python
recent = get_recent_sessions("/Users/john/Code/myapp", limit=5)
for session in recent:
    print(f"{session['session_id']} - {session['start_time']}")
```

### Efficient Discovery Using sessions-index.json

The fastest way to discover recent sessions is using `jq` with the index file:

```bash
# Get 15 most recent sessions with context
jq -r '.entries | sort_by(.fileMtime) | reverse | limit(15;.[]) | 
  "\(.modified) | \(.id) | \(.firstPrompt[:80])"' \
  ~/.claude/projects/<project-name>/sessions-index.json
```

**Output format:**
```
2026-01-18T07:32:37.203Z | 471c8333-a6d5-4c46-8c03-7944674b2fd6 | show recent sessions
2026-01-18T06:06:39.720Z | 85a58f19-8a40-461c-8145-d4cd1bc442ae | summarize this youtube...
2026-01-18T05:58:27.035Z | b6488565-5a54-44d2-b0be-55327668b2d3 | summarize this youtube...
```

**Parse the output:**
```python
import subprocess
import re

def discover_sessions_fast(project_path, limit=15):
    """Fast session discovery using jq and sessions-index.json."""
    
    home = os.path.expanduser("~")
    normalized = project_path.replace('/', '-').replace('.', '-')
    index_file = os.path.join(home, ".claude", "projects", normalized, "sessions-index.json")
    
    if not os.path.exists(index_file):
        # Fallback to directory listing
        return discover_sessions_fallback(project_path, limit)
    
    try:
        result = subprocess.run([
            'jq', '-r',
            f'.entries | sort_by(.fileMtime) | reverse | limit({limit};.[]) | '
            '"\(.modified) | \(.sessionId) | \(.firstPrompt[:80])"',
            index_file
        ], capture_output=True, text=True, check=True, timeout=5)
        
        # Parse output
        sessions = []
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            
            parts = line.split(' | ', 2)
            if len(parts) >= 2:
                sessions.append({
                    'timestamp': parts[0],
                    'id': parts[1],
                    'context': parts[2] if len(parts) > 2 else ''
                })
        
        return sessions
    
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        # jq failed, use fallback
        return discover_sessions_fallback(project_path, limit)

def discover_sessions_fallback(project_path, limit=15):
    """Fallback: discover sessions using directory listing."""
    
    home = os.path.expanduser("~")
    normalized = project_path.replace('/', '-').replace('.', '-')
    project_dir = os.path.join(home, ".claude", "projects", normalized)
    
    if not os.path.exists(project_dir):
        return []
    
    try:
        # List .jsonl files by modification time
        result = subprocess.run([
            'bash', '-c',
            f'ls -lt "{project_dir}"/*.jsonl 2>/dev/null | head -{limit+1} | tail -n +2'
        ], capture_output=True, text=True, check=True, timeout=5)
        
        sessions = []
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            
            # Parse ls -lt output
            # Format: -rw------- 1 user group size date time filename
            parts = line.split()
            if len(parts) >= 9:
                filename = parts[-1]
                if filename.endswith('.jsonl'):
                    session_id = os.path.basename(filename)[:-6]
                    
                    # Reconstruct timestamp from ls output
                    date_parts = parts[5:8]  # Month Day Time/Year
                    timestamp = ' '.join(date_parts)
                    
                    sessions.append({
                        'timestamp': timestamp,
                        'id': session_id,
                        'context': ''  # Not available in ls output
                    })
        
        return sessions
    
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return []
```

**Usage:**
```python
# Fast discovery with context
sessions = discover_sessions_fast("/Users/john/Code/myapp", limit=10)

for i, session in enumerate(sessions, 1):
    print(f"{i}. {session['timestamp']}")
    print(f"   ID: {session['id']}")
    if session['context']:
        print(f"   Context: {session['context']}")
    print()
```

### Complete Discovery Workflow

Robust workflow that handles all edge cases:

```python
def discover_and_select_session(project_path, auto_select_recent=False):
    """
    Complete workflow for session discovery and selection.
    
    Args:
        project_path: Project directory path
        auto_select_recent: If True, auto-select most recent session
    
    Returns:
        Selected session ID or None
    """
    
    # Step 1: Try fast discovery with jq
    sessions = discover_sessions_fast(project_path, limit=15)
    
    if not sessions:
        print(f"No sessions found for project: {project_path}")
        return None
    
    # Step 2: Auto-select if requested
    if auto_select_recent:
        return sessions[0]['id']
    
    # Step 3: Display sessions for user selection
    print(f"Found {len(sessions)} recent sessions:\n")
    
    for i, session in enumerate(sessions, 1):
        print(f"{i}. {session['timestamp']}")
        if session['context']:
            # Show first 60 chars of context
            context = session['context'][:60]
            print(f"   {context}{'...' if len(session['context']) > 60 else ''}")
        print()
    
    print("Which session would you like to review?")
    print("(Say a number, 'first one', 'most recent', etc.)")
    
    # Return list for user to select from
    return sessions

# Usage examples:

# Auto-select most recent
session_id = discover_and_select_session("/Users/john/Code/myapp", auto_select_recent=True)

# Let user select
sessions = discover_and_select_session("/Users/john/Code/myapp")
# ... wait for user input, then:
selected = sessions[0]  # or based on user input
```

## Handling Missing Projects

Gracefully handle cases where project doesn't exist:

```python
def safe_project_lookup(project_path):
    """Safely check if project has sessions."""
    
    home = os.path.expanduser("~")
    normalized = project_path.replace('/', '-').replace('.', '-')
    project_dir = os.path.join(home, ".claude", "projects", normalized)
    
    if not os.path.exists(project_dir):
        return {
            "exists": False,
            "message": f"No Claude sessions found for project: {project_path}",
            "suggestion": "This project may not have any recorded sessions yet, or the path may be incorrect."
        }
    
    sessions = list_project_sessions(project_path)
    
    if not sessions:
        return {
            "exists": True,
            "message": f"Project directory exists but contains no sessions: {project_path}",
            "suggestion": "Sessions may have been cleaned up or not yet created."
        }
    
    return {
        "exists": True,
        "sessions": sessions
    }
```

## Fuzzy Project Matching

Help users when they don't know exact project path:

```python
def fuzzy_find_project(partial_path):
    """Find projects matching partial path."""
    
    home = os.path.expanduser("~")
    projects_dir = os.path.join(home, ".claude", "projects")
    
    # Normalize the search term
    search_term = partial_path.lower().replace('/', '-').replace('.', '-')
    
    matches = []
    for project_name in os.listdir(projects_dir):
        if search_term in project_name.lower():
            matches.append(project_name)
    
    return matches
```

**Example:**
```python
# User remembers "myapp" but not full path
matches = fuzzy_find_project("myapp")
# Returns: ["Users-john-Code-myapp", "Users-jane-Sites-myapp-demo"]
```

## Performance Tips

**For large projects with many sessions:**

1. **Cache session info:** Build index file with metadata
2. **Limit event scanning:** Only read first/last events for quick info
3. **Use generators:** Don't load all sessions into memory
4. **Background indexing:** Build search index asynchronously

**Example caching:**
```python
import pickle

def build_session_index(project_path, cache_file=".session_index.pkl"):
    """Build and cache session metadata."""
    
    sessions = list_project_sessions(project_path)
    index = {}
    
    for session_id in sessions:
        session_file = get_session_file_path(project_path, session_id)
        index[session_id] = get_session_info(session_file)
    
    with open(cache_file, 'wb') as f:
        pickle.dump(index, f)
    
    return index

def load_session_index(cache_file=".session_index.pkl"):
    """Load cached index."""
    
    if not os.path.exists(cache_file):
        return None
    
    with open(cache_file, 'rb') as f:
        return pickle.load(f)
```
