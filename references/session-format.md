# Session Format Reference

Detailed documentation for Claude session file structure and event schemas.

## File Structure

### Main Session File
**Location:** `~/.claude/projects/<normalized-project>/<session-id>.jsonl`  
**Format:** JSON Lines (one JSON object per line)  
**Encoding:** UTF-8

### Sub-Agent Files
**Location:** `~/.claude/projects/<normalized-project>/<session-id>/subagents/agent-<agent-id>.jsonl`  
**Format:** Same as main session  
**Relationship:** Referenced via `tool_result` content containing `agentId: <agent-id>`

## Event Types

### 1. User Event

```json
{
  "type": "user",
  "timestamp": "2026-01-17T20:31:59.197Z",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "User message content"
      }
    ]
  }
}
```

**Content types:**
- `text` - Plain user message
- `tool_result` - Results from tool execution (see Tool Result section)

### 2. Assistant Event

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Assistant response"
      },
      {
        "type": "thinking",
        "thinking": "Internal reasoning...",
        "signature": "abc123"
      },
      {
        "type": "tool_use",
        "id": "toolu_xyz123",
        "name": "Read",
        "input": {
          "path": "/some/file.txt"
        }
      }
    ]
  }
}
```

**Content types:**
- `text` - Assistant text response
- `thinking` - Extended thinking block (optional signature for verification)
- `tool_use` - Tool invocation with parameters

### 3. Tool Result (in User Event)

Tool results appear as `tool_result` type within user events:

```json
{
  "type": "user",
  "timestamp": "2026-01-17T20:32:02.456Z",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_xyz123",
        "content": "File contents...",
        "is_error": false
      }
    ]
  }
}
```

**With error:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_abc",
  "content": "Error: File not found",
  "is_error": true
}
```

**Sub-agent delegation detection:**
Tool results containing `agentId:` trigger sub-agent reconstruction:

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_delegate",
  "content": [
    {
      "type": "text",
      "text": "agentId: xyz123\nAgent output..."
    }
  ]
}
```

Pattern to detect: `agentId:\s*([a-zA-Z0-9]+)`

### 4. Summary Event

```json
{
  "type": "summary",
  "timestamp": "2026-01-17T21:00:00.000Z",
  "summary": "Brief session summary text"
}
```

Appears at major transition points or session end.

## Timestamp Format

**Standard format:** ISO 8601 with timezone  
**Example:** `2026-01-17T20:31:59.197Z`

**Parsing:**
```python
from datetime import datetime
dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
formatted = dt.strftime('%Y-%m-%d %H:%M:%S')
```

## Content Variations

### Text Content Variants

1. **Simple string:**
```json
"content": "Simple text"
```

2. **Array of objects:**
```json
"content": [
  {"type": "text", "text": "Message"},
  {"type": "tool_result", "tool_use_id": "..."}
]
```

3. **Nested arrays (tool results):**
```json
"content": [
  {
    "type": "text",
    "text": "Nested content"
  }
]
```

### Handling Edge Cases

**Empty content:**
```json
"content": []
```
→ Display: "(No content)"

**Malformed JSON line:**
→ Skip line, continue parsing
→ Log warning if debugging

**Missing fields:**
- `timestamp` → Use "Unknown time"
- `content` → Display "(Empty)"
- `type` → Skip event

## Path Normalization

Converting workspace paths to `.claude/projects` directory names:

**Rule:** Replace `/` and `.` with `-`

**Examples:**
```
/Users/john/Code/project     → Users-john-Code-project
/Users/jane/Sites/app.demo   → Users-jane-Sites-app-demo
/home/dev/workspace/test     → home-dev-workspace-test
```

**Implementation:**
```python
def normalize_project_path(path):
    return path.replace('/', '-').replace('.', '-')
```

## Breadcrumb Files

Users may provide breadcrumb JSON to locate sessions:

```json
{
  "project": "/Users/name/Code/project",
  "sessionId": "abc123xyz",
  "timestamp": "2026-01-17T20:31:59.197Z"
}
```

**Usage:**
1. Extract `project` and normalize
2. Use `sessionId` to find `.jsonl` file
3. `timestamp` is informational only

## Multi-Line Content Formatting

When displaying content with newlines, maintain blockquote depth:

**Example:**
```markdown
> **User** (2026-01-17 20:32:00)
> Line 1 of message
> Line 2 of message
> Line 3 of message
```

**Implementation:**
```python
prefix = "> " * depth
formatted = content.replace("\n", f"\n{prefix}")
print(f"{prefix}{formatted}")
```

## Large Session Handling

Sessions can contain hundreds of events. Best practices:

1. **Stream output** - Don't load entire session into memory
2. **Progressive display** - Show summary first, details on request
3. **Filtering** - Allow users to filter by event type or time range
4. **Pagination** - Break large sessions into chunks

**Summary first approach:**
```
Session abc123 (342 events)
- Duration: 45 minutes
- User messages: 23
- Tool calls: 156
- Sub-agents: 2 (Plan mode, Debug mode)
- Errors: 3

Show: [full] [tools only] [errors only] [subagents only]
```

## Character Encoding

**Handle special characters:**
- Unicode emoji ✅
- Code symbols `\n`, `\t`
- Multi-byte characters (Asian languages)

**JSON escaping:**
```python
import json
# Handles all escaping automatically
json.loads(line)
```

## Version Compatibility

Session format may evolve. Handle gracefully:

- **Unknown event types** → Skip with warning
- **New content types** → Display as JSON
- **Schema changes** → Backwards compatible parsing

**Future-proofing:**
```python
event_type = event.get("type", "unknown")
if event_type in ["user", "assistant", "summary"]:
    # Process known type
else:
    # Generic handling
    print(f"Unknown event type: {event_type}")
```
