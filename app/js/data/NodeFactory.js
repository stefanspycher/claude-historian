// js/data/NodeFactory.js

import { NODE_TYPES } from '../config/nodeTypes.js';

/**
 * Factory for creating typed tree nodes.
 * Ensures consistent node structure and defaults.
 */
export class NodeFactory {
  /**
   * Create user node
   */
  createUserNode({ id, timestamp, content }) {
    return {
      id,
      type: NODE_TYPES.USER,
      timestamp,
      content: content || '',
      children: []
    };
  }

  /**
   * Create assistant node
   */
  createAssistantNode({ id, timestamp, content, thinking, decision }) {
    return {
      id,
      type: NODE_TYPES.ASSISTANT,
      timestamp,
      content: content || '',
      thinking: thinking || null,
      decision: decision || null,
      children: []
    };
  }

  /**
   * Create tool call node
   */
  createToolNode({ id, timestamp, name, input, status, output, duration, error }) {
    return {
      id,
      type: NODE_TYPES.TOOL_CALL,
      timestamp,
      name,
      input: input || {},
      status: status || 'pending',
      output: output || '',
      duration: duration || 0,
      error: error || null,
      children: []
    };
  }

  /**
   * Create sub-agent node
   */
  createSubAgentNode({ id, timestamp, name, status, task, children }) {
    return {
      id,
      type: NODE_TYPES.SUBAGENT,
      timestamp,
      name: name || 'Agent',
      status: status || 'success',
      task: task || '',
      children: children || []
    };
  }
}
