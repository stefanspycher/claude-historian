// js/config/nodeTypes.js

/**
 * Node type constants and configuration.
 */
export const NODE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL_CALL: 'tool_call',
  SUBAGENT: 'subagent'
};

export const NODE_CONFIG = {
  [NODE_TYPES.USER]: {
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    label: 'USER',
    icon: 'user'
  },
  [NODE_TYPES.ASSISTANT]: {
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    label: 'CLAUDE',
    icon: 'bot'
  },
  [NODE_TYPES.TOOL_CALL]: {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    label: 'TOOL',
    icon: 'wrench'
  },
  [NODE_TYPES.SUBAGENT]: {
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    label: 'AGENT',
    icon: 'zap'
  }
};

export const STATUS_CONFIG = {
  success: { color: '#10B981', icon: 'check-circle' },
  error: { color: '#EF4444', icon: 'x-circle' },
  running: { color: '#3B82F6', icon: 'loader' },
  pending: { color: '#6B7280', icon: 'clock' }
};
