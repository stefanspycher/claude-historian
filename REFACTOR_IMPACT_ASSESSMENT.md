# Refactor Impact Assessment: Switch to Approach A (sessionId-based Agent Detection)

## Executive Summary

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Complexity** | Medium | 6-8 files need changes |
| **Risk Level** | Low-Medium | Core data flow changes, but well-isolated |
| **Breaking Changes** | None | API contracts preserved, UI unchanged |
| **Regression Risk** | Low | Current approach finds 0 agents anyway |
| **Estimated Effort** | 2-4 hours | For a careful implementation |

---

## Current Architecture Analysis

### Data Flow (Current - Approach B)

```
Session Load Request
       │
       ▼
┌──────────────────┐
│   APIClient      │ ──► GET /api/session
│   loadSession()  │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  SessionParser   │ ──► parseEvents()
│  detectAgentInfo │ ◄── Looks for "agentId:" pattern in tool_result
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ TreeTransformer  │ ──► transform()
│                  │ ──► Sets _pendingSubAgent on tool nodes
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ SubAgentLoader   │ ──► loadSubAgents()
│                  │ ──► Walks tree looking for _pendingSubAgent
│                  │ ──► Loads from nested path only
└──────────────────┘
       │
       ▼
   Tree with agents
```

### Problem with Current Flow

1. **SessionParser.detectAgentInfo()** looks for `agentId:\s*([a-zA-Z0-9]+)` pattern
2. **This pattern doesn't exist** in real session data (tested: 0 matches)
3. **_pendingSubAgent is never set** → SubAgentLoader never loads anything
4. **Only nested paths supported** → Flat agents (sidechain) are ignored

---

## Proposed Architecture (Approach A)

### New Data Flow

```
Session Load Request
       │
       ▼
┌──────────────────┐
│   APIClient      │ ──► GET /api/session
│   loadSession()  │
└──────────────────┘
       │
       ▼
┌──────────────────┐     ┌───────────────────┐
│  SessionParser   │     │  AgentDiscovery   │ ◄── NEW MODULE
│  parseEvents()   │     │  discoverAgents() │
└──────────────────┘     └───────────────────┘
       │                          │
       │                          ▼
       │                 ┌───────────────────┐
       │                 │  Backend API      │ ──► GET /api/agents
       │                 │  (new endpoint)   │
       │                 └───────────────────┘
       │                          │
       ▼                          ▼
┌──────────────────┐     Agent mapping:
│ TreeTransformer  │     session → [agentIds]
│ transform()      │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ SubAgentLoader   │ ──► loadSubAgents()
│ (modified)       │ ──► Uses agent mapping instead of _pendingSubAgent
│                  │ ──► Supports both flat and nested paths
└──────────────────┘
       │
       ▼
   Tree with agents
```

---

## Files Requiring Changes

### Frontend (JavaScript)

| File | Change Type | Impact | Risk |
|------|-------------|--------|------|
| `js/data/SubAgentLoader.js` | **Major** | Core logic change | Medium |
| `js/data/APIClient.js` | Minor | Add new endpoint method | Low |
| `js/data/SessionParser.js` | Minor | Remove/deprecate detectAgentInfo | Low |
| `js/data/TreeTransformer.js` | Minor | Remove _pendingSubAgent logic | Low |
| `js/main.js` | Minor | Adjust loading sequence | Low |

### Backend (Python)

| File | Change Type | Impact | Risk |
|------|-------------|--------|------|
| `server/routes/agents.py` | **New** | New endpoint | Low |
| `server/handler.py` | Minor | Register new route | Low |
| `server/utils/security.py` | Minor | Add flat agent path validation | Low |
| `server/routes/subagent.py` | Minor | Support both path structures | Low |

### Total: 8-9 files (5-6 modified, 1 new)

---

## Detailed Change Specifications

### 1. New Backend Endpoint: `/api/agents`

**Purpose**: Discover all agents for a session using Approach A

```python
# server/routes/agents.py (NEW FILE)

def handle(handler, params):
    """Discover agents for a session by reading sessionId from agent files."""
    project = params.get('project')
    session_id = params.get('sessionId')
    
    if not all([project, session_id]):
        handler.send_error_json(400, "Missing required parameters")
        return
    
    agents = discover_agents(project, session_id)
    handler.send_json({
        'sessionId': session_id,
        'agents': agents  # [{agentId, path, type: 'flat'|'nested'}]
    })

def discover_agents(project, session_id):
    """Find all agents that reference this session."""
    agents = []
    project_path = get_project_path(project)
    
    # 1. Check flat agents (in project root)
    for f in glob.glob(os.path.join(project_path, 'agent-*.jsonl')):
        if session_references_match(f, session_id):
            agents.append({
                'agentId': extract_agent_id(f),
                'path': f,
                'type': 'flat'
            })
    
    # 2. Check nested agents (in session/subagents/)
    subagents_dir = os.path.join(project_path, session_id, 'subagents')
    if os.path.exists(subagents_dir):
        for f in glob.glob(os.path.join(subagents_dir, 'agent-*.jsonl')):
            agents.append({
                'agentId': extract_agent_id(f),
                'path': f,
                'type': 'nested'
            })
    
    return agents
```

**Risk**: Low (new code, no existing behavior affected)

---

### 2. Modified SubAgentLoader.js

**Current behavior**: Walks tree looking for `_pendingSubAgent` markers

**New behavior**: Uses agent discovery API, then attaches agents to tree

```javascript
// Key changes to SubAgentLoader.js

async loadSubAgents(tree, project, sessionId, depth = 0) {
  if (depth >= this.maxDepth) {
    console.warn('Max sub-agent depth reached');
    return tree;
  }

  // NEW: Discover agents via API (Approach A)
  const agents = await this.discoverAgents(project, sessionId);
  
  if (agents.length === 0) {
    return tree;
  }
  
  // Load each discovered agent
  for (const agent of agents) {
    const agentKey = `${sessionId}:${agent.agentId}`;
    if (this.loadedAgents.has(agentKey)) continue;
    this.loadedAgents.add(agentKey);
    
    const subAgentNode = await this.loadSubAgent(
      project, sessionId, agent.agentId, depth, agent.type
    );
    
    if (subAgentNode) {
      // Attach to tree root (or find appropriate parent)
      tree.rootMessages.push(subAgentNode);
    }
  }
  
  return tree;
}

async discoverAgents(project, sessionId) {
  try {
    const response = await this.apiClient.discoverAgents(project, sessionId);
    return response.agents || [];
  } catch (error) {
    console.warn('Agent discovery failed:', error);
    return [];
  }
}
```

**Risk**: Medium (core logic change, but isolated to this module)

---

### 3. Modified security.py

**Add support for flat agent paths**:

```python
def validate_agent_path(project, agent_id, agent_type='nested', session_id=None):
    """Validate and return agent file path (flat or nested)."""
    project = os.path.basename(project)
    agent_id = os.path.basename(agent_id)
    
    if agent_type == 'flat':
        path = os.path.join(
            get_claude_dir(),
            "projects",
            project,
            f"agent-{agent_id}.jsonl"
        )
    else:  # nested
        session_id = os.path.basename(session_id)
        path = os.path.join(
            get_claude_dir(),
            "projects",
            project,
            session_id,
            "subagents",
            f"agent-{agent_id}.jsonl"
        )
    
    if is_safe_path(path) and os.path.exists(path):
        return path
    return None
```

**Risk**: Low (additive change, existing function preserved)

---

## Regression Risk Analysis

### What Could Break?

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Existing sessions with nested agents | Low | Nested path support preserved |
| Sessions without agents | None | No change in behavior |
| UI rendering of agents | None | Node structure unchanged |
| Export functionality | None | Data structure unchanged |
| Search/filter on agents | None | Node types unchanged |

### Why Risk is Low

1. **Current approach finds nothing** → Can't regress from 0
2. **API contracts preserved** → `/api/subagent` still works
3. **Node structure unchanged** → UI components unaffected
4. **Additive changes** → New endpoint, new discovery method
5. **Isolated modules** → Changes contained in data layer

### Edge Cases to Test

| Case | Test |
|------|------|
| Session with no agents | Should load normally |
| Session with flat agents only | Should discover and load |
| Session with nested agents only | Should discover and load |
| Session with both types | Should discover and load all |
| Agent referencing multiple sessions | Should appear in both |
| Circular agent references | Max depth should prevent infinite loop |
| Missing agent file | Should log warning, continue |
| Malformed agent file | Should handle gracefully |

---

## Migration Strategy

### Option A: Big Bang (Recommended)

Replace current approach entirely in one PR.

**Pros**:
- Clean codebase
- No dual-path maintenance
- Simpler testing

**Cons**:
- Larger PR
- All-or-nothing

### Option B: Gradual

1. Add new discovery endpoint
2. Add new SubAgentLoader method
3. Use new method, fall back to old
4. Remove old code after validation

**Pros**:
- Safer rollback
- Incremental testing

**Cons**:
- Temporary code duplication
- More complex testing

### Recommendation: Option A

Given that the current approach finds 0 agents, there's no value in maintaining backward compatibility with a non-functional system. A clean replacement is safer and simpler.

---

## Implementation Checklist

### Phase 1: Backend (Low Risk)

- [ ] Create `server/routes/agents.py` with discovery logic
- [ ] Add `validate_agent_path()` to `security.py`
- [ ] Register route in `handler.py`
- [ ] Test endpoint with curl

### Phase 2: Frontend (Medium Risk)

- [ ] Add `discoverAgents()` to `APIClient.js`
- [ ] Modify `SubAgentLoader.js` to use discovery API
- [ ] Update `loadSubAgent()` to handle both path types
- [ ] Remove `_pendingSubAgent` logic from `TreeTransformer.js`
- [ ] Remove/deprecate `detectAgentInfo()` from `SessionParser.js`

### Phase 3: Testing

- [ ] Test with flat agents project (claude-skills-sources)
- [ ] Test with nested agents project (RAG-Setup)
- [ ] Test with mixed project (if exists)
- [ ] Test with no-agents project
- [ ] Verify UI renders agents correctly
- [ ] Verify export includes agents
- [ ] Verify search/filter works on agents

### Phase 4: Cleanup

- [ ] Remove dead code (detectAgentInfo, _pendingSubAgent)
- [ ] Update documentation
- [ ] Update MODULE_MAP.md

---

## Conclusion

### Should You Do This Refactor?

**Yes**, because:

1. **Current approach is broken** (0% detection rate)
2. **New approach is proven** (100% detection rate in tests)
3. **Risk is low** (can't regress from 0)
4. **Changes are isolated** (data layer only)
5. **Effort is reasonable** (2-4 hours)

### Key Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Agents detected (claude-skills-sources) | 0 | 14 |
| Agents detected (RAG-Setup) | 0 | 9 |
| Flat agents supported | No | Yes |
| Nested agents supported | Yes (in theory) | Yes |
| Code complexity | Higher (pattern matching) | Lower (metadata reading) |

### Final Recommendation

**Proceed with refactor using Option A (Big Bang)**. The current implementation is non-functional, so there's no regression risk. The new approach is simpler, more reliable, and comprehensive.
