# Testing Checklist

## Pre-flight Checks

- [x] 32 JavaScript modules created
- [x] 12 Python modules created
- [x] 5 CSS files created
- [x] Modular directory structure established
- [x] All base classes implemented (EventBus, StateManager, Component, Module)
- [x] All data layer modules implemented
- [x] All UI components implemented
- [x] All feature modules implemented
- [x] All services implemented
- [x] Backend API with route handlers implemented

## Module Tests

Run `test.html` to verify core modules:
```bash
open http://localhost:8000/test.html
```

Expected results:
- ✓ EventBus: emit and receive
- ✓ StateManager: get and set
- ✓ SessionParser: parse user event
- ✓ TreeTransformer: build tree
- ✓ NodeFactory: create nodes

## Backend API Tests

### Test Server Start
```bash
cd app
python3 serve.py
```

Expected output:
```
✅ Server running at http://localhost:8000/
📂 Serving files from: /path/to/app
🌐 Open http://localhost:8000/index.html in your browser
```

### Test API Endpoints

**Health Check:**
```bash
curl http://localhost:8000/api/health
```
Expected: `{"status": "ok"}`

**List Projects:**
```bash
curl http://localhost:8000/api/projects
```
Expected: `{"projects": [...]}`

**List Sessions:**
```bash
curl "http://localhost:8000/api/sessions?project=<project-name>"
```
Expected: `{"project": "...", "sessions": [...]}`

## Frontend Integration Tests

### 1. Application Loads
- [ ] Open `http://localhost:8000/index.html`
- [ ] No console errors
- [ ] Session selector visible
- [ ] "Claude Session Viewer" title shows

### 2. Server Connection
- [ ] Health check runs automatically
- [ ] Toast notification if server unavailable
- [ ] No errors in console

### 3. Project Discovery
- [ ] Projects load in dropdown
- [ ] Project count shows correctly
- [ ] Can select a project

### 4. Session Discovery
- [ ] Sessions load when project selected
- [ ] Sessions sorted by date (newest first)
- [ ] Session metadata displays (timestamp, prompt preview)
- [ ] Can select a session

### 5. Session Loading
- [ ] Click "Load Session" button
- [ ] Loading spinner shows
- [ ] View switches to viewer
- [ ] Tree renders with nodes
- [ ] Stats bar shows metrics
- [ ] No console errors

### 6. Tree Interaction
- [ ] Can expand/collapse nodes
- [ ] Connection lines render correctly
- [ ] Node colors match types
- [ ] Can select nodes
- [ ] Selected node highlights
- [ ] Descendant count shows when collapsed

### 7. Detail Panel
- [ ] Shows empty state when no selection
- [ ] Updates when node selected
- [ ] Shows correct node type and color
- [ ] Displays timestamp
- [ ] Shows thinking blocks (if present)
- [ ] Shows tool input/output
- [ ] Shows errors in red

### 8. Statistics
- [ ] Total nodes count correct
- [ ] Tool calls count correct
- [ ] Sub-agents count correct
- [ ] Errors count correct
- [ ] Max depth correct
- [ ] Tool time calculated

### 9. Toolbar Controls
- [ ] Filter dropdown works
- [ ] Thinking toggle works (button highlights)
- [ ] Expand all works
- [ ] Collapse all works
- [ ] Search box filters nodes (with 300ms debounce)

### 10. Search Functionality
- [ ] Type in search box
- [ ] Nodes filter after debounce
- [ ] Matching nodes remain visible
- [ ] Clear search shows all nodes

### 11. Export Functionality
- [ ] Click "Export" button
- [ ] Can select Markdown format
- [ ] Can select HTML format
- [ ] Can toggle "Exclude thinking"
- [ ] Download triggers
- [ ] File downloads correctly
- [ ] Content is correct

### 12. Recent Sessions
- [ ] Loaded session added to recent
- [ ] Recent sessions persist (localStorage)
- [ ] Can click recent session to reload
- [ ] Max 10 recent sessions kept

### 13. Navigation
- [ ] Back button returns to selector
- [ ] Session state clears
- [ ] Can load different session

### 14. Sub-Agent Loading
- [ ] Sub-agents detected automatically
- [ ] Sub-agent files load
- [ ] Sub-agent nodes render in tree
- [ ] Sub-agent content shows in detail
- [ ] Nested sub-agents work (if present)

## Error Handling Tests

### Backend Errors
- [ ] Server not running: Shows error toast
- [ ] Project not found: Shows error message
- [ ] Session not found: Shows 404 error
- [ ] Malformed JSONL: Skips bad lines, continues
- [ ] Sub-agent missing: Logs warning, continues

### Frontend Errors
- [ ] Invalid session data: Shows error toast
- [ ] Network timeout: Shows timeout error
- [ ] Parse error: Logs to console, continues
- [ ] Missing container: Component handles gracefully

## Edge Cases

### Empty/Missing Data
- [ ] No projects: Shows empty message
- [ ] No sessions: Shows empty message
- [ ] Empty session: Handles gracefully
- [ ] No sub-agents: Works without them
- [ ] Missing thinking: Doesn't break
- [ ] Missing timestamps: Uses fallback

### Large Sessions
- [ ] 100+ events: Loads and renders
- [ ] 500+ events: Performance acceptable
- [ ] 1000+ events: May be slow (expected)
- [ ] Deep nesting (5+ levels): Renders correctly

### Special Characters
- [ ] Unicode in content: Displays correctly
- [ ] Code blocks in content: Formats properly
- [ ] Long lines: Wraps or scrolls
- [ ] HTML in content: Escaped properly (no XSS)

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

## Mobile/Responsive
- [ ] Narrow viewport: Layout adapts
- [ ] Tree panel scrolls
- [ ] Detail panel scrolls
- [ ] Touch interactions work

## Performance Benchmarks

Measure with browser DevTools:
- [ ] Small session (<50 events): < 500ms load
- [ ] Medium session (50-200 events): < 2s load
- [ ] Large session (200-500 events): < 5s load
- [ ] Tree render: < 100ms
- [ ] Search filter: < 50ms (after debounce)

## Security Tests

- [ ] Path traversal blocked: `../../etc/passwd`
- [ ] Only ~/.claude/ accessible
- [ ] XSS prevented: HTML escaped in content
- [ ] CORS headers present
- [ ] No external API calls

## Module Isolation Tests

Each module should work independently:

```javascript
// Test APIClient alone
const api = new APIClient();
const projects = await api.listProjects();

// Test SessionParser alone
const parser = new SessionParser();
const parsed = parser.parseEvents(rawEvents);

// Test TreeTransformer alone
const transformer = new TreeTransformer();
const tree = transformer.transform(parsedEvents);
```

## Integration Test Scenarios

### Scenario 1: Simple Session
1. Load session with 1 user message, 1 assistant response
2. Verify tree has 2 nodes
3. Verify can select and view details
4. Export to markdown
5. Verify export content

### Scenario 2: Session with Tools
1. Load session with tool calls
2. Verify tool nodes appear
3. Verify input/output shown
4. Verify duration calculated
5. Verify status (success/error) correct

### Scenario 3: Session with Sub-Agent
1. Load session with sub-agent delegation
2. Verify sub-agent node appears
3. Verify sub-agent content loads
4. Verify nested tree structure
5. Verify can navigate sub-agent

### Scenario 4: Session with Errors
1. Load session with failed tool calls
2. Verify error status shows
3. Verify error message displays
4. Verify error count in stats
5. Verify recovery attempts shown (if present)

## Acceptance Criteria

Application is complete when:
- ✅ All modules created and functional
- ✅ Backend API serves all endpoints
- ✅ Frontend loads and renders
- ✅ Can browse and load sessions
- ✅ Tree view displays correctly
- ✅ Detail panel shows information
- ✅ Sub-agents load automatically
- ✅ Export works (markdown and HTML)
- ✅ Recent sessions persist
- ✅ Search and filters work
- ✅ Error handling is graceful
- ✅ Documentation complete

## Known Limitations (v1)

- No live session streaming (planned for v2)
- No virtual scrolling (may be slow for 1000+ events)
- No keyboard shortcuts
- No custom themes (dark mode only)
- No session comparison/diff
- No undo/redo for navigation
