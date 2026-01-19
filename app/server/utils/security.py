"""Security utilities for path validation."""

import os

def get_claude_dir():
    """Get ~/.claude directory."""
    return os.path.expanduser("~/.claude")

def is_safe_path(path):
    """Validate path is within ~/.claude directory."""
    safe_prefix = get_claude_dir()
    real_path = os.path.realpath(path)
    return real_path.startswith(safe_prefix)

def validate_session_path(project, session_id):
    """Validate and return session file path."""
    # Sanitize inputs
    project = os.path.basename(project)
    session_id = os.path.basename(session_id)
    
    path = os.path.join(
        get_claude_dir(),
        "projects",
        project,
        f"{session_id}.jsonl"
    )
    
    if is_safe_path(path) and os.path.exists(path):
        return path
    return None

def validate_subagent_path(project, session_id, agent_id):
    """Validate and return sub-agent file path (nested structure only).
    
    Deprecated: Use validate_agent_path() for both flat and nested agents.
    """
    project = os.path.basename(project)
    session_id = os.path.basename(session_id)
    agent_id = os.path.basename(agent_id)
    
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


def validate_agent_path(project, agent_id, agent_type='nested', session_id=None):
    """Validate and return agent file path (supports both flat and nested).
    
    Args:
        project: Project name
        agent_id: Agent ID (7-char hex)
        agent_type: 'flat' (project root) or 'nested' (session/subagents/)
        session_id: Required for nested agents
        
    Returns:
        Validated path if safe and exists, None otherwise
    """
    project = os.path.basename(project)
    agent_id = os.path.basename(agent_id)
    
    if agent_type == 'flat':
        # Flat agents: ~/.claude/projects/<project>/agent-<id>.jsonl
        path = os.path.join(
            get_claude_dir(),
            "projects",
            project,
            f"agent-{agent_id}.jsonl"
        )
    else:
        # Nested agents: ~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl
        if not session_id:
            return None
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
