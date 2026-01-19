# Event Schema Reference

Complete JSON schemas for all Claude session event types.

## Overview

Session files (`.jsonl`) contain one JSON object per line. Each object represents an event in the conversation.

## User Event

### Basic Structure

```json
{
  "type": "user",
  "timestamp": "2026-01-17T20:31:59.197Z",
  "message": {
    "role": "user",
    "content": [...]
  }
}
```

### Content Variants

**1. Simple text message:**

```json
{
  "type": "user",
  "timestamp": "2026-01-17T20:31:59.197Z",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "Please create a React component"
      }
    ]
  }
}
```

**2. With tool result:**

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
        "content": "File contents here...",
        "is_error": false
      }
    ]
  }
}
```

**3. Multiple content items:**

```json
{
  "type": "user",
  "timestamp": "2026-01-17T20:32:05.789Z",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "Here are the results:"
      },
      {
        "type": "tool_result",
        "tool_use_id": "toolu_abc",
        "content": "Result 1"
      },
      {
        "type": "tool_result",
        "tool_use_id": "toolu_def",
        "content": "Result 2"
      }
    ]
  }
}
```

### Tool Result Content Types

**Simple string:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xyz",
  "content": "Success: File written",
  "is_error": false
}
```

**Array of objects:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xyz",
  "content": [
    {
      "type": "text",
      "text": "Multiple items returned"
    }
  ],
  "is_error": false
}
```

**Error result:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xyz",
  "content": "Error: File not found",
  "is_error": true
}
```

**Sub-agent delegation (special case):**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xyz",
  "content": [
    {
      "type": "text",
      "text": "agentId: abc123\nSwitching to Plan mode..."
    }
  ],
  "is_error": false
}
```

## Assistant Event

### Basic Structure

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [...]
  }
}
```

### Content Types

**1. Text response:**

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "I'll create that component for you."
      }
    ]
  }
}
```

**2. With thinking block:**

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "thinking",
        "thinking": "The user wants a React component. I should:\n1. Define the component structure\n2. Add TypeScript types\n3. Include basic styling",
        "signature": "abc123def456"
      },
      {
        "type": "text",
        "text": "I'll create that component for you."
      }
    ]
  }
}
```

**3. With tool use:**

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Let me create that file."
      },
      {
        "type": "tool_use",
        "id": "toolu_xyz123",
        "name": "Write",
        "input": {
          "path": "/src/Component.tsx",
          "contents": "export const Component = () => {...}"
        }
      }
    ]
  }
}
```

**4. Complete example (thinking + text + tool):**

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "thinking",
        "thinking": "I need to create a React component...",
        "signature": "sig123"
      },
      {
        "type": "text",
        "text": "I'll create that component for you."
      },
      {
        "type": "tool_use",
        "id": "toolu_xyz123",
        "name": "Write",
        "input": {
          "path": "/src/Component.tsx",
          "contents": "..."
        }
      }
    ]
  }
}
```

**5. Multiple tool uses:**

```json
{
  "type": "assistant",
  "timestamp": "2026-01-17T20:32:01.123Z",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Let me read the existing code and then update it."
      },
      {
        "type": "tool_use",
        "id": "toolu_read",
        "name": "Read",
        "input": {
          "path": "/src/file.tsx"
        }
      },
      {
        "type": "tool_use",
        "id": "toolu_write",
        "name": "Write",
        "input": {
          "path": "/src/file.tsx",
          "contents": "..."
        }
      }
    ]
  }
}
```

## Summary Event

### Structure

```json
{
  "type": "summary",
  "timestamp": "2026-01-17T21:00:00.000Z",
  "summary": "User requested a React component. Created Component.tsx with TypeScript types and basic styling."
}
```

## Field Specifications

### Timestamps

**Format:** ISO 8601 with timezone  
**Example:** `2026-01-17T20:31:59.197Z`

**Parsing:**
```python
from datetime import datetime
dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
```

**Display format:** `2026-01-17 20:31:59`

### Tool Use ID

**Format:** `toolu_` prefix followed by alphanumeric  
**Example:** `toolu_xyz123abc`

**Usage:** Links tool_use in assistant event to tool_result in user event

### Agent ID

**Format:** Alphanumeric string  
**Example:** `abc123`, `xyz789ABC`

**Detection:** Found in tool result content via regex: `agentId:\s*([a-zA-Z0-9]+)`

### Thinking Signature

**Format:** Alphanumeric hash  
**Example:** `abc123def456`

**Purpose:** Cryptographic verification of thinking block integrity (optional)

## Common Patterns

### Request-Response-Result Flow

**1. User asks:**
```json
{"type": "user", "message": {"content": [{"type": "text", "text": "Create X"}]}}
```

**2. Claude thinks and acts:**
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "thinking", "thinking": "..."},
      {"type": "text", "text": "I'll create X"},
      {"type": "tool_use", "id": "toolu_xyz", "name": "Write", "input": {...}}
    ]
  }
}
```

**3. Tool result comes back:**
```json
{
  "type": "user",
  "message": {
    "content": [
      {"type": "tool_result", "tool_use_id": "toolu_xyz", "content": "Success"}
    ]
  }
}
```

**4. Claude confirms:**
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "text", "text": "✅ Created X successfully"}
    ]
  }
}
```

### Sub-Agent Delegation Flow

**1. Claude decides to delegate:**
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "text", "text": "I'll switch to Plan mode"},
      {"type": "tool_use", "id": "toolu_delegate", "name": "DelegateToAgent", "input": {...}}
    ]
  }
}
```

**2. Delegation result with agentId:**
```json
{
  "type": "user",
  "message": {
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_delegate",
        "content": "agentId: abc123\nPlan mode activated"
      }
    ]
  }
}
```

**3. (Sub-agent conversation happens in separate file)**

**4. Delegation completes:**
```json
{
  "type": "user",
  "message": {
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_delegate",
        "content": "Plan complete: [summary]"
      }
    ]
  }
}
```

## Edge Cases

### Empty content

```json
{
  "type": "user",
  "message": {
    "content": []
  }
}
```
**Handling:** Display "(No content)"

### Content as string (not array)

```json
{
  "type": "assistant",
  "message": {
    "content": "Simple string response"
  }
}
```
**Handling:** Treat as single text item

### Missing fields

```json
{
  "type": "user",
  "message": {}
}
```
**Handling:** Use safe defaults, don't fail

### Malformed JSON

```
{"type": "user", "message": {"content": [{"type": "text"
```
**Handling:** Skip line, log warning, continue

## Schema Validation

### TypeScript Types

```typescript
type Event = UserEvent | AssistantEvent | SummaryEvent;

interface UserEvent {
  type: "user";
  timestamp: string;
  message: {
    role: "user";
    content: ContentItem[];
  };
}

interface AssistantEvent {
  type: "assistant";
  timestamp: string;
  message: {
    role: "assistant";
    content: ContentItem[];
  };
}

interface SummaryEvent {
  type: "summary";
  timestamp: string;
  summary: string;
}

type ContentItem = TextItem | ThinkingItem | ToolUseItem | ToolResultItem;

interface TextItem {
  type: "text";
  text: string;
}

interface ThinkingItem {
  type: "thinking";
  thinking: string;
  signature?: string;
}

interface ToolUseItem {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, any>;
}

interface ToolResultItem {
  type: "tool_result";
  tool_use_id: string;
  content: string | ContentItem[];
  is_error: boolean;
}
```

### Python Validation

```python
def validate_event(event):
    """Validate event structure."""
    
    # Required fields
    if "type" not in event:
        return False, "Missing 'type' field"
    
    if event["type"] not in ["user", "assistant", "summary"]:
        return False, f"Invalid type: {event['type']}"
    
    if "timestamp" not in event:
        return False, "Missing 'timestamp' field"
    
    # Type-specific validation
    if event["type"] in ["user", "assistant"]:
        if "message" not in event:
            return False, "Missing 'message' field"
        
        if "content" not in event["message"]:
            return False, "Missing 'content' field"
    
    elif event["type"] == "summary":
        if "summary" not in event:
            return False, "Missing 'summary' field"
    
    return True, "Valid"
```

## Version Compatibility

Current schema version: **1.0**

**Future changes:**
- New event types should be additive
- Required fields should not change
- Optional fields can be added
- Parsers should skip unknown types gracefully

**Backwards compatibility:**
```python
# Handle unknown event types
event_type = event.get("type", "unknown")

if event_type in KNOWN_TYPES:
    process_event(event)
else:
    log_warning(f"Unknown event type: {event_type}")
    # Still display basic info
    display_generic_event(event)
```
