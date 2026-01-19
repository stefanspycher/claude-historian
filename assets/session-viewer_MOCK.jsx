import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Terminal, MessageSquare, Wrench, GitBranch, Clock, Search, Layers, Eye, EyeOff, Zap, AlertCircle, CheckCircle, XCircle, Loader, FileCode, Bot, User } from 'lucide-react';

// Sample session data structure showing the hierarchical + sequential nature
const SAMPLE_SESSION = {
  id: 'session-001',
  timestamp: '2025-01-18T14:32:00Z',
  model: 'claude-sonnet-4',
  rootMessages: [
    {
      id: 'msg-1',
      type: 'user',
      timestamp: '2025-01-18T14:32:00Z',
      content: 'Help me refactor the authentication module to use JWT tokens instead of sessions.',
      children: [
        {
          id: 'msg-2',
          type: 'assistant',
          timestamp: '2025-01-18T14:32:05Z',
          content: 'I\'ll help you refactor the authentication module. Let me first analyze the current implementation.',
          thinking: 'Need to understand current auth flow before proposing changes. Should check for: session management, user model, middleware, routes.',
          children: [
            {
              id: 'tool-1',
              type: 'tool_call',
              name: 'read_file',
              status: 'success',
              timestamp: '2025-01-18T14:32:08Z',
              input: { path: 'src/auth/session.js' },
              output: 'export class SessionManager { ... }',
              duration: 245,
              children: []
            },
            {
              id: 'tool-2',
              type: 'tool_call',
              name: 'read_file',
              status: 'success',
              timestamp: '2025-01-18T14:32:10Z',
              input: { path: 'src/auth/middleware.js' },
              output: 'export const authMiddleware = (req, res, next) => { ... }',
              duration: 189,
              children: []
            },
            {
              id: 'msg-3',
              type: 'assistant',
              timestamp: '2025-01-18T14:32:15Z',
              content: 'I\'ve analyzed the current implementation. Here\'s my plan:\n\n1. Create a new JWT utility module\n2. Modify the user model to support refresh tokens\n3. Update the auth middleware\n4. Migrate existing sessions\n\nShould I proceed with this approach?',
              decision: {
                type: 'user_confirmation',
                question: 'Proceed with JWT migration plan?',
                options: ['Yes, proceed', 'Modify plan', 'Cancel']
              },
              children: [
                {
                  id: 'msg-4',
                  type: 'user',
                  timestamp: '2025-01-18T14:33:00Z',
                  content: 'Yes, proceed. Also add rate limiting.',
                  children: [
                    {
                      id: 'msg-5',
                      type: 'assistant',
                      timestamp: '2025-01-18T14:33:05Z',
                      content: 'Starting the implementation with rate limiting included.',
                      children: [
                        {
                          id: 'subagent-1',
                          type: 'subagent',
                          name: 'Code Writer',
                          status: 'success',
                          timestamp: '2025-01-18T14:33:10Z',
                          task: 'Create JWT utility module with rate limiting',
                          children: [
                            {
                              id: 'tool-3',
                              type: 'tool_call',
                              name: 'write_file',
                              status: 'success',
                              timestamp: '2025-01-18T14:33:12Z',
                              input: { path: 'src/auth/jwt.js' },
                              output: 'File created successfully',
                              duration: 156,
                              children: []
                            },
                            {
                              id: 'tool-4',
                              type: 'tool_call',
                              name: 'write_file',
                              status: 'success',
                              timestamp: '2025-01-18T14:33:15Z',
                              input: { path: 'src/auth/rateLimit.js' },
                              output: 'File created successfully',
                              duration: 134,
                              children: []
                            }
                          ]
                        },
                        {
                          id: 'subagent-2',
                          type: 'subagent',
                          name: 'Test Writer',
                          status: 'running',
                          timestamp: '2025-01-18T14:33:20Z',
                          task: 'Generate unit tests for JWT module',
                          children: [
                            {
                              id: 'tool-5',
                              type: 'tool_call',
                              name: 'write_file',
                              status: 'success',
                              timestamp: '2025-01-18T14:33:22Z',
                              input: { path: 'tests/auth/jwt.test.js' },
                              output: 'File created successfully',
                              duration: 201,
                              children: []
                            },
                            {
                              id: 'tool-6',
                              type: 'tool_call',
                              name: 'bash',
                              status: 'error',
                              timestamp: '2025-01-18T14:33:28Z',
                              input: { command: 'npm test -- --grep "JWT"' },
                              output: 'Error: Cannot find module \'jsonwebtoken\'',
                              duration: 1523,
                              error: 'Missing dependency: jsonwebtoken',
                              children: [
                                {
                                  id: 'tool-7',
                                  type: 'tool_call',
                                  name: 'bash',
                                  status: 'success',
                                  timestamp: '2025-01-18T14:33:35Z',
                                  input: { command: 'npm install jsonwebtoken' },
                                  output: 'added 1 package',
                                  duration: 2341,
                                  children: []
                                },
                                {
                                  id: 'tool-8',
                                  type: 'tool_call',
                                  name: 'bash',
                                  status: 'success',
                                  timestamp: '2025-01-18T14:33:45Z',
                                  input: { command: 'npm test -- --grep "JWT"' },
                                  output: '✓ 12 tests passed',
                                  duration: 3102,
                                  children: []
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Node type configurations
const NODE_CONFIG = {
  user: {
    icon: User,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    label: 'USER'
  },
  assistant: {
    icon: Bot,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    label: 'CLAUDE'
  },
  tool_call: {
    icon: Wrench,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    label: 'TOOL'
  },
  subagent: {
    icon: Zap,
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    label: 'AGENT'
  }
};

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: '#10B981' },
  error: { icon: XCircle, color: '#EF4444' },
  running: { icon: Loader, color: '#3B82F6' },
  pending: { icon: Clock, color: '#6B7280' }
};

// Utility to flatten tree for sequential view
const flattenTree = (nodes, depth = 0, path = []) => {
  const result = [];
  nodes.forEach((node, index) => {
    const currentPath = [...path, index];
    result.push({ ...node, depth, path: currentPath });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1, currentPath));
    }
  });
  return result;
};

// Count descendants
const countDescendants = (node) => {
  if (!node.children?.length) return 0;
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
};

// TreeNode Component
const TreeNode = ({ node, depth, expanded, onToggle, selected, onSelect, showThinking }) => {
  const config = NODE_CONFIG[node.type] || NODE_CONFIG.assistant;
  const StatusIcon = node.status ? STATUS_CONFIG[node.status]?.icon : null;
  const statusColor = node.status ? STATUS_CONFIG[node.status]?.color : null;
  const hasChildren = node.children?.length > 0;
  const descendantCount = countDescendants(node);
  const Icon = config.icon;
  
  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });

  return (
    <div className="tree-node-wrapper">
      {/* Connection lines */}
      <div className="tree-lines" style={{ width: depth * 24 }}>
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} className="tree-line-vertical" style={{ left: i * 24 + 11 }} />
        ))}
        {depth > 0 && <div className="tree-line-horizontal" style={{ left: (depth - 1) * 24 + 11 }} />}
      </div>
      
      <div 
        className={`tree-node ${selected ? 'selected' : ''}`}
        style={{ 
          marginLeft: depth * 24,
          backgroundColor: selected ? config.bgColor : 'transparent',
          borderColor: selected ? config.borderColor : 'transparent'
        }}
        onClick={() => onSelect(node)}
      >
        {/* Expand toggle */}
        <button 
          className="expand-toggle"
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Type indicator */}
        <div className="node-type-badge" style={{ backgroundColor: config.color }}>
          <Icon size={12} strokeWidth={2.5} />
        </div>

        {/* Content preview */}
        <div className="node-content">
          <div className="node-header">
            <span className="node-label" style={{ color: config.color }}>{config.label}</span>
            {node.name && <span className="node-name">{node.name}</span>}
            {node.duration && <span className="node-duration">{node.duration}ms</span>}
            {StatusIcon && (
              <StatusIcon 
                size={14} 
                className={node.status === 'running' ? 'spin' : ''} 
                style={{ color: statusColor }} 
              />
            )}
          </div>
          <div className="node-preview">
            {node.content?.slice(0, 100) || node.task || (node.input?.path) || (node.input?.command) || '...'}
            {(node.content?.length > 100) && '...'}
          </div>
        </div>

        {/* Meta info */}
        <div className="node-meta">
          <span className="node-time">{formatTime(node.timestamp)}</span>
          {descendantCount > 0 && !expanded && (
            <span className="descendant-count">+{descendantCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Detail Panel Component
const DetailPanel = ({ node, onClose }) => {
  if (!node) return (
    <div className="detail-panel empty">
      <div className="empty-state">
        <Layers size={48} strokeWidth={1} />
        <p>Select a node to view details</p>
      </div>
    </div>
  );

  const config = NODE_CONFIG[node.type] || NODE_CONFIG.assistant;
  const Icon = config.icon;
  const StatusIcon = node.status ? STATUS_CONFIG[node.status]?.icon : null;
  const statusColor = node.status ? STATUS_CONFIG[node.status]?.color : null;

  return (
    <div className="detail-panel">
      <div className="detail-header" style={{ borderColor: config.color }}>
        <div className="detail-type" style={{ backgroundColor: config.color }}>
          <Icon size={16} />
          <span>{config.label}</span>
        </div>
        {node.name && <h2 className="detail-name">{node.name}</h2>}
        {node.status && (
          <div className="detail-status" style={{ color: statusColor }}>
            <StatusIcon size={16} className={node.status === 'running' ? 'spin' : ''} />
            <span>{node.status.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="detail-body">
        {/* Timestamp & Duration */}
        <div className="detail-meta-row">
          <div className="meta-item">
            <Clock size={14} />
            <span>{new Date(node.timestamp).toLocaleString()}</span>
          </div>
          {node.duration && (
            <div className="meta-item">
              <Zap size={14} />
              <span>{node.duration}ms</span>
            </div>
          )}
        </div>

        {/* Thinking (for assistant nodes) */}
        {node.thinking && (
          <div className="detail-section thinking">
            <h3><Eye size={14} /> Internal Reasoning</h3>
            <pre>{node.thinking}</pre>
          </div>
        )}

        {/* Decision point */}
        {node.decision && (
          <div className="detail-section decision">
            <h3><GitBranch size={14} /> Decision Point</h3>
            <p className="decision-question">{node.decision.question}</p>
            <div className="decision-options">
              {node.decision.options.map((opt, i) => (
                <span key={i} className="decision-option">{opt}</span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {node.content && (
          <div className="detail-section content">
            <h3><MessageSquare size={14} /> Content</h3>
            <div className="content-body">{node.content}</div>
          </div>
        )}

        {/* Task (for subagents) */}
        {node.task && (
          <div className="detail-section task">
            <h3><Zap size={14} /> Task</h3>
            <div className="content-body">{node.task}</div>
          </div>
        )}

        {/* Tool Input */}
        {node.input && (
          <div className="detail-section input">
            <h3><Terminal size={14} /> Input</h3>
            <pre>{JSON.stringify(node.input, null, 2)}</pre>
          </div>
        )}

        {/* Tool Output */}
        {node.output && (
          <div className="detail-section output">
            <h3><FileCode size={14} /> Output</h3>
            <pre className={node.error ? 'error' : ''}>{node.output}</pre>
          </div>
        )}

        {/* Error */}
        {node.error && (
          <div className="detail-section error">
            <h3><AlertCircle size={14} /> Error</h3>
            <pre className="error">{node.error}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// Statistics Bar
const StatsBar = ({ session, flatNodes }) => {
  const stats = useMemo(() => {
    const toolCalls = flatNodes.filter(n => n.type === 'tool_call');
    const subagents = flatNodes.filter(n => n.type === 'subagent');
    const errors = flatNodes.filter(n => n.status === 'error');
    const totalDuration = toolCalls.reduce((sum, n) => sum + (n.duration || 0), 0);
    
    return {
      totalNodes: flatNodes.length,
      toolCalls: toolCalls.length,
      subagents: subagents.length,
      errors: errors.length,
      maxDepth: Math.max(...flatNodes.map(n => n.depth)),
      totalDuration
    };
  }, [flatNodes]);

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-value">{stats.totalNodes}</span>
        <span className="stat-label">Nodes</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.toolCalls}</span>
        <span className="stat-label">Tool Calls</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.subagents}</span>
        <span className="stat-label">Sub-agents</span>
      </div>
      <div className="stat error">
        <span className="stat-value">{stats.errors}</span>
        <span className="stat-label">Errors</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.maxDepth}</span>
        <span className="stat-label">Max Depth</span>
      </div>
      <div className="stat">
        <span className="stat-value">{(stats.totalDuration / 1000).toFixed(1)}s</span>
        <span className="stat-label">Tool Time</span>
      </div>
    </div>
  );
};

// Main App Component
export default function SessionViewer() {
  const [session] = useState(SAMPLE_SESSION);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['msg-1', 'msg-2', 'msg-3', 'msg-4', 'msg-5']));
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showThinking, setShowThinking] = useState(true);

  const flatNodes = useMemo(() => flattenTree(session.rootMessages), [session]);

  const visibleNodes = useMemo(() => {
    const visible = [];
    const isExpanded = (path) => {
      for (let i = 0; i < path.length - 1; i++) {
        const ancestorPath = path.slice(0, i + 1);
        const node = flatNodes.find(n => n.path.join('-') === ancestorPath.join('-'));
        if (node && !expandedNodes.has(node.id)) return false;
      }
      return true;
    };

    flatNodes.forEach(node => {
      if (isExpanded(node.path)) {
        // Apply filters
        if (filterType !== 'all' && node.type !== filterType) return;
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
            node.content?.toLowerCase().includes(searchLower) ||
            node.name?.toLowerCase().includes(searchLower) ||
            node.task?.toLowerCase().includes(searchLower) ||
            node.input?.path?.toLowerCase().includes(searchLower) ||
            node.input?.command?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return;
        }
        visible.push(node);
      }
    });

    return visible;
  }, [flatNodes, expandedNodes, filterType, searchQuery]);

  const toggleExpand = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandAll = () => setExpandedNodes(new Set(flatNodes.map(n => n.id)));
  const collapseAll = () => setExpandedNodes(new Set());

  return (
    <div className="session-viewer">
      {/* Header */}
      <header className="viewer-header">
        <div className="header-left">
          <div className="logo">
            <Terminal size={20} />
            <span>Session Trace</span>
          </div>
          <div className="session-info">
            <span className="session-id">{session.id}</span>
            <span className="session-model">{session.model}</span>
            <span className="session-time">{new Date(session.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search nodes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Stats */}
      <StatsBar session={session} flatNodes={flatNodes} />

      {/* Toolbar */}
      <div className="toolbar">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="user">User</option>
            <option value="assistant">Assistant</option>
            <option value="tool_call">Tool Calls</option>
            <option value="subagent">Sub-agents</option>
          </select>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => setShowThinking(!showThinking)} className={showThinking ? 'active' : ''}>
            {showThinking ? <Eye size={16} /> : <EyeOff size={16} />}
            Thinking
          </button>
          <button onClick={expandAll}>Expand All</button>
          <button onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Tree Panel */}
        <div className="tree-panel">
          <div className="tree-scroll">
            {visibleNodes.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                depth={node.depth}
                expanded={expandedNodes.has(node.id)}
                onToggle={toggleExpand}
                selected={selectedNode?.id === node.id}
                onSelect={setSelectedNode}
                showThinking={showThinking}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .session-viewer {
          font-family: 'IBM Plex Sans', -apple-system, sans-serif;
          background: #0a0a0b;
          color: #e4e4e7;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: linear-gradient(180deg, #141416 0%, #0f0f10 100%);
          border-bottom: 1px solid #27272a;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          font-size: 15px;
          color: #fafafa;
        }

        .logo svg {
          color: #10B981;
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }

        .session-id {
          color: #71717a;
        }

        .session-model {
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .session-time {
          color: #52525b;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 6px 12px;
        }

        .search-box svg {
          color: #52525b;
        }

        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: #e4e4e7;
          font-size: 13px;
          width: 200px;
        }

        .search-box input::placeholder {
          color: #52525b;
        }

        /* Stats Bar */
        .stats-bar {
          display: flex;
          gap: 1px;
          background: #27272a;
          border-bottom: 1px solid #27272a;
        }

        .stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 16px;
          background: #0f0f10;
        }

        .stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
          font-weight: 600;
          color: #fafafa;
        }

        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #52525b;
          margin-top: 2px;
        }

        .stat.error .stat-value {
          color: #ef4444;
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 20px;
          background: #0f0f10;
          border-bottom: 1px solid #1f1f23;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 12px;
          color: #71717a;
        }

        .filter-group select {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 4px;
          padding: 4px 8px;
          color: #e4e4e7;
          font-size: 12px;
          cursor: pointer;
        }

        .toolbar-actions {
          display: flex;
          gap: 8px;
        }

        .toolbar-actions button {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 4px;
          padding: 4px 10px;
          color: #a1a1aa;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .toolbar-actions button:hover {
          background: #27272a;
          color: #e4e4e7;
        }

        .toolbar-actions button.active {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10B981;
        }

        /* Main Content */
        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Tree Panel */
        .tree-panel {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #1f1f23;
        }

        .tree-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 12px 0;
        }

        .tree-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .tree-scroll::-webkit-scrollbar-track {
          background: #0a0a0b;
        }

        .tree-scroll::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 4px;
        }

        /* Tree Node */
        .tree-node-wrapper {
          position: relative;
        }

        .tree-lines {
          position: absolute;
          top: 0;
          left: 20px;
          bottom: 0;
          pointer-events: none;
        }

        .tree-line-vertical {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #27272a;
        }

        .tree-line-horizontal {
          position: absolute;
          top: 20px;
          width: 12px;
          height: 1px;
          background: #27272a;
        }

        .tree-node {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 16px 8px 20px;
          cursor: pointer;
          border: 1px solid transparent;
          border-radius: 4px;
          margin: 2px 8px;
          transition: all 0.1s;
        }

        .tree-node:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .tree-node.selected {
          border-style: solid;
        }

        .expand-toggle {
          background: none;
          border: none;
          color: #52525b;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .expand-toggle:hover {
          color: #a1a1aa;
        }

        .node-type-badge {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
        }

        .node-content {
          flex: 1;
          min-width: 0;
        }

        .node-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }

        .node-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .node-name {
          font-size: 12px;
          font-weight: 500;
          color: #e4e4e7;
        }

        .node-duration {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #52525b;
        }

        .node-preview {
          font-size: 12px;
          color: #71717a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: 'JetBrains Mono', monospace;
        }

        .node-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }

        .node-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #3f3f46;
        }

        .descendant-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #52525b;
          background: #18181b;
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* Detail Panel */
        .detail-panel {
          width: 420px;
          background: #0f0f10;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .detail-panel.empty {
          justify-content: center;
          align-items: center;
        }

        .empty-state {
          text-align: center;
          color: #3f3f46;
        }

        .empty-state svg {
          margin-bottom: 12px;
        }

        .empty-state p {
          font-size: 13px;
        }

        .detail-header {
          padding: 16px 20px;
          border-bottom: 1px solid #1f1f23;
          border-left: 3px solid;
        }

        .detail-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        }

        .detail-name {
          font-size: 16px;
          font-weight: 600;
          color: #fafafa;
          margin-bottom: 8px;
        }

        .detail-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 500;
        }

        .detail-body {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-meta-row {
          display: flex;
          gap: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #71717a;
        }

        .meta-item svg {
          color: #52525b;
        }

        .detail-section {
          border: 1px solid #1f1f23;
          border-radius: 6px;
          overflow: hidden;
        }

        .detail-section h3 {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #71717a;
          padding: 8px 12px;
          background: #18181b;
          border-bottom: 1px solid #1f1f23;
        }

        .detail-section pre,
        .detail-section .content-body {
          padding: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1.5;
          color: #a1a1aa;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .detail-section pre.error {
          color: #f87171;
          background: rgba(239, 68, 68, 0.05);
        }

        .detail-section.thinking {
          border-color: rgba(16, 185, 129, 0.2);
        }

        .detail-section.thinking h3 {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
        }

        .detail-section.decision {
          border-color: rgba(139, 92, 246, 0.2);
        }

        .detail-section.decision h3 {
          background: rgba(139, 92, 246, 0.1);
          color: #8B5CF6;
        }

        .decision-question {
          padding: 12px;
          font-size: 13px;
          color: #e4e4e7;
          border-bottom: 1px solid #1f1f23;
        }

        .decision-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px;
        }

        .decision-option {
          font-size: 11px;
          padding: 4px 8px;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 4px;
          color: #a1a1aa;
        }

        .detail-section.error {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .detail-section.error h3 {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* Animations */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .main-content {
            flex-direction: column;
          }
          
          .tree-panel {
            border-right: none;
            border-bottom: 1px solid #1f1f23;
            max-height: 50vh;
          }
          
          .detail-panel {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
