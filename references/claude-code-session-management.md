# Claude Code Session Management

> Comprehensive documentation for understanding Claude Code's session storage, JSONL format, subagent architecture, and analysis tools.

---

## Table of Contents

1. [Storage Architecture](#storage-architecture)
2. [JSONL Message Format](#jsonl-message-format)
3. [Message Types & Content Blocks](#message-types--content-blocks)
4. [Tool System](#tool-system)
5. [Subagent Architecture](#subagent-architecture)
6. [Branching & Hierarchy](#branching--hierarchy)
7. [Session Lifecycle](#session-lifecycle)
8. [Memory System (CLAUDE.md)](#memory-system-claudemd)
9. [CLI Commands Reference](#cli-commands-reference)
10. [Analysis Tools](#analysis-tools)
11. [Common Patterns & Recipes](#common-patterns--recipes)

---

## Storage Architecture

### Global Storage Location

Claude Code stores all session data in a hidden directory in the user's home folder:

```
~/.claude/
├── projects/                          # All conversation histories
│   └── [encoded-directory-paths]/     # One folder per project path
│       ├── [session-uuid].jsonl       # Full conversation history
│       └── [summary-uuid].jsonl       # Auto-generated summaries
├── settings.json                      # Global user preferences
├── settings.local.json                # Local overrides (not synced)
├── .credentials.json                  # OAuth/authentication
├── agents/                            # User-level custom subagents
├── commands/                          # User-level slash commands
└── statsig/                           # Analytics and telemetry
```

### Path Encoding

Project directories are encoded by replacing forward slashes with hyphens:

| Original Path | Encoded Folder Name |
|---------------|---------------------|
| `/home/user/projects/myapp` | `-home-user-projects-myapp` |
| `/Users/stefan/Code/project` | `-Users-stefan-Code-project` |
| `C:\Users\dev\code` | `-Users-dev-code` (Windows) |

### Project-Specific Files

Each project can have its own Claude Code configuration:

```
project-root/
├── .claude/
│   ├── settings.json           # Project settings (version controlled)
│   ├── settings.local.json     # Local overrides (gitignored)
│   ├── commands/               # Project-specific slash commands
│   ├── agents/                 # Project-specific subagent definitions
│   └── sessions/               # Optional: custom session tracking
├── CLAUDE.md                   # Project memory/context (auto-loaded)
├── CLAUDE.local.md             # Personal project context (gitignored)
└── .mcp.json                   # MCP server configuration
```

### Configuration Hierarchy (Precedence: High → Low)

1. **Managed** (`/etc/claude/` or MDM-deployed) - Enterprise policies
2. **Enterprise** (organization-wide settings)
3. **User** (`~/.claude/settings.json`) - Personal defaults
4. **Project** (`.claude/settings.json`) - Team-shared settings
5. **Local** (`.claude/settings.local.json`) - Personal project overrides

---

## JSONL Message Format

Sessions are stored as **JSONL (JSON Lines)** files where each line is a complete JSON object representing one event.

### Base Message Structure

```json
{
  "parentUuid": "abc123-def456" | null,
  "isSidechain": false,
  "userType": "external",
  "cwd": "/absolute/path/to/project",
  "sessionId": "797df13f-41e5-4ccd-9f00-d6f6b9bee0b3",
  "version": "1.0.38",
  "type": "user" | "assistant" | "summary",
  "gitBranch": "main",
  "message": { /* see below */ },
  "uuid": "d02cab21-cc42-407e-80cb-6305ac542803",
  "timestamp": "2025-01-18T14:32:00.323Z",
  "toolUseResult": { /* optional */ }
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `parentUuid` | `string \| null` | UUID of parent message (for threading/branching) |
| `isSidechain` | `boolean` | Whether this is an alternative conversation branch |
| `userType` | `string` | User classification (`external`, `internal`) |
| `cwd` | `string` | Current working directory at message time |
| `sessionId` | `string` | UUID grouping all messages in one session |
| `version` | `string` | Claude Code version that generated this message |
| `type` | `string` | Top-level message type |
| `gitBranch` | `string` | Active git branch (if in a repo) |
| `message` | `object` | The actual message content (see below) |
| `uuid` | `string` | Unique identifier for this specific message |
| `timestamp` | `string` | ISO-8601 timestamp |
| `toolUseResult` | `object` | Expanded tool result data (optional) |

### Message Object Structure

#### User Message

```json
{
  "role": "user",
  "content": "Help me refactor the authentication module"
}
```

Or with structured content:

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "What's in this file?" },
    { "type": "tool_result", "tool_use_id": "toolu_xxx", "content": "file contents..." }
  ]
}
```

#### Assistant Message

```json
{
  "id": "msg_01SS3c1HZmneNCpZf5WazgHq",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-20250514",
  "content": [
    { "type": "text", "text": "I'll help you refactor..." },
    { 
      "type": "tool_use", 
      "id": "toolu_01ABC123",
      "name": "Read",
      "input": { "file_path": "src/auth/session.js" }
    }
  ],
  "usage": {
    "input_tokens": 15234,
    "output_tokens": 847,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 12000
  },
  "stop_reason": "tool_use" | "end_turn" | "max_tokens"
}
```

---

## Message Types & Content Blocks

### Top-Level Types (`type` field)

| Type | Description |
|------|-------------|
| `user` | Human input (text, files, tool results) |
| `assistant` | Claude response (text, tool calls, thinking) |
| `summary` | Auto-generated session summary (for context compaction) |

### Content Block Types (within `message.content`)

| Type | Location | Description |
|------|----------|-------------|
| `text` | Both | Plain text content |
| `tool_use` | Assistant | Tool invocation request |
| `tool_result` | User | Response to a tool invocation |
| `image` | User | Base64-encoded image |
| `thinking` | Assistant | Extended thinking content (when enabled) |

### Tool Use Block

```json
{
  "type": "tool_use",
  "id": "toolu_01XYZ789",
  "name": "Bash",
  "input": {
    "command": "npm test -- --grep 'auth'",
    "timeout": 30000
  }
}
```

### Tool Result Block

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01XYZ789",
  "content": "✓ 12 tests passed\n✓ 0 tests failed",
  "is_error": false
}
```

---

## Tool System

### Built-in Tools

| Tool | Description | Example Input |
|------|-------------|---------------|
| `Read` | Read file contents | `{ "file_path": "src/index.js" }` |
| `Write` | Create/overwrite file | `{ "file_path": "...", "content": "..." }` |
| `Edit` | Surgical file edit | `{ "file_path": "...", "old_string": "...", "new_string": "..." }` |
| `MultiEdit` | Multiple edits in one file | `{ "file_path": "...", "edits": [...] }` |
| `Bash` | Execute shell command | `{ "command": "npm install", "timeout": 60000 }` |
| `Glob` | Find files by pattern | `{ "pattern": "**/*.ts" }` |
| `Grep` | Search file contents | `{ "pattern": "TODO", "path": "src/" }` |
| `LS` | List directory contents | `{ "path": "src/components" }` |
| `Task` | Spawn subagent | `{ "description": "...", "prompt": "..." }` |
| `WebSearch` | Search the web | `{ "query": "React 19 features" }` |
| `WebFetch` | Fetch URL content | `{ "url": "https://..." }` |
| `NotebookRead` | Read Jupyter notebook | `{ "notebook_path": "analysis.ipynb" }` |
| `NotebookEdit` | Edit notebook cells | `{ "notebook_path": "...", "edits": [...] }` |
| `TodoWrite` | Manage task list | `{ "todos": [...] }` |

### Tool Execution Flow

```
User Request
    ↓
Assistant generates tool_use block
    ↓
Claude Code executes tool locally
    ↓
Result wrapped in tool_result block
    ↓
Sent back as part of next user message
    ↓
Assistant continues with result context
```

---

## Subagent Architecture

### What Are Subagents?

Subagents are isolated Claude instances spawned via the `Task` tool. They operate in their own context window and return summarized results to the main agent.

### Built-in Subagent Types

| Type | Purpose | Available Tools | Context |
|------|---------|-----------------|---------|
| `general-purpose` | Full capability tasks | All tools | Inherits parent context |
| `Explore` | Read-only codebase search | Glob, Grep, Read, limited Bash | Fresh context |
| `Plan` | Architecture planning | Research-focused tools | Inherits parent context |

### Task Tool Invocation

```json
{
  "type": "tool_use",
  "id": "toolu_task_001",
  "name": "Task",
  "input": {
    "description": "Research authentication patterns in the codebase",
    "subagent_type": "general-purpose",
    "prompt": "Find all files related to authentication and summarize the current approach",
    "allowed_tools": ["Read", "Grep", "Glob"]
  }
}
```

### Key Constraints

- **No nested spawning**: Subagents cannot spawn other subagents
- **Single-level hierarchy**: All subagents report directly to main agent
- **Context isolation**: Subagent work doesn't pollute main context
- **Parallel execution**: Multiple subagents can run simultaneously (up to 7)

### Custom Subagent Definition

Custom subagents are defined as Markdown files with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Reviews code for best practices and potential issues
allowed-tools:
  - Read
  - Grep
  - Glob
model: claude-sonnet-4-20250514
---

# Code Reviewer Agent

You are a code review specialist. Analyze code for:
- Security vulnerabilities
- Performance issues
- Code style violations
- Potential bugs

Return a structured report with findings.
```

**Locations:**
- User-level: `~/.claude/agents/`
- Project-level: `.claude/agents/`

---

## Branching & Hierarchy

### Message Threading

Messages form a tree structure via `parentUuid`:

```
msg-1 (user: "Help me refactor auth")
  └── msg-2 (assistant: "I'll analyze first...")
        ├── msg-3 (tool_use: Read)
        ├── msg-4 (tool_use: Read)
        └── msg-5 (assistant: "Here's my plan...")
              └── msg-6 (user: "Yes, proceed")
                    └── msg-7 (assistant: starts implementation)
                          ├── subagent-1 (Task: Code Writer)
                          │     ├── tool-a (Write)
                          │     └── tool-b (Write)
                          └── subagent-2 (Task: Test Writer)
                                ├── tool-c (Write)
                                └── tool-d (Bash: run tests)
```

### Session Forking

The SDK supports forking sessions to create branches:

```javascript
const forkedResponse = query({
  prompt: "Try a different approach",
  options: {
    resume: sessionId,
    forkSession: true  // Creates new session ID from this point
  }
});
```

### Sidechain Conversations

When `isSidechain: true`, the message represents an alternative exploration that doesn't affect the main conversation flow.

---

## Session Lifecycle

### Session States

```
┌─────────────┐
│   Start     │  claude or claude "prompt"
└──────┬──────┘
       ↓
┌─────────────┐
│  Running    │  Active conversation
└──────┬──────┘
       ↓
┌─────────────────────────────────────┐
│  Context Management                  │
│  ├── Auto-compact (at 80% capacity) │
│  ├── /clear (manual reset)          │
│  └── /compact (manual summarize)    │
└──────┬──────────────────────────────┘
       ↓
┌─────────────┐
│    End      │  /exit or terminal close
└──────┬──────┘
       ↓
┌─────────────┐
│  Resumable  │  claude --resume or --continue
└─────────────┘
```

### Context Window Management

| Command | Effect |
|---------|--------|
| `/context` | Show current token usage |
| `/clear` | Reset conversation (lose history) |
| `/compact` | Summarize old messages to free space |
| Auto-compact | Triggers at 80% context capacity |

### Resuming Sessions

```bash
# Continue most recent session
claude --continue

# Resume specific session (interactive picker)
claude --resume

# Resume with specific session ID
claude --resume abc123-def456
```

---

## Memory System (CLAUDE.md)

### File Discovery

Claude Code recursively searches for memory files from `cwd` up to (but not including) root:

```
/home/user/projects/myapp/src/  ← cwd
/home/user/projects/myapp/CLAUDE.md  ← loaded
/home/user/projects/CLAUDE.md  ← loaded
/home/user/CLAUDE.md  ← loaded
~/.claude/CLAUDE.md  ← loaded (user-level)
```

### File Types

| File | Scope | Git Status |
|------|-------|------------|
| `CLAUDE.md` | Shared with team | Tracked |
| `CLAUDE.local.md` | Personal only | Auto-gitignored |
| `.claude/CLAUDE.md` | Alternative location | Tracked |

### Import Syntax

CLAUDE.md files can import other files:

```markdown
# Project Context

See @README.md for project overview.
See @docs/architecture.md for system design.
See @package.json for available scripts.
```

### Conditional Rules

Rules can be scoped to specific file patterns:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All endpoints must include input validation
- Use standard error response format
- Include OpenAPI documentation comments
```

---

## CLI Commands Reference

### Startup Options

```bash
claude                          # Start interactive session
claude "prompt"                 # Start with initial prompt
claude --resume                 # Resume previous session (picker)
claude --resume <session-id>    # Resume specific session
claude --continue               # Continue most recent session
claude -p "prompt"              # Print mode (non-interactive)
claude --output-format json     # JSON output for scripting
```

### Slash Commands (In-Session)

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Reset conversation history |
| `/compact` | Summarize to free context |
| `/context` | Show token usage |
| `/cost` | Display session costs |
| `/config` | Open configuration |
| `/memory` | Edit memory files |
| `/permissions` | Manage tool permissions |
| `/model` | Switch model |
| `/exit` | End session |

### Memory Shortcuts

During conversation, prefix with `#` to add to memory:

```
# This project uses PostgreSQL with Docker
# API follows REST conventions
# All migrations must be backward compatible
```

---

## Analysis Tools

### Official & Community Tools

| Tool | Description | Link |
|------|-------------|------|
| **claude-code-transcripts** | Convert JSONL to HTML/Markdown, publish to Gist | [github.com/simonw/claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) |
| **claude-code-log** | TUI + HTML viewer with filtering, timeline | [github.com/daaain/claude-code-log](https://github.com/daaain/claude-code-log) |
| **claude-JSONL-browser** | Web-based multi-file viewer | [github.com/withLinda/claude-JSONL-browser](https://github.com/withLinda/claude-JSONL-browser) |
| **clog** | Real-time monitoring viewer | [github.com/HillviewCap/clog](https://github.com/HillviewCap/clog) |
| **claude-sessions** | Custom slash commands for session tracking | [github.com/iannuttall/claude-sessions](https://github.com/iannuttall/claude-sessions) |

### Quick Analysis Commands

```bash
# List all project histories
ls -la ~/.claude/projects/

# Find history for current directory
ENCODED=$(pwd | sed 's/\//-/g')
ls -la ~/.claude/projects/$ENCODED/

# Count messages in a session
wc -l ~/.claude/projects/$ENCODED/*.jsonl

# Extract all user messages
grep '"type":"user"' ~/.claude/projects/$ENCODED/*.jsonl | jq -r '.message.content'

# Find sessions by date
find ~/.claude/projects/ -name "*.jsonl" -mtime -7

# Validate JSONL files
for file in ~/.claude/projects/*/*.jsonl; do
  jq empty "$file" 2>/dev/null || echo "Invalid: $file"
done

# Analyze with DuckDB
duckdb -c "
  SELECT 
    json_extract_string(line, '$.type') as type,
    COUNT(*) as count
  FROM read_json_auto('session.jsonl')
  GROUP BY type
"
```

### Prevent Auto-Deletion

By default, Claude Code deletes sessions after 30 days. To extend:

```json
// ~/.claude/settings.json
{
  "sessionRetentionDays": 100000
}
```

---

## Common Patterns & Recipes

### Pattern: Session Documentation Workflow

```markdown
# .claude/commands/session-start.md
---
description: Start a documented development session
---

Create a new session file in .claude/sessions/ with format:
YYYY-MM-DD-HHMM-$ARGUMENTS.md

Track: goals, decisions, files modified, issues encountered.
```

### Pattern: Parallel Research

```markdown
# .claude/commands/research.md
---
description: Research a topic using parallel subagents
allowed-tools: Task, WebSearch, Read, Grep
---

Launch 3 parallel subagents:
1. Web search for documentation
2. Codebase search for existing patterns
3. Stack Overflow for common solutions

Synthesize findings into a report.
```

### Pattern: Context Recovery

When context gets too large:

1. Have Claude document current state to a `.md` file
2. `/clear` the session
3. Start new session referencing the state file
4. Continue work with fresh context

### Pattern: Export Session for Review

```bash
# Using claude-code-transcripts
pip install claude-code-transcripts

# Convert to HTML
claude-code-transcripts web SESSION_ID -o ./review/

# Convert all sessions
claude-code-transcripts all -o ./archive/
```

---

## Schema Reference (TypeScript)

```typescript
interface ClaudeCodeMessage {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: 'external' | 'internal';
  cwd: string;
  sessionId: string;
  version: string;
  type: 'user' | 'assistant' | 'summary';
  gitBranch?: string;
  message: MessageContent;
  uuid: string;
  timestamp: string;
  toolUseResult?: Record<string, unknown>;
}

interface MessageContent {
  id?: string;
  type?: 'message';
  role: 'user' | 'assistant';
  model?: string;
  content: string | ContentBlock[];
  usage?: TokenUsage;
  stop_reason?: 'tool_use' | 'end_turn' | 'max_tokens';
}

type ContentBlock = 
  | TextBlock 
  | ToolUseBlock 
  | ToolResultBlock 
  | ImageBlock 
  | ThinkingBlock;

interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}
```

---

## References

- [Claude Code Official Docs - Memory](https://code.claude.com/docs/en/memory)
- [Claude Code Official Docs - Settings](https://code.claude.com/docs/en/settings)
- [Claude Code Official Docs - Subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Agent SDK - Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [Claude Agent SDK - Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [DeepWiki - Session Management](https://deepwiki.com/anthropics-claude/claude-code/2.3-session-management)
- [ClaudeLog - Configuration Guide](https://claudelog.com/configuration/)

---

*Last updated: January 2025*
