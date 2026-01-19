# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Claude Session Historian** is a production-ready web application for visualizing and analyzing Claude Code conversation sessions. It parses JSONL session files from `~/.claude/projects/` and provides interactive tree views, filtering, search, and export capabilities.

**Tech Stack**: Vanilla JavaScript (ES6 modules), Python 3, HTML5, CSS3
**Architecture**: Modular, event-driven, component-based
**Status**: Fully implemented and production-ready

## Common Commands

### Start the Application
```bash
cd app
./start.sh
```
Or manually:
```bash
cd app
python3 serve.py
```

Then open: `http://localhost:8000/index.html`

### Run Module Tests
```bash
cd app
./start.sh
# Then open: http://localhost:8000/test.html
```

### Test API Endpoints
```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/projects
curl "http://localhost:8000/api/sessions?project=my-project"
curl "http://localhost:8000/api/session?project=my-project&sessionId=session-abc"
```

## Architecture Overview

### Modular Design Principles

The application follows a **strict modular architecture** with these core principles:

1. **Single Responsibility**: Each module has one clear purpose
2. **Loose Coupling**: Modules communicate via EventBus, never directly
3. **Centralized State**: All shared state managed by StateManager
4. **Dependency Injection**: Dependencies passed in, not hardcoded

### Module Hierarchy

```
Core (EventBus, StateManager, Component, Module)
  ↓
Config (events, constants, nodeTypes)
  ↓
Services (Storage, Config, Icons)
  ↓
Data (APIClient, SessionParser, TreeTransformer, SubAgentLoader)
  ↓
Features (SessionSelector, ExportManager, SearchEngine, FilterManager)
  ↓
Components (TreeView, DetailPanel, StatsBar, Toolbar, Toast)
  ↓
Main (App orchestrator)
```

### Communication Flow

```
User Action
  → EventBus.emit(event, data)
  → Handler updates StateManager.set(key, value)
  → StateManager emits 'state:changed'
  → Components watching state react
  → UI updates
```

### Key Modules

**Core Infrastructure** (`app/js/core/`):
- `EventBus.js`: Pub/sub system - all module communication flows through this
- `StateManager.js`: Single source of truth for application state
- `Component.js`: Base class for UI components (extends Module)
- `Module.js`: Base class for non-UI modules

**Data Layer** (`app/js/data/`):
- `APIClient.js`: HTTP client for backend communication
- `SessionParser.js`: Parses JSONL events into structured data
- `TreeTransformer.js`: Builds hierarchical tree from flat events
- `SubAgentLoader.js`: Detects and recursively loads sub-agent sessions
- `NodeFactory.js`: Creates typed tree nodes

**Backend** (`app/server/`):
- `handler.py`: Request router, registers all API endpoints
- `routes/projects.py`: List all projects from ~/.claude/projects/
- `routes/sessions.py`: List sessions for a project
- `routes/session.py`: Load full session with JSONL parsing
- `routes/subagent.py`: Load sub-agent session
- `utils/security.py`: Path validation (restricts to ~/.claude/)
- `utils/jsonl.py`: JSONL parsing utilities
- `utils/discovery.py`: Session discovery from filesystem

## Critical Development Rules

### ❌ NEVER Do This

1. **Don't read `~/.claude/projects/*/sessions-index.json` with Read tool** - These files can exceed 25,000 tokens. Use `jq`, `grep`, or shell commands instead.
2. **Don't call modules directly** - Always use EventBus for communication
3. **Don't mutate state directly** - Use `StateManager.set()` or `setState()`
4. **Don't create modules without base classes** - Extend `Component` or `Module`
5. **Don't use string literals for events** - Use `Events` constants from `config/events.js`
6. **Don't modify core modules** - `EventBus`, `StateManager`, `Component`, `Module` are foundational
7. **Don't modify `assets/session-viewer_MOCK.jsx`** - It's the golden standard reference

### ✅ ALWAYS Do This

1. **Use EventBus for communication** - Keeps modules decoupled
   ```javascript
   this.emit(Events.SESSION_LOADED, { session });
   ```

2. **Use StateManager for shared state** - Single source of truth
   ```javascript
   this.setState('session', newSession);
   this.watchState('session', ({ value }) => this.render(value));
   ```

3. **Extend base classes** - `Component` for UI, `Module` for logic
   ```javascript
   class MyComponent extends Component {
     init() { /* setup */ }
     bindEvents() { /* subscribe to events */ }
     render(data) { /* update DOM */ }
   }
   ```

4. **Use event constants** - From `config/events.js`
   ```javascript
   import { Events } from './config/events.js';
   this.subscribe(Events.NODE_SELECT, this.handleSelect);
   ```

5. **Handle errors gracefully** - Emit `APP_ERROR` event
   ```javascript
   try {
     // operation
   } catch (error) {
     this.emit(Events.APP_ERROR, { error });
   }
   ```

6. **Consult `.cursor/rules/` before implementing** - Comprehensive guidelines available

## Session File Format

Claude Code stores sessions as JSONL files in `~/.claude/projects/<project-name>/sessions/<session-id>.jsonl`

### JSONL Event Structure
```jsonl
{"type": "user", "timestamp": "2026-01-17T20:31:59.197Z", "message": {...}}
{"type": "assistant", "timestamp": "2026-01-17T20:32:01.123Z", "message": {...}}
```

### Event Types
- **user**: User message (can contain `tool_result` blocks)
- **assistant**: Claude response (can contain `text`, `thinking`, `tool_use` blocks)
- **summary**: Session summary

### Content Block Types
- `text`: Plain text content
- `thinking`: Extended thinking blocks (optional signature)
- `tool_use`: Tool invocation (id, name, input)
- `tool_result`: Tool result (tool_use_id, content, is_error)

### Sub-Agent Detection
Pattern: `agentId:\s*([a-zA-Z0-9]+)` in tool result content
Location: `<session-id>/subagents/agent-<agent-id>.jsonl`

The `SubAgentLoader` automatically detects and recursively loads sub-agents.

## Adding New Features

### Adding a New Component

1. Create file: `app/js/components/MyComponent/MyComponent.js`
2. Extend `Component` base class:
   ```javascript
   import { Component } from '../../core/Component.js';
   import { Events } from '../../config/events.js';

   export class MyComponent extends Component {
     constructor(options = {}) {
       super(options);
       this.container = options.container;
     }

     init() {
       this.render();
     }

     bindEvents() {
       this.subscribe(Events.MY_EVENT, this.handleEvent.bind(this));
     }

     render(data) {
       // Update DOM
     }
   }
   ```
3. Register in `app/js/main.js`:
   ```javascript
   this.modules.myComponent = new MyComponent({
     eventBus,
     state,
     container: document.getElementById('my-component')
   });
   this.modules.myComponent.init();
   ```
4. Test in browser
5. Update `app/MODULE_MAP.md`

### Adding a New API Endpoint

1. **Backend**: Create `app/server/routes/myroute.py`:
   ```python
   def handle(handler, params):
       # Validate params
       # Process request
       handler.send_json({'result': data})
   ```

2. Register in `app/server/handler.py`:
   ```python
   from server.routes import myroute

   ROUTES = {
       # ... existing
       'myroute': myroute.handle
   }
   ```

3. **Frontend**: Add method to `app/js/data/APIClient.js`:
   ```javascript
   async myRoute(params) {
     return this.request('/api/myroute', { params });
   }
   ```

4. Test:
   ```bash
   curl "http://localhost:8000/api/myroute?param=value"
   ```

### Modifying Session Parsing

1. Read `.cursor/rules/session-development.mdc` for event schemas
2. Read `.cursor/rules/data-model.mdc` for data structures
3. Modify `app/js/data/SessionParser.js` or `app/js/data/TreeTransformer.js`
4. Test with real session files from `~/.claude/projects/`
5. Update tests

## State Structure

```javascript
{
  app: {
    view: 'selector' | 'viewer',
    loading: boolean,
    error: Error | null
  },

  session: {
    id: string,
    timestamp: string,
    model: string,
    rootMessages: Node[]
  } | null,

  ui: {
    expandedNodes: string[],
    selectedNodeId: string | null,
    showThinking: boolean,
    filterType: 'all' | 'user' | 'assistant' | 'tool_call' | 'subagent',
    searchQuery: string
  },

  projects: Project[],
  sessions: Session[],
  recentSessions: RecentSession[]
}
```

## Common Event Patterns

### Session Lifecycle
```javascript
Events.SESSION_SELECT  // User selected session
Events.SESSION_LOADING // Loading started
Events.SESSION_LOADED  // Session loaded successfully
Events.SESSION_ERROR   // Loading failed
Events.SESSION_CLOSE   // Close current session
```

### Tree Interactions
```javascript
Events.NODE_SELECT     // Node selected
Events.NODE_TOGGLE     // Expand/collapse node
Events.TREE_EXPAND_ALL // Expand all nodes
Events.TREE_COLLAPSE_ALL // Collapse all nodes
```

### Filters & Search
```javascript
Events.FILTER_CHANGE   // Filter type changed
Events.SEARCH_CHANGE   // Search query changed
Events.THINKING_TOGGLE // Toggle thinking visibility
```

See `app/js/config/events.js` for complete event catalog.

## Documentation Structure

### For Developers (Primary Reference)
- `.cursor/rules/README.md` - **START HERE** - Overview of all rules
- `.cursor/rules/modular-architecture.mdc` - Architecture patterns and principles
- `.cursor/rules/implementation-guide.mdc` - Module reference and common tasks
- `.cursor/rules/session-development.mdc` - Session parsing and format
- `.cursor/rules/data-model.mdc` - Data structures and node types
- `.cursor/rules/claude-code-internals.mdc` - Claude Code internal workings

### For Users
- `app/README.md` - Project overview
- `app/QUICKSTART.md` - 5-minute getting started guide
- `app/USAGE.md` - User guide

### Technical Documentation
- `app/ARCHITECTURE.md` - Technical design decisions
- `app/MODULE_MAP.md` - Complete module catalog
- `app/DEVELOPER_GUIDE.md` - Development workflow
- `app/TESTING.md` - Test checklist

### Reference Specifications
- `references/session-format.md` - JSONL format details
- `references/event-schema.md` - Event type schemas
- `references/subagent-detection.md` - Sub-agent patterns
- `references/session-discovery.md` - Finding sessions
- `references/export-formats.md` - Export specifications

## Security & Performance

### Security
- Backend restricts all file access to `~/.claude/` directory only (enforced in `server/utils/security.py`)
- All user content is sanitized using `utils/sanitize.js`
- Use `textContent` not `innerHTML` for user-generated content
- Path traversal prevention on all file operations

### Performance
- Debounce search input (300ms)
- Lazy load sub-agents (only when expanded)
- Don't keep raw JSONL in memory after parsing
- Use efficient tree flattening algorithms
- Clear old data when loading new sessions

## Development Workflow

### Before Making Changes

**Ask yourself**:
- [ ] Have I read the relevant `.cursor/rules/*.mdc` files?
- [ ] Do I understand the module hierarchy and dependencies?
- [ ] Am I following the event-driven communication pattern?
- [ ] Am I using StateManager for shared state?
- [ ] Am I extending the appropriate base class?
- [ ] Have I checked for existing similar implementations?
- [ ] Will my changes maintain architectural consistency?

### When Starting a Task

1. Read `.cursor/rules/README.md` to understand rule organization
2. Identify which rule file(s) are relevant
3. Read the relevant rule files thoroughly
4. Check existing implementation in `app/` directory
5. Implement following documented patterns
6. Test with real Claude Code session data
7. Document changes in appropriate files

## Key Technologies

- **No build tools required** - Uses native ES6 modules
- **No npm/package.json** - Pure vanilla JavaScript
- **No frameworks** - Custom modular architecture
- **Python 3.7+** for backend server
- **Modern browsers** - Chrome 90+, Firefox 88+, Safari 14+

## Browser Compatibility Requirements

- ES6+ modules
- Fetch API
- localStorage
- CSS Grid/Flexbox
- Optional: TextDecoder for JSONL streaming
