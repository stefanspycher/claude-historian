# Developer Guide

## Getting Started

### Prerequisites
- Python 3.7+
- Modern browser with ES6+ support
- Text editor
- Basic understanding of JavaScript modules

### First Time Setup
```bash
cd app
./start.sh
```

Open `http://localhost:8000/test.html` to verify modules load correctly.

---

## Understanding the Architecture

### The Three Pillars

1. **EventBus** - All modules communicate via events
2. **StateManager** - Single source of truth for data
3. **Base Classes** - Component (UI) and Module (logic)

### Communication Pattern

```javascript
// Module A emits event
eventBus.emit('session:loaded', { session });

// Module B receives event
eventBus.on('session:loaded', ({ session }) => {
  // React to event
});
```

**No direct module-to-module calls!** This keeps coupling low.

---

## Module Development

### Creating a New UI Component

```javascript
// js/components/MyComponent/MyComponent.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';

export class MyComponent extends Component {
  init() {
    // Setup
    this.data = null;
    this.bindEvents();
  }

  bindEvents() {
    // Subscribe to events (auto-cleanup on destroy)
    this.subscribe(Events.SOME_EVENT, ({ data }) => {
      this.data = data;
      this.render();
    });

    // Watch state changes (auto-cleanup)
    this.watchState('some.path', ({ value }) => {
      this.render();
    });
  }

  render() {
    if (!this.container) return;

    // Use createElement helper
    const element = this.createElement('div', {
      className: 'my-component',
      onClick: () => this.handleClick()
    }, ['Child content']);

    this.container.innerHTML = '';
    this.container.appendChild(element);
  }

  handleClick() {
    // Emit event for other modules
    this.emit(Events.MY_EVENT, { data: this.data });
  }
}
```

**Register in main.js:**
```javascript
import { MyComponent } from './components/MyComponent/MyComponent.js';

// In initUI()
this.modules.myComponent = new MyComponent('#my-container');
```

### Creating a New Service Module

```javascript
// js/services/MyService.js

import { Module } from '../core/Module.js';
import { Events } from '../config/events.js';

export class MyService extends Module {
  init() {
    this.cache = new Map();
    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.SOME_EVENT, ({ data }) => {
      this.processData(data);
    });
  }

  processData(data) {
    // Do work
    const result = this.transform(data);
    
    // Update state
    this.setState('some.path', result);
    
    // Emit event
    this.emit(Events.DATA_PROCESSED, { result });
  }

  transform(data) {
    // Logic here
    return data;
  }
}
```

**Register in main.js:**
```javascript
// In initServices()
this.modules.myService = new MyService();
```

### Creating a New API Endpoint

**Backend (Python):**
```python
# server/routes/myroute.py

def handle(handler, params):
    """Handle my custom route."""
    data = params.get('data')
    
    if not data:
        handler.send_error_json(400, "Missing data parameter")
        return
    
    result = process_data(data)
    handler.send_json({'result': result})
```

**Register in handler.py:**
```python
from .routes import myroute

ROUTES = {
    # ... existing
    'myroute': myroute.handle
}
```

**Frontend (JavaScript):**
```javascript
// In APIClient.js

async myRoute(data) {
  const params = new URLSearchParams({ data });
  return this.request(`/api/myroute?${params}`);
}
```

---

## Event-Driven Development

### Best Practices

**DO:**
- ✅ Emit events for state changes
- ✅ Subscribe in `bindEvents()` method
- ✅ Use event constants from `Events`
- ✅ Include relevant data in event payload
- ✅ Handle errors in event handlers

**DON'T:**
- ❌ Call other modules directly
- ❌ Access other module internals
- ❌ Forget to unsubscribe (base classes handle this)
- ❌ Emit events in tight loops (performance)
- ❌ Use string literals for event names

### Event Naming Convention

Format: `namespace:action`

Examples:
- `session:loaded` - Session was loaded
- `node:select` - Node was selected
- `filter:change` - Filter changed
- `app:error` - Global error occurred

### Event Payload

Always include relevant data:
```javascript
// Good
emit('session:loaded', { session, metadata });

// Bad
emit('session:loaded');  // No data!
```

---

## State Management

### Reading State

```javascript
// In any module
const session = this.getState('session');
const filterType = this.getState('ui.filterType');
```

### Writing State

```javascript
// In any module
this.setState('session', newSession);
this.setState('ui.filterType', 'tool_call');
```

### Watching State

```javascript
// In Component
this.watchState('session', ({ value, oldValue }) => {
  console.log('Session changed:', value);
  this.render();
});
```

### Batch Updates

```javascript
// Update multiple paths at once
state.batch({
  'session': newSession,
  'ui.selectedNodeId': nodeId,
  'ui.expandedNodes': expandedIds
});
```

---

## Common Patterns

### Loading Data Pattern

```javascript
async loadData() {
  this.setState('app.loading', true);
  
  try {
    const data = await this.apiClient.fetchData();
    this.setState('data', data);
    this.emit(Events.DATA_LOADED, { data });
  } catch (error) {
    this.emit(Events.APP_ERROR, { error });
  } finally {
    this.setState('app.loading', false);
  }
}
```

### Rendering Pattern

```javascript
render() {
  if (!this.container) return;
  
  // Clear container
  this.container.innerHTML = '';
  
  // Build elements
  const element = this.buildElement();
  
  // Append
  this.container.appendChild(element);
}

buildElement() {
  return this.createElement('div', {
    className: 'my-element',
    onClick: () => this.handleClick()
  }, [
    this.createElement('span', {}, ['Content'])
  ]);
}
```

### Error Handling Pattern

```javascript
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  this.emit(Events.APP_ERROR, { error });
  this.emit(Events.TOAST_SHOW, {
    message: `Failed: ${error.message}`,
    type: 'error'
  });
}
```

---

## Debugging Tips

### Enable Verbose Logging

```javascript
// In main.js, add after EventBus import
eventBus.on('*', ({ event, data }) => {
  console.log(`[Event] ${event}:`, data);
});
```

### Inspect State

```javascript
// In browser console
console.log(window.state?.state);
```

### Monitor Events

```javascript
// In browser console
window.eventBus?.on('*', console.log);
```

### Check Module Health

```javascript
// In browser console
console.log(window.app?.modules);
```

---

## Testing Your Module

### Unit Test Template

```javascript
// Create test file: js/tests/MyModule.test.js

import { MyModule } from '../path/to/MyModule.js';

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}:`, error);
  }
}

test('MyModule: does something', () => {
  const module = new MyModule();
  const result = module.doSomething();
  if (result !== expected) throw new Error('Wrong result');
});
```

### Integration Test

```javascript
// Test with EventBus
const bus = new EventBus();
const module = new MyModule({ eventBus: bus });

let received = false;
bus.on('my:event', () => received = true);

module.triggerEvent();
assert(received === true);
```

---

## Code Style Guide

### Naming Conventions
- **Classes**: PascalCase (`SessionParser`)
- **Files**: PascalCase matching class (`SessionParser.js`)
- **Functions**: camelCase (`parseEvents`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DEPTH`)
- **Private**: Prefix with underscore (`_internalMethod`)

### File Organization
```javascript
// 1. Imports
import { Module } from '../core/Module.js';

// 2. Class definition
export class MyModule extends Module {
  // 3. Constructor
  constructor(options = {}) {
    super(options);
  }

  // 4. Lifecycle methods
  init() {}

  // 5. Public methods
  publicMethod() {}

  // 6. Private methods
  _privateMethod() {}
}

// 7. Exports (if needed)
export const instance = new MyModule();
```

### Comments
```javascript
/**
 * Public method description.
 * @param {string} param - Parameter description
 * @returns {Object} Return value description
 */
publicMethod(param) {
  // Implementation
}

// Private helper - brief comment
_helper() {}
```

---

## Performance Optimization

### Debouncing
```javascript
import { debounce } from '../utils/debounce.js';

const debouncedSearch = debounce((query) => {
  this.performSearch(query);
}, 300);
```

### Memoization
```javascript
_memoize(fn) {
  const cache = new Map();
  return (key) => {
    if (!cache.has(key)) {
      cache.set(key, fn(key));
    }
    return cache.get(key);
  };
}
```

### Virtual Scrolling (Future)
```javascript
// Only render visible nodes
const visibleRange = this.calculateVisibleRange();
const nodesToRender = allNodes.slice(visibleRange.start, visibleRange.end);
```

---

## Common Issues

### Module Not Loading
- Check import path is correct
- Check file exists
- Check for syntax errors (browser console)
- Verify export statement

### Events Not Firing
- Check event name matches `Events` constant
- Verify subscription happened before emit
- Check handler isn't throwing errors
- Use wildcard listener to debug: `eventBus.on('*', console.log)`

### State Not Updating
- Check path is correct: `'session.id'` not `'session/id'`
- Verify you're using `setState()` not direct mutation
- Check for typos in path
- Use state subscription to debug

### Component Not Rendering
- Check container exists: `document.querySelector(selector)`
- Verify `render()` is called
- Check for errors in render method
- Inspect DOM in browser DevTools

---

## Extending the Application

### Adding a New Exporter

1. Create exporter:
```javascript
// js/features/Export/exporters/PDFExporter.js

export class PDFExporter {
  constructor() {
    this.mimeType = 'application/pdf';
  }

  export(session, options) {
    // Generate PDF content
    return pdfContent;
  }
}
```

2. Register in ExportManager:
```javascript
import { PDFExporter } from './exporters/PDFExporter.js';

this.exporters = {
  // ... existing
  pdf: new PDFExporter()
};
```

3. Add UI option in export modal

### Adding a New Node Type

1. Add to config:
```javascript
// js/config/nodeTypes.js

export const NODE_TYPES = {
  // ... existing
  CUSTOM: 'custom'
};

export const NODE_CONFIG = {
  // ... existing
  [NODE_TYPES.CUSTOM]: {
    color: '#FF6B6B',
    label: 'CUSTOM',
    icon: 'star'
  }
};
```

2. Add factory method:
```javascript
// js/data/NodeFactory.js

createCustomNode({ id, timestamp, ...props }) {
  return {
    id,
    type: NODE_TYPES.CUSTOM,
    timestamp,
    ...props,
    children: []
  };
}
```

3. Handle in parser/transformer
4. Add rendering in TreeView and DetailPanel

---

## Resources

- **Module Map**: See `MODULE_MAP.md` for all modules
- **Architecture**: See `ARCHITECTURE.md` for design details
- **Testing**: See `TESTING.md` for test checklist
- **Usage**: See `USAGE.md` for user guide

---

## Getting Help

1. Check browser console for errors
2. Check server terminal for logs
3. Review module source code (well-commented)
4. Check `TESTING.md` for common issues
5. Use `test.html` to verify core modules

---

## Contributing Guidelines

### Before Making Changes
1. Understand the module you're modifying
2. Check if it affects other modules
3. Review event dependencies
4. Consider state implications

### Making Changes
1. Follow existing code style
2. Add JSDoc comments
3. Handle errors gracefully
4. Test in isolation first
5. Test integration second

### After Changes
1. Verify no console errors
2. Test affected features
3. Update documentation if needed
4. Check performance impact

---

## Module Dependency Graph

```
Core (no deps)
  ├── EventBus
  └── StateManager

Config (no deps)
  ├── events
  ├── constants
  └── nodeTypes

Module/Component (depends on Core)
  ├── Module → EventBus, StateManager
  └── Component → EventBus, StateManager

Everything else depends on Core + Config
```

**Key insight**: Core and Config have no dependencies, so they can be tested/modified independently.

---

## Quick Reference

### Emit Event
```javascript
this.emit(Events.MY_EVENT, { data });
```

### Subscribe to Event
```javascript
this.subscribe(Events.MY_EVENT, ({ data }) => {
  // Handle
});
```

### Update State
```javascript
this.setState('path.to.value', newValue);
```

### Read State
```javascript
const value = this.getState('path.to.value');
```

### Create Element
```javascript
const el = this.createElement('div', {
  className: 'my-class',
  onClick: () => this.handleClick()
}, ['Child text']);
```

### Make API Call
```javascript
const data = await this.apiClient.loadSession(project, sessionId);
```

---

## Performance Tips

1. **Debounce expensive operations** (search, filter)
2. **Memoize pure functions** (calculations, formatters)
3. **Lazy load when possible** (sub-agents, large content)
4. **Clean up subscriptions** (base classes do this automatically)
5. **Avoid re-renders** (check if data actually changed)

---

## Security Checklist

When adding features:
- [ ] Sanitize user input (use `escapeHtml`)
- [ ] Validate backend paths (use security utils)
- [ ] Use `textContent` not `innerHTML` for user data
- [ ] Check CORS headers if adding endpoints
- [ ] Validate file paths on backend

---

## Deployment

### Local Development
```bash
python3 serve.py
```

### Production (Future)
- Could use nginx to serve static files
- Could use gunicorn for Python backend
- Could containerize with Docker
- Could deploy to local network

---

## Troubleshooting Development Issues

### Module Import Errors
- Check file path is correct
- Check export statement exists
- Check for circular dependencies
- Use absolute paths from `js/`

### Event Not Received
- Check event name spelling
- Verify subscription before emit
- Check handler isn't throwing
- Use `eventBus.on('*', console.log)` to debug

### State Not Reactive
- Check you're using `setState()` not direct mutation
- Verify path is correct
- Check subscription is active
- State is immutable - can't modify directly

### Component Not Updating
- Check `render()` is called
- Verify container exists
- Check for errors in render method
- Use browser DevTools to inspect DOM

---

## Best Practices

1. **One module, one responsibility**
2. **Communicate via events, not direct calls**
3. **Update state through StateManager**
4. **Handle errors gracefully**
5. **Clean up resources (base classes help)**
6. **Document public APIs**
7. **Test in isolation first**
8. **Keep modules small (<300 lines)**

---

## Next Steps

After understanding the basics:
1. Read `ARCHITECTURE.md` for design philosophy
2. Explore existing modules as examples
3. Try adding a simple feature
4. Run tests to verify
5. Contribute improvements!

Happy coding! 🚀
