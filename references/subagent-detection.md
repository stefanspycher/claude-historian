# Sub-Agent Detection Reference

How to detect, trace, and reconstruct sub-agent delegation chains.

## Overview

Claude can delegate to specialized sub-agents (Plan mode, Debug mode, Ask mode) during conversations. These delegations create nested conversation contexts that must be traced for complete session reconstruction.

## Detection Pattern

### Primary Signal: agentId in Tool Results

Sub-agent delegations are indicated by `agentId:` appearing in tool result content:

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_abc123",
  "content": [
    {
      "type": "text",
      "text": "agentId: xyz123abc\nSwitching to Plan mode...\n..."
    }
  ]
}
```

**Regex pattern:**
```python
import re
match = re.search(r"agentId:\s*([a-zA-Z0-9]+)", content_text)
if match:
    agent_id = match.group(1)
```

### Content Variations

**1. String content:**
```python
content = "agentId: abc123\nRest of content..."
match = re.search(r"agentId:\s*([a-zA-Z0-9]+)", content)
```

**2. Array content:**
```python
content = [
    {"type": "text", "text": "agentId: abc123\n..."}
]
# Iterate through array, check each text part
for part in content:
    if part.get("type") == "text":
        match = re.search(r"agentId:\s*([a-zA-Z0-9]+)", part.get("text", ""))
```

**3. Nested structures:**
```python
# Handle arbitrary nesting depth
def find_agent_id(obj):
    if isinstance(obj, str):
        match = re.search(r"agentId:\s*([a-zA-Z0-9]+)", obj)
        return match.group(1) if match else None
    elif isinstance(obj, list):
        for item in obj:
            result = find_agent_id(item)
            if result:
                return result
    elif isinstance(obj, dict):
        for value in obj.values():
            result = find_agent_id(value)
            if result:
                return result
    return None
```

## Sub-Agent File Location

Once `agent_id` is detected, locate the sub-agent's session file:

**Path pattern:**
```
~/.claude/projects/<normalized-project>/<session-id>/subagents/agent-<agent-id>.jsonl
```

**Example:**
```
Main session: ~/.claude/projects/Users-john-Code-app/session-main123.jsonl
Sub-agent:    ~/.claude/projects/Users-john-Code-app/session-main123/subagents/agent-xyz789.jsonl
```

**Implementation:**
```python
def find_agent_file(project_dir, session_id, agent_id):
    subagent_path = os.path.join(
        project_dir,
        session_id,
        "subagents",
        f"agent-{agent_id}.jsonl"
    )
    
    if os.path.exists(subagent_path):
        return subagent_path
    return None
```

## Delegation Chain Reconstruction

### Chronological Order

Sub-agents should be processed **in chronological order** - trace the sub-agent conversation as soon as delegation is detected:

```python
# Main session processing
for event in main_events:
    if event_type == "user":
        # Check for tool results
        for content_item in event.get("message", {}).get("content", []):
            if content_item.get("type") == "tool_result":
                agent_id = detect_agent_id(content_item)
                
                if agent_id:
                    # IMMEDIATELY trace sub-agent
                    print("--- Sub-Agent Delegation ---")
                    trace_subagent(agent_id, depth + 1)
                    print("----------------------------")
                
                # THEN show tool result
                display_tool_result(content_item)
```

### Visual Nesting with Depth

Use blockquote indentation to show nesting levels:

**Depth 0 (Main session):**
```markdown
## User (2026-01-17 20:30:00)
Main session message

## Claude (2026-01-17 20:30:01)
Response
```

**Depth 1 (First sub-agent):**
```markdown
> **User** (2026-01-17 20:30:02)
> Sub-agent message
>
> **Claude (Plan Mode)** (2026-01-17 20:30:03)
> Sub-agent response
```

**Depth 2 (Nested sub-agent):**
```markdown
> > **User** (2026-01-17 20:30:04)
> > Nested sub-agent message
> >
> > **Claude (Debug Mode)** (2026-01-17 20:30:05)
> > Nested sub-agent response
```

**Implementation:**
```python
def format_message(content, depth):
    prefix = "> " * depth
    lines = content.split("\n")
    return "\n".join(f"{prefix}{line}" for line in lines)
```

## Agent Mode Detection

Identify the mode from context clues in the sub-agent session:

**Heuristics:**
- Contains "plan", "approach", "strategy" → **Plan mode**
- Contains "error", "debug", "investigate" → **Debug mode**
- Mostly read operations, no writes → **Ask mode**
- Default → **Agent mode** (delegated task execution)

**Display mode in header:**
```markdown
> **Claude (Plan Mode)** (2026-01-17 20:30:03)
> **Claude (Debug Mode)** (2026-01-17 20:30:05)
> **Claude** (2026-01-17 20:30:07)  # Default, no mode specified
```

## Recursive Processing

Sub-agents can spawn their own sub-agents (unlimited nesting):

```python
def process_events(events, project_dir, session_id, depth=0):
    prefix = "> " * depth
    
    for event in events:
        # ... process event ...
        
        # Check for sub-agent delegation
        agent_id = detect_agent_id_in_event(event)
        if agent_id:
            print(f"{prefix}--- Sub-Agent Delegation `{agent_id}` ---")
            
            subagent_file = find_agent_file(project_dir, session_id, agent_id)
            if subagent_file:
                sub_events = load_events(subagent_file)
                # Recurse with increased depth
                process_events(sub_events, project_dir, session_id, depth + 1)
            else:
                print(f"{prefix}(Sub-agent log file not found)")
            
            print(f"{prefix}{'─' * 40}")
```

## Edge Cases

### 1. Missing Sub-Agent File

Agent ID detected but file doesn't exist:

```markdown
--- *Sub-Agent Delegation `abc123`* ---
(Sub-agent log file not found)
----------------------------------------
```

**Possible reasons:**
- Session was cleaned up
- Agent didn't actually execute
- File system error

**Handling:** Log warning, continue processing

### 2. Corrupted Sub-Agent File

File exists but contains malformed JSON:

```python
try:
    with open(subagent_file, 'r') as f:
        sub_events = []
        for line in f:
            try:
                sub_events.append(json.loads(line))
            except json.JSONDecodeError:
                # Skip bad line, continue
                continue
except Exception as e:
    print(f"{prefix}Error processing sub-agent: {e}")
```

### 3. Circular Delegation

(Unlikely but theoretically possible)

**Detection:**
```python
def process_events(events, project_dir, session_id, depth=0, seen_agents=None):
    if seen_agents is None:
        seen_agents = set()
    
    for event in events:
        agent_id = detect_agent_id_in_event(event)
        if agent_id:
            if agent_id in seen_agents:
                print(f"{prefix}⚠️  Circular delegation detected: {agent_id}")
                continue
            
            seen_agents.add(agent_id)
            # ... process sub-agent ...
```

### 4. Multiple Agents in One Session

A session can delegate to multiple different sub-agents:

```markdown
## Claude (2026-01-17 20:30:00)

--- *Sub-Agent Delegation `agent-plan-abc`* ---
> [Plan mode conversation]
----------------------------------------

**Tool Result**: Plan complete

--- *Sub-Agent Delegation `agent-debug-xyz`* ---
> [Debug mode conversation]
----------------------------------------

**Tool Result**: Debug complete
```

**Handling:** Process each independently in chronological order

### 5. Depth Limits

Impose a practical depth limit to prevent runaway recursion:

```python
MAX_DEPTH = 10

def process_events(events, project_dir, session_id, depth=0):
    if depth > MAX_DEPTH:
        print(f"⚠️  Maximum nesting depth ({MAX_DEPTH}) exceeded")
        return
    
    # ... process normally ...
```

## Filtering Sub-Agents

Users may want to focus on specific aspects:

**Show only sub-agents:**
```python
def process_events(events, ..., agents_only=False):
    for event in events:
        if agents_only:
            # Skip main session events, only process sub-agents
            agent_id = detect_agent_id_in_event(event)
            if agent_id:
                trace_subagent(agent_id, depth + 1)
        else:
            # Normal processing
            ...
```

**Count sub-agents:**
```python
def count_subagents(events):
    count = 0
    for event in events:
        if detect_agent_id_in_event(event):
            count += 1
    return count
```

## Output Examples

### Simple Delegation

```markdown
## Claude (2026-01-17 20:30:00)
I'll switch to Plan mode to design this.

**Tool Use**: `DelegateToAgent` (ID: `toolu_abc`)

**Tool Result** (`toolu_abc`):

--- *Sub-Agent Delegation `agent-plan-123`* ---

> **User** (2026-01-17 20:30:01)
> Design an approach for implementing X

> **Claude (Plan Mode)** (2026-01-17 20:30:03)
> Here's my proposed approach:
> 1. First step
> 2. Second step
> 3. Third step

----------------------------------------
```

### Nested Delegation

```markdown
--- *Sub-Agent Delegation `agent-plan-123`* ---

> **User** (2026-01-17 20:30:01)
> Design an approach

> **Claude (Plan Mode)** (2026-01-17 20:30:03)
> I need to investigate something first.
>
> **Tool Use**: `DelegateToAgent` (ID: `toolu_xyz`)
>
> --- *Sub-Agent Delegation `agent-debug-456`* ---
>
> > **User** (2026-01-17 20:30:04)
> > Investigate the error in...
> >
> > **Claude (Debug Mode)** (2026-01-17 20:30:05)
> > I found the issue...
>
> ----------------------------------------
>
> **Tool Result**: Investigation complete
>
> Now I can continue with the plan...

----------------------------------------
```

## Testing Detection Logic

**Test cases:**

1. ✅ Simple string: `"agentId: abc123"`
2. ✅ With whitespace: `"agentId:    abc123"`
3. ✅ Mid-content: `"Starting...\nagentId: abc123\nContinuing..."`
4. ✅ Array content: `[{"type": "text", "text": "agentId: abc123"}]`
5. ✅ No match: `"No agent here"`
6. ✅ Multiple matches: Use first match only
7. ✅ Alphanumeric IDs: `abc123`, `xyz789ABC`

**Example test:**
```python
test_cases = [
    ("agentId: abc123", "abc123"),
    ("agentId:xyz789", "xyz789"),
    ("text\nagentId: test123\nmore", "test123"),
    ("no agent", None),
]

for input_text, expected in test_cases:
    match = re.search(r"agentId:\s*([a-zA-Z0-9]+)", input_text)
    result = match.group(1) if match else None
    assert result == expected, f"Failed for: {input_text}"
```
