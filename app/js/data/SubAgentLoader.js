// js/data/SubAgentLoader.js

import { Module } from '../core/Module.js';
import { fileTracker } from './FileTracker.js';

/**
 * Discovers and loads sub-agent sessions using Approach A.
 * 
 * Uses the /api/agents endpoint to discover agents by reading sessionId
 * from agent files, supporting both flat and nested structures.
 */
export class SubAgentLoader extends Module {
  constructor(options = {}) {
    super(options);
    this.apiClient = options.apiClient;
    this.parser = options.parser;
    this.transformer = options.transformer;
    this.maxDepth = options.maxDepth || 10;
    this.loadedAgents = new Set();
    this.fileTracker = fileTracker;
  }
  
  /**
   * Construct expected agent file path
   * @param {string} agentType - 'flat' or 'nested'
   */
  constructAgentPath(project, sessionId, agentId, agentType = 'nested') {
    const home = '~';
    const normalizedProject = project.replace(/\//g, '-').replace(/\./g, '-');
    
    if (agentType === 'flat') {
      return `${home}/.claude/projects/${normalizedProject}/agent-${agentId}.jsonl`;
    }
    return `${home}/.claude/projects/${normalizedProject}/${sessionId}/subagents/agent-${agentId}.jsonl`;
  }

  /**
   * Load all sub-agents for a session tree.
   * 
   * Uses Approach A: Discovers agents via API by reading sessionId from agent files,
   * then loads each discovered agent and attaches to the tree.
   */
  async loadSubAgents(tree, project, sessionId, depth = 0) {
    if (depth >= this.maxDepth) {
      console.warn('Max sub-agent depth reached');
      return tree;
    }

    // Discover agents via API (Approach A)
    const agents = await this.discoverAgents(project, sessionId);
    
    if (agents.length === 0) {
      return tree;
    }
    
    console.log(`Discovered ${agents.length} agents for session ${sessionId}`);

    // Load each discovered agent
    for (const agent of agents) {
      const agentKey = `${sessionId}:${agent.agentId}`;
      
      // Prevent circular loading
      if (this.loadedAgents.has(agentKey)) {
        continue;
      }
      this.loadedAgents.add(agentKey);
      
      const subAgentNode = await this.loadSubAgent(
        project, sessionId, agent.agentId, depth, agent.type
      );
      
      if (subAgentNode) {
        // Attach agents to tree root
        // Note: In the future, could try to find the specific tool_use node
        // that triggered this agent and attach there instead
        tree.rootMessages.push(subAgentNode);
      }
    }
    
    return tree;
  }

  /**
   * Discover agents for a session via API
   * @returns {Array} List of {agentId, path, type} objects
   */
  async discoverAgents(project, sessionId) {
    try {
      const response = await this.apiClient.discoverAgents(project, sessionId);
      return response.agents || [];
    } catch (error) {
      console.warn('Agent discovery failed:', error);
      return [];
    }
  }

  /**
   * Load single sub-agent
   * @param {string} agentType - 'flat' or 'nested'
   */
  async loadSubAgent(project, sessionId, agentId, depth, agentType = 'nested') {
    const expectedPath = this.constructAgentPath(project, sessionId, agentId, agentType);
    
    try {
      const data = await this.apiClient.loadSubAgent(project, sessionId, agentId, agentType);
      
      if (!data.events?.length) {
        // Empty response - file exists but no events
        this.fileTracker.recordMissing(expectedPath, agentId, null);
        return null;
      }

      // Record successful load
      const actualPath = data.path || expectedPath;
      this.fileTracker.recordLoaded(actualPath, 'subagent', agentId, {
        sessionId,
        project,
        agentType,
        eventCount: data.events.length
      });

      const parsedEvents = this.parser.parseEvents(data.events);
      const subTree = this.transformer.transform(parsedEvents, {
        sessionId: `${sessionId}:${agentId}`
      });

      // Recursively discover and load nested sub-agents within this agent
      await this.loadSubAgents(subTree, project, sessionId, depth + 1);

      // Create sub-agent node
      return {
        id: `subagent-${agentId}`,
        type: 'subagent',
        agentType: agentType,  // 'flat' or 'nested'
        timestamp: data.events[0]?.timestamp || new Date().toISOString(),
        name: this.detectAgentMode(parsedEvents),
        status: 'success',
        task: this.extractTask(parsedEvents),
        children: subTree.rootMessages
      };
    } catch (error) {
      console.warn(`Failed to load sub-agent ${agentId} (${agentType}):`, error);
      
      // Track the failure
      if (error.status === 404) {
        this.fileTracker.recordMissing(expectedPath, agentId, null);
      } else {
        this.fileTracker.recordFailed(expectedPath, error.message, {
          agentId,
          sessionId,
          project,
          agentType,
          status: error.status
        });
      }
      
      return null;
    }
  }

  /**
   * Detect agent mode from events
   */
  detectAgentMode(events) {
    const text = JSON.stringify(events).toLowerCase();
    
    if (text.includes('plan') || text.includes('approach')) return 'Plan Mode';
    if (text.includes('debug') || text.includes('error')) return 'Debug Mode';
    if (text.includes('ask') || text.includes('question')) return 'Ask Mode';
    
    return 'Agent Mode';
  }

  /**
   * Extract task from first user message
   */
  extractTask(events) {
    const firstUser = events.find(e => e.type === 'user');
    return firstUser?.textContent?.[0]?.slice(0, 100) || 'Sub-agent task';
  }

  /**
   * Reset loaded agents (for new session)
   */
  reset() {
    this.loadedAgents.clear();
  }
}
