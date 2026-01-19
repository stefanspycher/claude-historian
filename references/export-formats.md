# Export Formats Reference

Specifications for exporting Claude sessions in different formats.

## Supported Formats

Only two export formats are supported:

### 1. Markdown (Default)

**Format ID:** `markdown`  
**File extension:** `.md`  
**Description:** Full markdown with all features

**Features:**
- ✅ Headers and timestamps
- ✅ Blockquotes for nesting
- ✅ Thinking blocks (callouts)
- ✅ Code blocks with syntax highlighting
- ✅ Tool use details
- ✅ Sub-agent delegations

**Example output:**
```markdown
# Session Reconstruction

**Session ID:** `abc123`
**Project:** `/Users/name/project`
**Date:** 2026-01-17 20:31:59

---

## User (2026-01-17 20:31:59)
Please create a React component

## Claude (2026-01-17 20:32:01)
I'll create that component for you.

> [!NOTE] Thinking Process
> The user wants a React component. I should:
> 1. Define the component structure
> 2. Add proper TypeScript types
> 3. Include basic styling

**Tool Use**: `Write` (ID: `toolu_xyz123`)
```json
{
  "path": "/src/Component.tsx",
  "contents": "export const Component = () => {...}"
}
```

**Tool Result** (`toolu_xyz123`):
```text
Successfully wrote file
```
```

---

### 2. Markdown Clean

**Format ID:** `markdown-clean`  
**File extension:** `.md`  
**Description:** Simplified markdown without thinking blocks

**Features:**
- ✅ Headers and timestamps
- ✅ Blockquotes for nesting
- ❌ Thinking blocks (excluded)
- ✅ Code blocks (collapsed)
- ✅ Tool use (summarized)
- ✅ Sub-agent delegations (collapsed)

**Differences from full markdown:**
- No thinking blocks
- Tool calls shown as summary: `🔧 Used tool: Write → /src/file.tsx`
- Sub-agents shown as collapsible sections
- More compact spacing

**Example output:**
```markdown
# Session Summary

**Session ID:** `abc123`

## User (2026-01-17 20:31:59)
Please create a React component

## Claude (2026-01-17 20:32:01)
I'll create that component for you.

🔧 **Tool:** Write → `/src/Component.tsx`
✅ **Result:** Successfully wrote file
```

**Use case:** Sharing with stakeholders who don't need technical details

---

### 3. HTML

**Format ID:** `html`  
**File extension:** `.html`  
**Description:** Styled HTML with syntax highlighting

**Features:**
- ✅ Full styling with CSS
- ✅ Syntax highlighting (highlight.js)
- ✅ Collapsible sections
- ✅ Timestamps in local timezone
- ✅ Table of contents
- ✅ Dark/light theme toggle

**Structure:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Session abc123</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <style>
        /* Custom styling */
    </style>
</head>
<body>
    <div class="session-header">
        <h1>Session Reconstruction</h1>
        <div class="metadata">...</div>
    </div>
    
    <div class="session-content">
        <div class="event user">
            <div class="header">
                <span class="role">User</span>
                <span class="timestamp">2026-01-17 20:31:59</span>
            </div>
            <div class="content">...</div>
        </div>
        
        <div class="event assistant">
            <div class="header">
                <span class="role">Claude</span>
                <span class="timestamp">2026-01-17 20:32:01</span>
            </div>
            <div class="content">...</div>
            <div class="thinking collapsed">...</div>
            <div class="tool-use">...</div>
        </div>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</body>
</html>
```

**Styling features:**
- Message bubbles (chat-like interface)
- Collapsible thinking blocks
- Expandable tool details
- Sub-agent sections with visual indent
- Copy buttons for code blocks
- Timestamp hover shows full ISO format

**Use case:** Professional presentations, documentation websites

---

## Format Options (Flags)

### Global Options

**`--no-thinking`**
- Excludes thinking blocks from output
- Works with: markdown, markdown-clean, html
- Example: `@export-session abc123 --no-thinking`

**`--no-tools`**
- Excludes detailed tool calls, shows summaries only
- Works with: all formats
- Example: `@export-session abc123 --no-tools`

**`--agents-only`**
- Shows only sub-agent interactions
- Excludes main session content
- Works with: all formats
- Example: `@export-session abc123 --agents-only`

**`--compact`**
- Reduces whitespace and formatting
- Works with: all formats
- Example: `@export-session abc123 --compact`

**`--time-range <start> <end>`**
- Filters events by timestamp
- Format: ISO 8601 or human-readable
- Example: `@export-session abc123 --time-range "20:30" "20:45"`

### Format-Specific Options

**Markdown options:**
- `--toc` - Add table of contents
- `--fold-tools` - Make tool blocks collapsible (if viewer supports)

**HTML options:**
- `--theme dark|light|auto` - Color theme (default: auto)
- `--standalone` - Inline all CSS/JS (no CDN dependencies)
- `--no-syntax-highlight` - Disable code highlighting

---

## Transformation Logic

### Markdown Transformation

```python
def to_markdown(events, options):
    output = ["# Session Reconstruction\n"]
    output.append(format_metadata(session_metadata))
    output.append("\n---\n")
    
    for event in events:
        if event["type"] == "user":
            output.append(f"\n## User ({format_timestamp(event['timestamp'])})")
            output.append(format_content(event["message"]["content"]))
        
        elif event["type"] == "assistant":
            output.append(f"\n## Claude ({format_timestamp(event['timestamp'])})")
            
            for item in event["message"]["content"]:
                if item["type"] == "text":
                    output.append(item["text"])
                
                elif item["type"] == "thinking" and not options.no_thinking:
                    output.append("\n> [!NOTE] Thinking Process")
                    output.append(f"> {item['thinking']}")
                
                elif item["type"] == "tool_use":
                    if options.no_tools:
                        output.append(f"\n🔧 **Tool:** {item['name']}")
                    else:
                        output.append(f"\n**Tool Use**: `{item['name']}` (ID: `{item['id']}`)")
                        output.append(f"```json\n{json.dumps(item['input'], indent=2)}\n```")
    
    return "\n".join(output)
```

### HTML Transformation

```python
def to_html(events, options):
    template = load_template("html_template.html")
    
    events_html = []
    for event in events:
        event_html = render_event_html(event, options)
        events_html.append(event_html)
    
    return template.format(
        title=f"Session {session_id}",
        metadata=render_metadata_html(session_metadata),
        content="".join(events_html),
        theme=options.theme,
        scripts=get_scripts(options)
    )
```

---

## Output Destination

### Default Behavior

1. **No path specified:**
   - Save to: `~/Downloads/session-{session_id}-{timestamp}.{ext}`
   - Inform user of location

2. **Relative path:**
   - Resolve relative to current working directory
   - Create parent directories if needed

3. **Absolute path:**
   - Use as-is
   - Create parent directories if needed

### Examples

```bash
# Default location
@export-session abc123
# → ~/Downloads/session-abc123-20260117-203159.md

# Specific file
@export-session abc123 ~/Desktop/my-session.md
# → ~/Desktop/my-session.md

# Relative path (if in /Users/name/project)
@export-session abc123 ./docs/session.md
# → /Users/name/project/docs/session.md

# With format
@export-session abc123 as html ~/report.html
# → ~/report.html
```

### MCP Integration

**Obsidian export:**
```bash
@export-session abc123 to obsidian
# → Save to Obsidian vault at configured path
```

**Implementation:**
```python
def export_to_obsidian(session_id, vault_path):
    markdown_content = to_markdown(events, options)
    
    # Add Obsidian frontmatter
    frontmatter = f"""---
session_id: {session_id}
type: claude-session
created: {datetime.now().isoformat()}
tags: [session, claude, conversation]
---

"""
    
    full_content = frontmatter + markdown_content
    
    # Use Obsidian MCP
    mcp_call("obsidian-mcp-tools", "create_vault_file", {
        "filename": f"sessions/{session_id}.md",
        "content": full_content
    })
```

---

## Quality Checks

Before exporting, validate:

1. ✅ All events have timestamps
2. ✅ No orphaned tool results (tool_use_id matches)
3. ✅ Sub-agent files exist if referenced
4. ✅ JSON is valid in code blocks
5. ✅ No broken markdown formatting
6. ⚠️ Warn if session is very large (>1000 events)
7. ⚠️ Warn if thinking blocks are truncated

**Implementation:**
```python
def validate_export(events):
    warnings = []
    
    if len(events) > 1000:
        warnings.append(f"Large session ({len(events)} events) - export may take time")
    
    tool_use_ids = set()
    tool_result_ids = set()
    
    for event in events:
        if not event.get("timestamp"):
            warnings.append(f"Event missing timestamp: {event.get('type')}")
        
        # Track tool IDs
        for item in event.get("message", {}).get("content", []):
            if item.get("type") == "tool_use":
                tool_use_ids.add(item["id"])
            elif item.get("type") == "tool_result":
                tool_result_ids.add(item["tool_use_id"])
    
    orphaned = tool_result_ids - tool_use_ids
    if orphaned:
        warnings.append(f"Orphaned tool results: {orphaned}")
    
    return warnings
```

---

## Performance Considerations

**Large sessions:**
- Stream output to file (don't build entire string in memory)
- Process events in chunks
- Show progress indicator for >500 events

**HTML export:**
- Inline CSS/JS for standalone files (~50KB overhead)
- Use CDN for smaller files (requires internet)

**Syntax highlighting:**
- HTML: Use highlight.js
- Markdown: Assume viewer handles it
