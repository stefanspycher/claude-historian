# Cursor Rules for Claude Session Historian

## Overview

This directory contains comprehensive development rules for working with the Claude Session Historian project.

## Rule Files

### 1. `session-development.mdc` (UPDATED)
**Purpose**: Core development guidelines for session parsing and visualization

**Key Topics**:
- Claude session file structure (JSONL format)
- Event types (user, assistant, summary)
- Sub-agent detection patterns
- sessions-index.json handling (CRITICAL: use jq/grep, never Read tool)
- UI architecture reference (session-viewer_MOCK.jsx)
- Data transformation (JSONL → UI tree)
- Error handling and testing

**Updates**:
- Added reference to fully implemented application in `app/`
- Updated UI architecture section to reflect completed implementation
- Maintained all original parsing and format documentation

### 2. `data-model.mdc` (UPDATED)
**Purpose**: Canonical data structure for the session viewer UI

**Key Topics**:
- Root session object structure
- Node types (user, assistant, tool_call, subagent)
- Hierarchical relationships
- Complete example structures
- Transformation rules (JSONL → UI model)
- Validation rules

**Updates**:
- Added references to actual implementation modules
- Noted that `NodeFactory.js` implements node creation
- Noted that `TreeTransformer.js` implements tree building
- Maintained all type definitions and examples

### 3. `claude-code-internals.mdc` (UNCHANGED)
**Purpose**: Internal workings of Claude Code

**Key Topics**:
- Session file locations and structure
- Event schemas and types
- Tool system architecture
- Sub-agent delegation mechanics
- Performance considerations

**Status**: No changes needed (internal documentation)

### 4. `modular-architecture.mdc` (NEW)
**Purpose**: Architectural patterns and rules for the modular implementation

**Key Topics**:
- Core principles (Single Responsibility, Loose Coupling, Dependency Injection)
- Module categories (Core, Config, Data, UI, Features, Services, Utils)
- Communication patterns (EventBus, StateManager)
- Base class usage (Component, Module)
- Extension guidelines
- Anti-patterns to avoid
- Testing strategy
- Performance and security

**Why Created**: Documents the actual modular architecture implemented in `app/`

### 5. `implementation-guide.mdc` (NEW)
**Purpose**: Practical guide to the implemented application

**Key Topics**:
- Module reference (all 32 JS + 12 Python modules)
- State structure
- Event catalog
- Common tasks (adding components, services, API endpoints)
- Debugging techniques
- Testing procedures
- Documentation file locations
- Key implementation details

**Why Created**: Provides quick reference for working with the completed implementation

## Usage Guidelines

### When Starting a New Task

1. **Read `session-development.mdc`** if working with:
   - Session parsing
   - JSONL event handling
   - Sub-agent detection
   - Session discovery
   - Export formats

2. **Read `data-model.mdc`** if working with:
   - UI data structures
   - Node types
   - Tree hierarchy
   - Data transformation

3. **Read `modular-architecture.mdc`** if:
   - Adding new features
   - Creating new modules
   - Understanding communication patterns
   - Following architectural principles

4. **Read `implementation-guide.mdc`** if:
   - Looking for specific module reference
   - Debugging issues
   - Adding components/services
   - Understanding state/events

### When Extending the Application

**Adding a New Component**:
1. Review `modular-architecture.mdc` → "Extending Component" section
2. Review `implementation-guide.mdc` → "Adding a New Component" section
3. Follow the patterns in existing components (`app/js/components/`)

**Adding a New Feature**:
1. Review `modular-architecture.mdc` → "Extension Guidelines"
2. Determine if it's a Component (UI) or Module (logic)
3. Follow event-driven communication patterns
4. Register in `main.js`

**Adding a New API Endpoint**:
1. Review `implementation-guide.mdc` → "Adding a New API Endpoint"
2. Create backend route handler
3. Add frontend APIClient method
4. Test with curl

**Modifying Data Parsing**:
1. Review `session-development.mdc` → Event schemas
2. Review `data-model.mdc` → Data structures
3. Modify `SessionParser.js` or `TreeTransformer.js`
4. Test with real session files

## Critical Rules

### ❌ Never Do This

1. **Don't read sessions-index.json with Read tool** - Use jq/grep/Shell commands
2. **Don't call modules directly** - Use EventBus for communication
3. **Don't mutate state directly** - Use StateManager.set()
4. **Don't create modules without base classes** - Extend Component or Module
5. **Don't use string literals for events** - Use Events constants
6. **Don't modify core modules** - They're foundation, rarely need changes

### ✅ Always Do This

1. **Use EventBus for communication** - Keeps modules decoupled
2. **Use StateManager for shared state** - Single source of truth
3. **Extend base classes** - Component for UI, Module for logic
4. **Use event constants** - From `config/events.js`
5. **Handle errors gracefully** - Emit APP_ERROR event
6. **Clean up resources** - Base classes handle automatically
7. **Document public APIs** - JSDoc comments

## File Locations

### Application Code
- `app/` - Complete implemented application
- `app/js/` - Frontend JavaScript modules
- `app/server/` - Backend Python modules
- `app/css/` - Stylesheets

### Documentation
- `app/README.md` - Project overview
- `app/QUICKSTART.md` - 5-minute guide
- `app/ARCHITECTURE.md` - Technical design
- `app/MODULE_MAP.md` - Module reference
- `app/DEVELOPER_GUIDE.md` - Development guide
- `app/TESTING.md` - Test checklist

### Reference Documentation
- `references/session-format.md` - JSONL format details
- `references/event-schema.md` - Event type schemas
- `references/subagent-detection.md` - Sub-agent patterns
- `references/session-discovery.md` - Finding sessions
- `references/export-formats.md` - Export specifications

### Golden Standard
- `assets/session-viewer_MOCK.jsx` - UI reference (DO NOT MODIFY)

## Quick Reference

### Module Hierarchy
```
Core (EventBus, StateManager, Component, Module)
  ↓
Config (events, constants, nodeTypes)
  ↓
Services (Storage, Config, Icons)
  ↓
Data (API, Parser, Transformer, SubAgentLoader)
  ↓
Features (SessionSelector, Export, Search, Filters)
  ↓
Components (TreeView, DetailPanel, StatsBar, Toolbar)
  ↓
Main (App orchestrator)
```

### Communication Flow
```
User Action
  → Event Emitted (EventBus)
  → Handler Updates State (StateManager)
  → State Change Event Emitted
  → Components React
  → UI Updates
```

### Common Patterns

**Emit Event**:
```javascript
this.emit(Events.SESSION_LOADED, { session });
```

**Subscribe to Event**:
```javascript
this.subscribe(Events.SESSION_LOADED, ({ session }) => {
  this.render(session);
});
```

**Update State**:
```javascript
this.setState('session', newSession);
```

**Watch State**:
```javascript
this.watchState('session', ({ value }) => {
  this.render(value);
});
```

## Testing

### Run Module Tests
```bash
open http://localhost:8000/test.html
```

### Test API
```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/projects
```

### Manual Testing
See `app/TESTING.md` for comprehensive checklist

## Getting Help

1. **Check rule files** in this directory
2. **Check app documentation** in `app/*.md`
3. **Check reference docs** in `references/*.md`
4. **Check browser console** for errors (F12)
5. **Check server logs** in terminal

## Summary

These rules ensure:
- ✅ Consistent architecture
- ✅ Maintainable code
- ✅ Clear communication patterns
- ✅ Proper error handling
- ✅ Security best practices
- ✅ Performance optimization

Follow these rules to maintain code quality and architectural integrity!
