# Module Map

Quick reference for all modules in the application.

## Frontend Modules (32 files, ~2,600 lines)

### Core Infrastructure (`js/core/`)
| Module | Purpose | Exports |
|--------|---------|---------|
| `EventBus.js` | Pub/sub event system | `EventBus`, `eventBus` singleton |
| `StateManager.js` | Centralized state | `StateManager`, `state` singleton |
| `Component.js` | UI component base class | `Component` |
| `Module.js` | Logic module base class | `Module` |

### Configuration (`js/config/`)
| Module | Purpose | Exports |
|--------|---------|---------|
| `events.js` | Event name constants | `Events` |
| `constants.js` | App constants | `APP_CONFIG` |
| `nodeTypes.js` | Node type definitions | `NODE_TYPES`, `NODE_CONFIG`, `STATUS_CONFIG` |

### Data Layer (`js/data/`)
| Module | Purpose | Exports |
|--------|---------|---------|
| `APIClient.js` | HTTP client for backend | `APIClient`, `APIError` |
| `SessionParser.js` | Parse JSONL events | `SessionParser` |
| `TreeTransformer.js` | Build hierarchical tree | `TreeTransformer` |
| `SubAgentLoader.js` | Load sub-agent sessions | `SubAgentLoader` |
| `NodeFactory.js` | Create typed nodes | `NodeFactory` |
| `FileTracker.js` | Track loaded/missing/failed files | `fileTracker` singleton |

### UI Components (`js/components/`)

#### TreeView
| Module | Purpose |
|--------|---------|
| `TreeView.js` | Main tree component with expand/collapse |

#### DetailPanel
| Module | Purpose |
|--------|---------|
| `DetailPanel.js` | Node detail display |

#### StatsBar
| Module | Purpose |
|--------|---------|
| `StatsBar.js` | Session statistics display |

#### Toolbar
| Module | Purpose |
|--------|---------|
| `Toolbar.js` | Filters and controls |

#### Common
| Module | Purpose |
|--------|---------|
| `SessionHeader.js` | Session metadata display with clickable session ID |
| `SessionFilesModal.js` | Modal for displaying file tracking information |
| `Toast.js` | Toast notifications |
| `LoadingSpinner.js` | Loading indicator |

### Features (`js/features/`)

#### SessionSelector
| Module | Purpose |
|--------|---------|
| `SessionSelector.js` | Project/session browsing UI |

#### Export
| Module | Purpose |
|--------|---------|
| `ExportManager.js` | Export coordinator |
| `exporters/MarkdownExporter.js` | Markdown generator |
| `exporters/HTMLExporter.js` | HTML generator |

#### Search
| Module | Purpose |
|--------|---------|
| `SearchEngine.js` | Content search logic |

#### Filters
| Module | Purpose |
|--------|---------|
| `FilterManager.js` | Type filtering logic |

### Services (`js/services/`)
| Module | Purpose | Exports |
|--------|---------|---------|
| `StorageService.js` | localStorage wrapper | `StorageService` |
| `ConfigService.js` | App configuration | `ConfigService` |
| `IconService.js` | SVG icon management | `IconService` |

### Utilities (`js/utils/`)
| Module | Purpose | Exports |
|--------|---------|---------|
| `date.js` | Date formatting | `formatTimestamp`, `formatTime`, `formatDuration` |
| `dom.js` | DOM helpers | `createElement`, `clearElement`, `toggleClass` |
| `sanitize.js` | XSS prevention | `escapeHtml`, `sanitizeContent` |

### Main Entry Point
| Module | Purpose |
|--------|---------|
| `main.js` | App orchestrator - wires all modules together |

---

## Backend Modules (12 files, ~400 lines)

### Server Core
| Module | Purpose |
|--------|---------|
| `serve.py` | Entry point, starts HTTP server |
| `server/handler.py` | Request router, API dispatcher |

### API Routes (`server/routes/`)
| Module | Endpoint | Purpose |
|--------|----------|---------|
| `projects.py` | `/api/projects` | List all projects |
| `sessions.py` | `/api/sessions` | List sessions for project |
| `session.py` | `/api/session` | Load session file |
| `subagent.py` | `/api/subagent` | Load sub-agent file |

### Utilities (`server/utils/`)
| Module | Purpose |
|--------|---------|
| `security.py` | Path validation, security checks |
| `jsonl.py` | JSONL file parsing |
| `discovery.py` | Session discovery with jq/fallback |

---

## Event Catalog

### App Lifecycle
- `app:ready` - App initialized
- `app:error` - Global error occurred

### Navigation
- `view:change` - Switch between selector/viewer

### Session Discovery
- `projects:load` - Request projects list
- `projects:loaded` - Projects list received
- `sessions:load` - Request sessions list
- `sessions:loaded` - Sessions list received

### Session Loading
- `session:select` - User selected session
- `session:loading` - Loading started
- `session:loaded` - Session loaded and parsed
- `session:error` - Loading failed
- `session:close` - Close session

### Tree Interactions
- `node:select` - Node selected
- `node:toggle` - Expand/collapse node
- `tree:expandAll` - Expand all nodes
- `tree:collapseAll` - Collapse all nodes

### Filters & Search
- `filter:change` - Type filter changed
- `search:change` - Search query changed
- `thinking:toggle` - Toggle thinking visibility

### Modals
- `modal:sessionFiles:open` - Open session files modal
- `modal:sessionFiles:close` - Close session files modal

### Export
- `export:start` - Export initiated
- `export:complete` - Export finished
- `export:error` - Export failed

### Notifications
- `toast:show` - Show toast notification
- `recent:updated` - Recent sessions updated

---

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
  
  fileTracking: {
    loaded: Array<{path, type, agentId, timestamp}>,
    missing: Array<{expectedPath, agentId, detectedIn, timestamp}>,
    failed: Array<{path, error, timestamp}>,
    summary: {
      totalLoaded: number,
      totalMissing: number,
      totalFailed: number
    }
  },
  
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

---

## Data Flow Diagram

```
User Action
    ↓
Event Emitted (EventBus)
    ↓
Handler Module Receives Event
    ↓
Module Processes (Data Layer)
    ↓
State Updated (StateManager)
    ↓
State Change Event Emitted
    ↓
UI Components React
    ↓
DOM Updated
```

---

## Import Graph

```
main.js
├── core/
│   ├── EventBus (no deps)
│   ├── StateManager → EventBus
│   ├── Component → EventBus, StateManager
│   └── Module → EventBus, StateManager
│
├── config/
│   ├── events (no deps)
│   ├── constants (no deps)
│   └── nodeTypes (no deps)
│
├── data/
│   ├── APIClient → Module, Events
│   ├── SessionParser → Module
│   ├── TreeTransformer → Module, NodeFactory
│   ├── SubAgentLoader → Module (+ injected deps)
│   └── NodeFactory → nodeTypes
│
├── components/
│   ├── TreeView → Component, Events, nodeTypes, utils
│   ├── DetailPanel → Component, Events, nodeTypes, utils
│   ├── StatsBar → Component, Events
│   ├── Toolbar → Component, Events
│   └── common/ → Component, Events
│
├── features/
│   ├── SessionSelector → Component, Events
│   ├── Export → Module, Events, exporters
│   ├── Search → Module, Events
│   └── Filters → Module, Events
│
└── services/
    ├── StorageService → Module, Events, constants
    ├── ConfigService → Module, constants
    └── IconService → Module
```

**No circular dependencies!** Clean dependency graph.

---

## Quick Reference: Adding Features

### New Exporter
1. Create `js/features/Export/exporters/NewExporter.js`
2. Implement `export(session, options)` method
3. Set `mimeType` property
4. Register in `ExportManager.js`

### New Component
1. Create `js/components/NewComponent/NewComponent.js`
2. Extend `Component` base class
3. Override `init()`, `bindEvents()`, `render()`
4. Initialize in `main.js`

### New Service
1. Create `js/services/NewService.js`
2. Extend `Module` base class
3. Initialize in `main.js` `initServices()`

### New API Endpoint
1. Create `server/routes/newroute.py`
2. Implement `handle(handler, params)` function
3. Register in `server/handler.py` ROUTES dict
4. Add method to `APIClient.js`

---

## Module Loading Order

1. **Core** (EventBus, StateManager) - Foundation
2. **Config** (events, constants, nodeTypes) - Configuration
3. **Services** (Storage, Config, Icons) - App services
4. **Data** (API, Parser, Transformer, SubAgentLoader) - Data processing
5. **Features** (Search, Filter, Export) - Feature logic
6. **Components** (TreeView, DetailPanel, etc.) - UI
7. **Main** (App orchestrator) - Wiring

This order ensures dependencies are available when needed.

---

## Testing Each Module

See `test.html` for basic module tests.

For comprehensive testing, see `TESTING.md`.
