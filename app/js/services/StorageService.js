// js/services/StorageService.js

import { Module } from '../core/Module.js';
import { APP_CONFIG } from '../config/constants.js';
import { Events } from '../config/events.js';

/**
 * localStorage wrapper for persisting app data.
 */
export class StorageService extends Module {
  constructor(options = {}) {
    super(options);
    this.storageKey = APP_CONFIG.STORAGE_KEY;
  }

  /**
   * Add session to recent list
   */
  addRecentSession(project, sessionId) {
    const recent = this.getRecentSessions();
    
    // Remove if already exists
    const filtered = recent.filter(s => 
      !(s.project === project && s.sessionId === sessionId)
    );
    
    // Add to front
    filtered.unshift({
      project,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Keep only max recent
    const limited = filtered.slice(0, APP_CONFIG.MAX_RECENT_SESSIONS);
    
    this.saveRecentSessions(limited);
    this.emit(Events.RECENT_UPDATED, { sessions: limited });
  }

  /**
   * Get recent sessions
   */
  getRecentSessions() {
    try {
      const data = localStorage.getItem(`${this.storageKey}-recent`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save recent sessions
   */
  saveRecentSessions(sessions) {
    try {
      localStorage.setItem(`${this.storageKey}-recent`, JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save recent sessions:', error);
    }
  }

  /**
   * Save UI state
   */
  saveUIState(state) {
    try {
      localStorage.setItem(`${this.storageKey}-ui`, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save UI state:', error);
    }
  }

  /**
   * Get UI state
   */
  getUIState() {
    try {
      const data = localStorage.getItem(`${this.storageKey}-ui`);
      return data ? JSON.parse(data) : {
        expandedNodes: [],
        showThinking: true,
        filterType: 'all'
      };
    } catch {
      return {
        expandedNodes: [],
        showThinking: true,
        filterType: 'all'
      };
    }
  }

  /**
   * Clear all stored data
   */
  clear() {
    try {
      localStorage.removeItem(`${this.storageKey}-recent`);
      localStorage.removeItem(`${this.storageKey}-ui`);
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
}
