#!/usr/bin/env python3
"""
Analyze agent files to extract their parent sessionId.
Creates a tree view of sessions with their child agents.
"""

import json
import re
from pathlib import Path
from collections import defaultdict

def is_session_file(filename):
    """Check if filename matches session pattern: 5 alphanumeric blocks"""
    pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jsonl$'
    return bool(re.match(pattern, filename))

def is_agent_file(filename):
    """Check if filename matches agent pattern: agent-{block}.jsonl"""
    pattern = r'^agent-[a-f0-9]{7}\.jsonl$'
    return bool(re.match(pattern, filename))

def extract_session_id_from_agent(agent_path):
    """Extract sessionId from an agent file by parsing its JSON lines"""
    session_ids = set()
    
    try:
        with open(agent_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    if 'sessionId' in data:
                        session_ids.add(data['sessionId'])
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"Error reading {agent_path}: {e}")
    
    return session_ids

def main():
    search_dir = Path('/Users/sspycher/.claude/projects/-Users-sspycher-Code-Claude-claude-skills-sources')
    
    # Find all session and agent files
    all_files = list(search_dir.glob('*.jsonl'))
    
    session_files = {f.name: f for f in all_files if is_session_file(f.name)}
    agent_files = [f for f in all_files if is_agent_file(f.name)]
    
    print(f"Found {len(session_files)} session files")
    print(f"Found {len(agent_files)} agent files")
    print()
    
    # Build mapping: session_id -> list of agent files
    session_to_agents = defaultdict(list)
    agent_to_sessions = {}
    
    for agent_file in agent_files:
        session_ids = extract_session_id_from_agent(agent_file)
        agent_to_sessions[agent_file.name] = session_ids
        
        for session_id in session_ids:
            session_filename = f"{session_id}.jsonl"
            session_to_agents[session_filename].append(agent_file.name)
    
    # Print tree view
    print("=" * 80)
    print("SESSION → AGENT TREE VIEW (based on agent sessionId references)")
    print("=" * 80)
    print()
    
    # First show sessions that have agents
    sessions_with_agents = sorted([s for s in session_to_agents.keys() if session_to_agents[s]])
    sessions_without_agents = sorted([s for s in session_files.keys() if s not in session_to_agents or not session_to_agents[s]])
    
    for session_name in sessions_with_agents:
        agents = sorted(session_to_agents[session_name])
        exists = "✓" if session_name in session_files else "✗ (file not found)"
        
        print(f"📁 {session_name} {exists}")
        for i, agent_name in enumerate(agents):
            is_last = (i == len(agents) - 1)
            prefix = "└── " if is_last else "├── "
            print(f"   {prefix}{agent_name}")
        print()
    
    # Then show sessions without agents
    if sessions_without_agents:
        print("Sessions without agent references:")
        for session_name in sessions_without_agents:
            print(f"📁 {session_name} (no agents)")
        print()
    
    # Show orphaned agents (agents referencing non-existent sessions)
    orphaned_agents = []
    for agent_name, session_ids in agent_to_sessions.items():
        for session_id in session_ids:
            session_filename = f"{session_id}.jsonl"
            if session_filename not in session_files:
                orphaned_agents.append((agent_name, session_filename))
    
    if orphaned_agents:
        print("=" * 80)
        print("ORPHANED AGENTS (referencing non-existent sessions)")
        print("=" * 80)
        for agent_name, missing_session in sorted(orphaned_agents):
            print(f"⚠️  {agent_name} → {missing_session} (session file not found)")
        print()
    
    # Summary statistics
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total_sessions = len(session_files)
    sessions_with_agents_count = len(sessions_with_agents)
    sessions_without_agents_count = len(sessions_without_agents)
    total_agents = len(agent_files)
    total_mappings = sum(len(agents) for agents in session_to_agents.values())
    
    print(f"Total session files found: {total_sessions}")
    print(f"Sessions with agents: {sessions_with_agents_count}")
    print(f"Sessions without agents: {sessions_without_agents_count}")
    print(f"Total agent files: {total_agents}")
    print(f"Total session→agent mappings: {total_mappings}")
    print(f"Orphaned agents: {len(orphaned_agents)}")
    
    # Agent details
    if agent_to_sessions:
        print()
        print("Agent → Session mappings:")
        for agent_name in sorted(agent_to_sessions.keys()):
            sessions = sorted(agent_to_sessions[agent_name])
            if sessions:
                session_list = ", ".join(sessions)
                print(f"  {agent_name} → {session_list}")
            else:
                print(f"  {agent_name} → (no sessionId found)")

if __name__ == '__main__':
    main()
