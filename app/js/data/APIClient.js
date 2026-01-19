// js/data/APIClient.js

import { Module } from '../core/Module.js';
import { Events } from '../config/events.js';

/**
 * HTTP client for backend API communication.
 * Handles errors, retries, and response parsing.
 */
export class APIClient extends Module {
  constructor(options = {}) {
    super(options);
    this.baseUrl = options.baseUrl || 'http://localhost:8000';
    this.timeout = options.timeout || 30000;
  }

  /**
   * Make HTTP request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new APIError(error.error || response.statusText, response.status, error);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(error.message, 0);
    }
  }

  /**
   * List all projects
   */
  async listProjects() {
    return this.request('/api/projects');
  }

  /**
   * List sessions for a project
   */
  async listSessions(project, limit = 50) {
    const params = new URLSearchParams({ project, limit: String(limit) });
    return this.request(`/api/sessions?${params}`);
  }

  /**
   * Load a session
   */
  async loadSession(project, sessionId) {
    const params = new URLSearchParams({ project, sessionId });
    return this.request(`/api/session?${params}`);
  }

  /**
   * Load a sub-agent session
   * @param {string} agentType - 'flat' or 'nested' (default: 'nested')
   */
  async loadSubAgent(project, sessionId, agentId, agentType = 'nested') {
    const params = new URLSearchParams({ project, sessionId, agentId, type: agentType });
    return this.request(`/api/subagent?${params}`);
  }

  /**
   * Discover agents for a session (Approach A)
   * Returns list of agents that reference the session, both flat and nested.
   */
  async discoverAgents(project, sessionId) {
    const params = new URLSearchParams({ project, sessionId });
    return this.request(`/api/agents?${params}`);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.request('/api/health');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Custom API error class
 */
export class APIError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}
