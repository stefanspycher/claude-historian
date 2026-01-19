# Agent Detection Approaches: Comparison Report

## Executive Summary

Two approaches were tested for detecting agent-session relationships in Claude Code projects:

1. **Approach A** (Reference: `analyze_sessions.py`): Read `sessionId` field from agent files
2. **Approach B** (Current app): Parse `agentId:` patterns from tool results in session files

**Result**: The approaches produce **completely different results** (0% overlap), revealing that they detect different types of agent relationships.

---

## Test Results

### Test Project 1: `-Users-sspycher-Code-Claude-claude-skills-sources`

**Files Found**:
- Session files: 7
- Agent files: 12 (all flat in project root)

**Approach A Results**:
- Sessions with agents: 6
- Total mappings: 14

**Approach B Results**:
- Sessions with agents: 0
- Total mappings: 0

**Difference**: 100% mismatch (Approach B found nothing)

### Test Project 2: `-Users-sspycher-RAG-Setup`

**Files Found**:
- Session files: 4
- Agent files: 9 (all in nested `<session-id>/subagents/` directories)

**Approach A Results**:
- Sessions with agents: 3
- Total mappings: 9

**Approach B Results**:
- Sessions with agents: 0
- Total mappings: 0

**Difference**: 100% mismatch (Approach B found nothing)

---

## Why Approach B Found Nothing

Investigation revealed that:

1. **No `agentId:` patterns exist in tool results**
   - Searched session files for the pattern `agentId: <id>`
   - Found zero occurrences

2. **No SwitchMode tool uses**
   - The current app assumes agents are spawned via `SwitchMode` tool
   - Searched for `SwitchMode` tool uses in sessions
   - Found zero occurrences

3. **Different agent creation mechanism**
   - The agents in these projects were created through a different mechanism
   - Likely older "sidechain" agents or a different delegation pattern

---

## Agent File Structures

### Flat Structure (Older Projects)
```
project-root/
├── session-uuid.jsonl
├── agent-a1b2c3d.jsonl  ← Flat in project root
└── agent-e4f5g6h.jsonl
```

**Characteristics**:
- Agent files stored directly in project root
- Marked with `"isSidechain": true`
- Can reference multiple sessions
- Example: One agent referenced 2 different sessions

### Nested Structure (Newer Projects)
```
project-root/
├── session-uuid.jsonl
└── session-uuid/
    └── subagents/
        ├── agent-a1b2c3d.jsonl  ← Nested in session subdirectory
        └── agent-e4f5g6h.jsonl
```

**Characteristics**:
- Agent files stored in `<session-id>/subagents/` directory
- Each agent belongs to one session (by directory structure)
- Contains `sessionId` field pointing to parent session

---

## Agent File Content Example

From `agent-a3bf5b5.jsonl`:

```json
{"parentUuid":null,"isSidechain":true,"userType":"external","cwd":"/Users/sspycher/Code/Claude/claude-skills/sources","sessionId":"5df05d31-3836-4a1d-a638-a46b7c8b8888","version":"2.0.65","gitBranch":"main","agentId":"a3bf5b5","type":"user","message":{"role":"user","content":"Warmup"},"uuid":"c3d4a958-01a9-469d-90c0-8a466e70b4df","timestamp":"2025-12-30T05:30:22.141Z"}
{"parentUuid":"c3d4a958-01a9-469d-90c0-8a466e70b4df","isSidechain":true,"userType":"external","cwd":"/Users/sspycher/Code/Claude/claude-skills/sources","sessionId":"4aff69eb-f51c-4cc7-9e7f-190b0b096c40","version":"2.0.65","gitBranch":"main","agentId":"a3bf5b5",...}
```

**Key observations**:
- Each line has `"sessionId"` field (the parent session)
- Each line has `"agentId"` field (this agent's ID)
- Has `"isSidechain": true` flag
- This agent references TWO different sessions!

---

## Approach Comparison

| Aspect | Approach A (sessionId in agents) | Approach B (agentId in sessions) |
|--------|----------------------------------|----------------------------------|
| **What it finds** | All agents that reference a session | Agents explicitly mentioned in session tool results |
| **Detection method** | Read agent files, extract `sessionId` | Parse session files, find `agentId:` pattern |
| **Coverage** | Comprehensive (finds all agents) | Selective (only finds explicitly mentioned agents) |
| **File structure** | Works with both flat and nested | Expects specific tool result format |
| **Performance** | Must read all agent files | Only reads session files |
| **Reliability** | Based on metadata (reliable) | Based on content patterns (fragile) |
| **Results on test data** | Found 23 agent relationships | Found 0 agent relationships |

---

## Key Insights

### 1. Different Agent Types

There appear to be at least two types of agents:

**Sidechain Agents** (older):
- Stored flat in project root
- Marked with `isSidechain: true`
- Can work across multiple sessions
- Detected by Approach A ✓
- Detected by Approach B ✗

**Sub-Agents** (newer):
- Stored in `<session-id>/subagents/`
- Created via `SwitchMode` tool (in theory)
- Should have `agentId:` in tool results (in theory)
- Detected by Approach A ✓
- Detected by Approach B ✗ (even for these!)

### 2. The `agentId:` Pattern May Not Exist

The current app assumes that when an agent is spawned, the tool result will contain:

```
agentId: a1b2c3d
```

**Reality**: This pattern doesn't appear in the tested sessions, even for nested sub-agents.

### 3. Approach A is More Reliable

Approach A works by reading the **metadata** that Claude Code writes into agent files:
- Every agent file contains `sessionId` field
- This is reliable, structured data
- Works for all agent types (sidechain and sub-agents)

Approach B relies on **content patterns** that may not exist:
- Assumes `agentId:` appears in tool results
- This pattern was not found in real data
- Fragile and incomplete

---

## Recommendations

### For the Session Historian App

1. **Adopt Approach A as primary detection method**
   - More reliable and comprehensive
   - Works with both flat and nested structures
   - Based on metadata, not content patterns

2. **Keep Approach B as fallback**
   - May work for some session types
   - Useful for detecting delegation intent even if agent file is missing

3. **Support both agent structures**
   - Scan project root for `agent-*.jsonl` (flat)
   - Scan `<session-id>/subagents/` for nested agents

4. **Update SubAgentLoader**
   - Add method to scan for all agent files
   - Read `sessionId` from agent files
   - Build session→agent mapping upfront

### Implementation Strategy

```javascript
class AgentDiscovery {
  async discoverAgents(project) {
    // 1. Find all agent files (flat + nested)
    const flatAgents = await this.findFlatAgents(project);
    const nestedAgents = await this.findNestedAgents(project);
    
    // 2. Read sessionId from each agent file
    const mapping = new Map(); // sessionId -> [agentIds]
    
    for (const agentFile of [...flatAgents, ...nestedAgents]) {
      const sessionIds = await this.extractSessionIds(agentFile);
      for (const sessionId of sessionIds) {
        if (!mapping.has(sessionId)) mapping.set(sessionId, []);
        mapping.get(sessionId).push(agentFile.id);
      }
    }
    
    return mapping;
  }
}
```

---

## Conclusion

The two approaches detect **fundamentally different things**:

- **Approach A**: "Which agents reference this session?" (comprehensive)
- **Approach B**: "Which agents are mentioned in this session?" (incomplete)

For a session historian that aims to show the complete conversation tree including all agents, **Approach A is essential**. Approach B can complement it but cannot replace it.

The test data shows that relying solely on Approach B would result in **missing 100% of agent relationships** in the tested projects.

---

## Test Data Summary

| Project | Sessions | Agents | Flat | Nested | A Found | B Found | Match |
|---------|----------|--------|------|--------|---------|---------|-------|
| claude-skills-sources | 7 | 12 | 12 | 0 | 14 mappings | 0 | 0% |
| RAG-Setup | 4 | 9 | 0 | 9 | 9 mappings | 0 | 0% |
| **Total** | **11** | **21** | **12** | **9** | **23** | **0** | **0%** |

**Conclusion**: In real-world data, Approach B found nothing while Approach A found all relationships.
