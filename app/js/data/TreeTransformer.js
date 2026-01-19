// js/data/TreeTransformer.js

import { Module } from '../core/Module.js';
import { NodeFactory } from './NodeFactory.js';

/**
 * Transforms flat events into hierarchical tree structure.
 * Matches tool uses with results, builds parent-child relationships.
 */
export class TreeTransformer extends Module {
  constructor(options = {}) {
    super(options);
    this.nodeFactory = new NodeFactory();
  }

  /**
   * Transform parsed events into tree
   */
  transform(parsedEvents, metadata = {}) {
    const context = {
      rootMessages: [],
      pendingTools: new Map(),
      currentUserNode: null,
      currentAssistantNode: null,
      nodeIdCounter: 0
    };

    for (const event of parsedEvents) {
      this.processEvent(event, context);
    }

    return {
      id: metadata.sessionId || this.generateId(),
      timestamp: parsedEvents[0]?.timestamp || new Date().toISOString(),
      model: metadata.model || 'claude-sonnet-4',
      rootMessages: context.rootMessages
    };
  }

  /**
   * Process single event
   */
  processEvent(event, context) {
    switch (event.type) {
      case 'user':
        this.processUserEvent(event, context);
        break;
      case 'assistant':
        this.processAssistantEvent(event, context);
        break;
    }
  }

  /**
   * Process user event
   */
  processUserEvent(event, context) {
    // Handle tool results first
    for (const toolResult of event.toolResults || []) {
      this.processToolResult(toolResult, event.timestamp, context);
    }

    // Handle text content (new user message)
    if (event.textContent?.length > 0) {
      const userNode = this.nodeFactory.createUserNode({
        id: this.nextId(context, 'msg'),
        timestamp: event.timestamp,
        content: event.textContent.join('\n')
      });

      context.rootMessages.push(userNode);
      context.currentUserNode = userNode;
      context.currentAssistantNode = null;
    }
  }

  /**
   * Process assistant event
   */
  processAssistantEvent(event, context) {
    const assistantNode = this.nodeFactory.createAssistantNode({
      id: this.nextId(context, 'msg'),
      timestamp: event.timestamp,
      content: event.textContent?.join('\n') || '',
      thinking: event.thinking
    });

    // Create tool nodes
    for (const toolUse of event.toolUses || []) {
      const toolNode = this.nodeFactory.createToolNode({
        id: this.nextId(context, 'tool'),
        timestamp: event.timestamp,
        name: toolUse.name,
        input: toolUse.input,
        status: 'pending'
      });
      
      assistantNode.children.push(toolNode);
      context.pendingTools.set(toolUse.id, toolNode);
    }

    // Attach to current user node
    if (context.currentUserNode) {
      context.currentUserNode.children.push(assistantNode);
    } else {
      context.rootMessages.push(assistantNode);
    }

    context.currentAssistantNode = assistantNode;
  }

  /**
   * Process tool result
   */
  processToolResult(toolResult, timestamp, context) {
    const toolNode = context.pendingTools.get(toolResult.toolUseId);
    
    if (!toolNode) return;

    toolNode.output = toolResult.content;
    toolNode.status = toolResult.isError ? 'error' : 'success';
    
    if (toolResult.isError) {
      toolNode.error = toolResult.content;
    }

    // Calculate duration
    const startTime = new Date(toolNode.timestamp);
    const endTime = new Date(timestamp);
    toolNode.duration = Math.max(0, endTime - startTime);

    // Note: Agent detection removed - now using Approach A (API-based discovery)
    // Agents are discovered via /api/agents endpoint by reading sessionId from agent files

    context.pendingTools.delete(toolResult.toolUseId);
  }

  /**
   * Generate next node ID
   */
  nextId(context, prefix) {
    return `${prefix}-${++context.nodeIdCounter}`;
  }

  /**
   * Generate random ID
   */
  generateId() {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
