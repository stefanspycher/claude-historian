# Troubleshooting Reference

Common issues and solutions when working with Claude session files.

## Session Not Found

### Symptom
```
Error: Session file not found at ~/.claude/projects/Users-john-Code-app/session-abc123.jsonl
```

### Possible Causes

1. **Incorrect session ID**
   - User provided wrong ID
   - Copy-paste error (extra spaces, wrong case)

2. **Incorrect project path**
   - Path normalization mismatch
   - User working in different directory

3. **Session was deleted**
   - Manual cleanup
   - Automatic cleanup by Claude
   - Disk space recovery

4. **Project never had Claude sessions**
   - New project
   - Sessions created in different location

### Solutions

**1. Verify session ID:**
```python
# List available sessions
sessions = list_project_sessions(project_path)
print(f"Available sessions: {sessions}")

# Fuzzy match
from difflib import get_close_matches
matches = get_close_matches(session_id, sessions, n=3, cutoff=0.6)
if matches:
    print(f"Did you mean: {matches}")
```

**2. Verify project path:**
```python
# Show what we're looking for
normalized = normalize_project_path(project_path)
expected_dir = f"~/.claude/projects/{normalized}"
print(f"Looking in: {expected_dir}")

# Check if directory exists
if not os.path.exists(expected_dir):
    print(f"Directory not found. Looking for similar projects...")
    similar = fuzzy_find_project(os.path.basename(project_path))
    print(f"Similar projects: {similar}")
```

**3. Search across all projects:**
```python
# Maybe session exists in different project
all_sessions = list_all_sessions()
for s in all_sessions:
    if session_id in s["session_id"]:
        print(f"Found in project: {s['project']}")
        print(f"Path: {s['path']}")
```

---

## Token Limit Exceeded on sessions-index.json

### Symptom
```
Error: File content (25187 tokens) exceeds maximum allowed tokens (25000). 
Please use offset and limit parameters to read specific portions of the file.
```

### Cause

The `sessions-index.json` file grows over time as it tracks all sessions for a project. With many sessions, it can easily exceed the 25,000 token Read tool limit.

### Solutions

**DO NOT** use Read tool directly on `sessions-index.json`. Instead:

**Solution 1: Use jq to extract data (Recommended)**
```bash
# Get recent 15 sessions with timestamps and first prompt
jq -r '.entries | sort_by(.fileMtime) | reverse | limit(15;.[]) | 
  "\(.modified) | \(.sessionId) | \(.firstPrompt[:80])"' \
  ~/.claude/projects/<project-name>/sessions-index.json

# Get specific session by ID
jq -r '.entries[] | select(.sessionId == "<session-id>")' \
  ~/.claude/projects/<project-name>/sessions-index.json

# Get only session IDs for recent sessions
jq -r '.entries | sort_by(.fileMtime) | reverse | limit(10;.[]) | .sessionId' \
  ~/.claude/projects/<project-name>/sessions-index.json

# Count total sessions
jq '.entries | length' ~/.claude/projects/<project-name>/sessions-index.json

# Get sessions from today
jq -r '.entries[] | select(.modified | startswith("2026-01-18")) | 
  "\(.modified) | \(.sessionId)"' \
  ~/.claude/projects/<project-name>/sessions-index.json
```

**Solution 2: Read with offset/limit**
```python
# Read structure (first 50 lines)
Read(sessions_index_path, offset=1, limit=50)

# Continue reading in chunks
Read(sessions_index_path, offset=51, limit=50)
```

**Solution 3: Use grep for specific content**
```bash
# Find session by ID
grep -A 10 '"sessionId": "session-abc123"' \
  ~/.claude/projects/<project-name>/sessions-index.json

# Find sessions by content in first prompt
grep -B 2 -A 5 "authentication" \
  ~/.claude/projects/<project-name>/sessions-index.json
```

**Solution 4: Fallback to directory listing**

If `sessions-index.json` is unavailable or too complex, fall back to listing `.jsonl` files directly:

```bash
# List recent session files by modification time
ls -lt ~/.claude/projects/<project-name>/*.jsonl | head -20

# Get just filenames
ls -1 ~/.claude/projects/<project-name>/*.jsonl | 
  xargs -n 1 basename | sed 's/.jsonl$//'
```

### Common jq Errors

**Error: "Cannot iterate over null"**
```bash
jq: error (at file.json:1336): Cannot iterate over null (null)
```

**Cause:** Using wrong field name or structure

**Fix:** Check the structure first with limited output:
```bash
# See the structure
jq 'keys' file.json

# If it has "entries" array:
jq '.entries | length' file.json

# Check first entry structure:
jq '.entries[0] | keys' file.json

# Should show: ["created", "fileMtime", "firstPrompt", "fullPath", "gitBranch", "isSidechain", "messageCount", "modified", "projectPath", "sessionId"]

# Use "sessionId" not "id":
jq '.entries[0].sessionId' file.json  # ✅ Correct
jq '.entries[0].id' file.json  # ❌ Wrong - field doesn't exist
```

**Error: "strflocaltime not available"**

**Cause:** Your jq version doesn't support `strflocaltime`

**Fix:** Use simpler date formatting:
```bash
# Instead of strflocaltime("%Y-%m-%d %H:%M")
# Just use the ISO timestamp directly:
jq -r '.entries[] | "\(.modified) | \(.sessionId)"' file.json
```

### Best Practices

1. **Always use jq for large index files** - It's fast and memory-efficient
2. **Limit results** - Use `limit(N;.[])` to avoid overwhelming output
3. **Sort by date** - `sort_by(.fileMtime) | reverse` for most recent first
4. **Truncate long text** - Use `[:80]` to preview first 80 chars
5. **Test jq commands first** - Run simple queries before complex ones
6. **Have fallback** - If jq fails, fall back to directory listing

### Prevention

When implementing session discovery:

```python
def discover_sessions(project_path):
    """Discover sessions without reading large files."""
    
    # Option 1: Try jq (fast, efficient)
    try:
        result = subprocess.run([
            'jq', '-r',
            '.entries | sort_by(.fileMtime) | reverse | limit(15;.[]) | '
            '"\(.modified) | \(.sessionId) | \(.firstPrompt[:80])"',
            sessions_index_path
        ], capture_output=True, text=True, check=True)
        
        return parse_jq_output(result.stdout)
    
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Option 2: Fallback to directory listing
        return list_sessions_from_directory(project_path)

def list_sessions_from_directory(project_path):
    """Fallback: list .jsonl files directly."""
    
    # Use shell to list files
    result = subprocess.run([
        'ls', '-lt', f'{project_dir}/*.jsonl'
    ], capture_output=True, text=True)
    
    # Parse output and return session IDs
    return parse_ls_output(result.stdout)
```

---

## Parsing Errors

### Symptom
```
json.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

### Possible Causes

1. **Corrupted JSON line**
   - Incomplete write
   - Disk error
   - Process interrupted

2. **Empty line**
   - Blank lines in .jsonl file

3. **Wrong file format**
   - Not a JSON Lines file
   - Different file type

### Solutions

**1. Skip bad lines gracefully:**
```python
def load_events_safely(session_file):
    events = []
    errors = []
    
    with open(session_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue  # Skip empty lines
            
            try:
                event = json.loads(line)
                events.append(event)
            except json.JSONDecodeError as e:
                errors.append({
                    "line": line_num,
                    "error": str(e),
                    "content": line[:100]  # First 100 chars
                })
    
    if errors:
        print(f"⚠️  Skipped {len(errors)} malformed lines")
    
    return events, errors
```

**2. Validate file format:**
```python
def is_valid_jsonl(filepath):
    """Check if file is valid JSON Lines format."""
    
    try:
        with open(filepath, 'r') as f:
            first_line = f.readline().strip()
            if not first_line:
                return False
            json.loads(first_line)
            return True
    except:
        return False
```

**3. Repair attempts:**
```python
def attempt_repair(line):
    """Try to fix common JSON issues."""
    
    # Remove trailing commas
    line = re.sub(r',\s*}', '}', line)
    line = re.sub(r',\s*]', ']', line)
    
    # Try to parse
    try:
        return json.loads(line)
    except:
        return None
```

---

## Permission Denied

### Symptom
```
PermissionError: [Errno 13] Permission denied: '/Users/john/.claude/projects/...'
```

### Possible Causes

1. **File permissions changed**
   - chmod restricted access
   - Ownership change

2. **Directory permissions**
   - Can't read .claude directory
   - Can't read projects directory

3. **macOS security restrictions**
   - Terminal doesn't have file access
   - Claude Desktop privacy settings

### Solutions

**1. Check permissions:**
```bash
ls -la ~/.claude/projects/
```

**2. Fix permissions:**
```bash
# Make readable
chmod -R u+r ~/.claude/projects/

# If owned by different user
sudo chown -R $(whoami) ~/.claude/projects/
```

**3. macOS permissions:**
- System Settings → Privacy & Security → Files and Folders
- Grant Terminal/Claude Desktop access

---

## Missing Sub-Agent Files

### Symptom
```
(Sub-agent log file not found)
```

### Possible Causes

1. **Agent didn't execute fully**
   - Delegation started but failed
   - Process interrupted

2. **File cleanup**
   - Sub-agent files deleted separately
   - Disk space recovery

3. **Wrong agent ID**
   - Parsing error
   - ID format changed

### Solutions

**1. Graceful handling:**
```python
if agent_id:
    print(f"--- Sub-Agent Delegation `{agent_id}` ---")
    
    subagent_file = find_agent_file(project_dir, session_id, agent_id)
    
    if subagent_file and os.path.exists(subagent_file):
        # Process sub-agent
        process_subagent(subagent_file)
    else:
        print("(Sub-agent log file not found)")
        print("This may indicate the delegation was interrupted or files were cleaned up.")
    
    print("----------------------------------------")
```

**2. Check sub-agent directory:**
```python
subagent_dir = os.path.join(project_dir, session_id, "subagents")

if os.path.exists(subagent_dir):
    available = os.listdir(subagent_dir)
    print(f"Available sub-agent files: {available}")
else:
    print("No subagents directory exists")
```

**3. Continue without sub-agent:**
- Show tool result normally
- Note that sub-agent details unavailable
- Don't halt entire reconstruction

---

## Large Session Performance

### Symptom
```
Processing takes very long / high memory usage
```

### Possible Causes

1. **Too many events**
   - Session ran for hours
   - Many tool calls
   - Lots of file operations

2. **Large tool results**
   - Reading big files
   - Large JSON responses

3. **Deep nesting**
   - Many sub-agent levels
   - Complex delegation chains

### Solutions

**1. Stream processing:**
```python
def process_session_streaming(session_file, output_file):
    """Process session without loading entirely into memory."""
    
    with open(session_file, 'r') as fin, open(output_file, 'w') as fout:
        for line in fin:
            try:
                event = json.loads(line)
                formatted = format_event(event)
                fout.write(formatted + "\n")
            except:
                continue
```

**2. Progress indicator:**
```python
def process_with_progress(session_file):
    # Count lines first
    with open(session_file, 'r') as f:
        total_lines = sum(1 for _ in f)
    
    print(f"Processing {total_lines} events...")
    
    with open(session_file, 'r') as f:
        for i, line in enumerate(f, 1):
            if i % 50 == 0:
                print(f"Progress: {i}/{total_lines} ({i/total_lines*100:.1f}%)")
            
            process_event(json.loads(line))
```

**3. Truncate large content:**
```python
def format_content_safely(content, max_length=1000):
    """Truncate overly long content."""
    
    if len(content) > max_length:
        return content[:max_length] + f"\n\n... (truncated {len(content) - max_length} characters)"
    return content
```

**4. Limit depth:**
```python
MAX_SUBAGENT_DEPTH = 5

def process_events(events, depth=0):
    if depth > MAX_SUBAGENT_DEPTH:
        print(f"⚠️  Maximum nesting depth reached ({MAX_SUBAGENT_DEPTH})")
        return
    
    # ... normal processing ...
```

---

## Timestamp Parsing Issues

### Symptom
```
ValueError: Invalid isoformat string
```

### Possible Causes

1. **Unexpected timestamp format**
   - Different ISO 8601 variant
   - Missing timezone
   - Microseconds precision

2. **Missing timestamp**
   - Event has no timestamp field
   - Null/empty value

### Solutions

**1. Robust parsing:**
```python
def parse_timestamp_safely(ts_str):
    """Parse timestamp with fallbacks."""
    
    if not ts_str:
        return "Unknown time"
    
    try:
        # Standard format: 2026-01-17T20:31:59.197Z
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except ValueError:
        # Try alternative formats
        formats = [
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d %H:%M:%S'
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(ts_str, fmt)
                return dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                continue
        
        # Give up, return as-is
        return ts_str
```

**2. Handle missing timestamps:**
```python
timestamp = event.get("timestamp")
if timestamp:
    formatted_time = parse_timestamp_safely(timestamp)
else:
    formatted_time = "Unknown time"

print(f"## User ({formatted_time})")
```

---

## Encoding Issues

### Symptom
```
UnicodeDecodeError: 'utf-8' codec can't decode byte...
```

### Possible Causes

1. **Non-UTF-8 file**
   - Different encoding used
   - Binary data

2. **Corrupted characters**
   - File corruption
   - Encoding mismatch

### Solutions

**1. Try different encodings:**
```python
def read_with_fallback(filepath):
    """Try multiple encodings."""
    
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(filepath, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    
    # Last resort: ignore errors
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()
```

**2. Validate before processing:**
```python
def is_text_file(filepath):
    """Check if file is text (not binary)."""
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)  # Try reading first 1KB
        return True
    except:
        return False
```

---

## Export Failures

### Symptom
Export command fails or produces invalid output

### Possible Causes

1. **Output path issues**
   - Directory doesn't exist
   - No write permission
   - Disk full

2. **Invalid format option**
   - Unsupported format
   - Conflicting flags

3. **Content issues**
   - Special characters in filenames
   - Path length limits

### Solutions

**1. Validate output path:**
```python
def safe_export(session_id, output_path, format='markdown'):
    # Expand ~
    output_path = os.path.expanduser(output_path)
    
    # Create parent directories
    parent = os.path.dirname(output_path)
    if parent and not os.path.exists(parent):
        try:
            os.makedirs(parent)
        except OSError as e:
            return {"error": f"Cannot create directory: {e}"}
    
    # Check write permission
    if not os.access(parent or '.', os.W_OK):
        return {"error": f"No write permission for: {parent or '.'}"}
    
    # Proceed with export
    try:
        export_session(session_id, output_path, format)
        return {"success": True, "path": output_path}
    except Exception as e:
        return {"error": f"Export failed: {e}"}
```

**2. Validate format:**
```python
VALID_FORMATS = ['markdown', 'markdown-clean', 'html']

if format not in VALID_FORMATS:
    print(f"Invalid format: {format}")
    print(f"Valid formats: {', '.join(VALID_FORMATS)}")
    return
```

---

## Quick Diagnostics

Run this to diagnose common issues:

```python
def diagnose_session_access(project_path, session_id=None):
    """Run diagnostic checks."""
    
    print("=== Session Access Diagnostics ===\n")
    
    # Check .claude directory
    claude_dir = os.path.expanduser("~/.claude")
    print(f"1. Claude directory: {claude_dir}")
    print(f"   Exists: {os.path.exists(claude_dir)}")
    print(f"   Readable: {os.access(claude_dir, os.R_OK)}")
    
    # Check projects directory
    projects_dir = os.path.join(claude_dir, "projects")
    print(f"\n2. Projects directory: {projects_dir}")
    print(f"   Exists: {os.path.exists(projects_dir)}")
    print(f"   Readable: {os.access(projects_dir, os.R_OK)}")
    
    if os.path.exists(projects_dir):
        project_count = len([d for d in os.listdir(projects_dir) if os.path.isdir(os.path.join(projects_dir, d))])
        print(f"   Project count: {project_count}")
    
    # Check specific project
    if project_path:
        normalized = normalize_project_path(project_path)
        project_dir = os.path.join(projects_dir, normalized)
        
        print(f"\n3. Specific project: {project_path}")
        print(f"   Normalized: {normalized}")
        print(f"   Directory: {project_dir}")
        print(f"   Exists: {os.path.exists(project_dir)}")
        
        if os.path.exists(project_dir):
            sessions = list_project_sessions(project_path)
            print(f"   Session count: {len(sessions)}")
            
            if session_id:
                session_file = os.path.join(project_dir, f"{session_id}.jsonl")
                print(f"\n4. Specific session: {session_id}")
                print(f"   File: {session_file}")
                print(f"   Exists: {os.path.exists(session_file)}")
                
                if os.path.exists(session_file):
                    print(f"   Readable: {os.access(session_file, os.R_OK)}")
                    print(f"   Size: {os.path.getsize(session_file)} bytes")
                    
                    # Check if valid JSONL
                    print(f"   Valid JSONL: {is_valid_jsonl(session_file)}")
```

Run with:
```python
diagnose_session_access("/Users/john/Code/myapp", "session-abc123")
```
