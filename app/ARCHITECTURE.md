# Architecture Documentation

## Modular Design Principles

The Claude Session Viewer is built with a fully modular architecture following these principles:

### 1. Single Responsibility
Each module has one clear purpose:
- `EventBus` only handles pub/sub
- `SessionParser` only parses events
- `TreeView` only renders the tree

### 2. Loose Coupling
Modules communicate via EventBus, not direct imports:
```javascript
// Bad: Direct coupling
treeView.selectNode(node);

// Good: Event-based
eventBus.emit('node:select', { node });
```

### 3. Dependency Injection
Dependencies are passed in, not hardcoded:
```javascript
// Constructor receives dependencies
constructor(options = {}) {
  this.apiClient = options.apiClient;
  this.parser = options.parser;
}
```

### 4. Testability
Each module can be tested in isolation:
```javascript
// Test SessionParser without backend
const parser = new SessionParser();
const result = parser.parseEvents(mockEvents);
assert(result.length === 2);
```

## Module Communication Flow

### Event Flow Example: Loading a Session

```
User clicks "Load Session"
  ↓
SessionSelector emits 'session:select'
  ↓
App.loadSession() handles event
  ↓
APIClient.loadSession() → Backend
  ↓
SessionParser.parseEvents()
  ↓
TreeTransformer.transform()
  ↓
SubAgentLoader.loadSubAgents()
  ↓
State.set('session', tree)
  ↓
EventBus emits 'session:loaded'
  ↓
TreeView, DetailPanel, StatsBar all react
```

### State Flow

```
User action
  ↓
Event emitted
  ↓
Handler updates StateManager
  ↓
StateManager emits 'state:changed'
  ↓
Components subscribed to state react
  ↓
UI updates
```

## Layer Responsibilities

### Core Layer
- **EventBus**: Central nervous system - all communication flows through it
- **StateManager**: Single source of truth - all data stored here
- **Component**: Base for UI - lifecycle, DOM management, cleanup
- **Module**: Base for logic - event handling, state access

### Data Layer
- **APIClient**: Gateway to backend - all HTTP requests
- **SessionParser**: Raw JSONL → Structured data
- **TreeTransformer**: Flat events → Hierarchical tree
- **SubAgentLoader**: Recursive sub-agent loading
- **NodeFactory**: Typed node creation

### UI Layer
- **TreeView**: Visualizes tree structure
- **DetailPanel**: Shows node details
- **StatsBar**: Displays metrics
- **Toolbar**: User controls
- **Toast**: Notifications

### Feature Layer
- **SessionSelector**: Discovery UI
- **ExportManager**: Export coordination
- **SearchEngine**: Content search
- **FilterManager**: Type filtering

### Service Layer
- **StorageService**: Persistence
- **ConfigService**: Configuration
- **IconService**: Icon management

## Extension Points

### Adding a New Node Type

1. Add to `config/nodeTypes.js`:
```javascript
export const NODE_TYPES = {
  // ... existing
  NEW_TYPE: 'new_type'
};

export const NODE_CONFIG = {
  // ... existing
  [NODE_TYPES.NEW_TYPE]: {
    color: '#FF6B6B',
    label: 'NEW',
    icon: 'star'
  }
};
```

2. Add factory method in `NodeFactory.js`:
```javascript
createNewTypeNode({ id, timestamp, ...props }) {
  return {
    id,
    type: NODE_TYPES.NEW_TYPE,
    timestamp,
    ...props,
    children: []
  };
}
```

3. Handle in `TreeView.js` and `DetailPanel.js`

### Adding a New Event

1. Add to `config/events.js`:
```javascript
export const Events = {
  // ... existing
  NEW_EVENT: 'feature:newEvent'
};
```

2. Emit from module:
```javascript
this.emit(Events.NEW_EVENT, { data });
```

3. Subscribe in handler:
```javascript
this.subscribe(Events.NEW_EVENT, ({ data }) => {
  // Handle event
});
```

### Adding a New API Endpoint

1. Create route handler in `server/routes/newroute.py`:
```python
def handle(handler, params):
    # Process request
    handler.send_json({ 'result': data })
```

2. Register in `server/handler.py`:
```python
ROUTES = {
    # ... existing
    'newroute': newroute.handle
}
```

3. Add method to `APIClient.js`:
```javascript
async newRoute(params) {
  return this.request('/api/newroute', { params });
}
```

## Testing Strategy

### Unit Testing
Test individual modules:
```javascript
// Test EventBus
const bus = new EventBus();
let called = false;
bus.on('test', () => called = true);
bus.emit('test');
assert(called === true);
```

### Integration Testing
Test module interactions:
```javascript
// Test session loading flow
const api = new APIClient();
const parser = new SessionParser();
const transformer = new TreeTransformer();

const data = await api.loadSession('project', 'session-id');
const parsed = parser.parseEvents(data.events);
const tree = transformer.transform(parsed);

assert(tree.rootMessages.length > 0);
```

### End-to-End Testing
Test full application flow:
1. Start server
2. Open browser
3. Select project
4. Load session
5. Verify tree renders
6. Export to markdown
7. Verify file downloads

## Performance Considerations

### Large Sessions (1000+ events)
- Virtual scrolling in TreeView (future)
- Lazy sub-agent loading
- Debounced search (300ms)
- Efficient tree flattening

### Memory Management
- Don't keep raw JSONL in memory
- Release parsed events after transformation
- Clear detail panel when switching sessions

### Network Optimization
- Cache project/session lists
- Batch sub-agent requests
- Compress responses (gzip)

## Error Handling

### Backend Errors
All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Frontend Errors
- APIClient throws APIError with status code
- Components catch and emit APP_ERROR event
- Toast shows user-friendly message
- Console logs full error for debugging

### Graceful Degradation
- Skip malformed JSONL lines
- Continue if sub-agent missing
- Show empty state if no data
- Fallback to directory listing if jq unavailable

## Future Enhancements

### v2 Features
- Live session streaming via WebSocket
- Timeline view (horizontal)
- Session comparison/diff
- Plugin system for third-party extensions
- Custom themes
- Keyboard shortcuts
- Export to Obsidian via MCP

### Performance Improvements
- Virtual scrolling for large sessions
- Web Workers for parsing
- IndexedDB for caching
- Service Worker for offline support
