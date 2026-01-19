// js/core/StateManager.js

import { eventBus } from './EventBus.js';

/**
 * Centralized state management with immutable updates.
 * Emits events on state changes for reactive updates.
 */
export class StateManager {
  constructor(initialState = {}) {
    this._state = this._deepFreeze(initialState);
    this._history = [];
    this._maxHistory = 50;
  }

  /**
   * Get current state (read-only)
   */
  get state() {
    return this._state;
  }

  /**
   * Get a specific state slice
   * @param {string} path - Dot notation path (e.g., 'session.id')
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /**
   * Update state immutably
   * @param {string} path - State path to update
   * @param {*} value - New value
   */
  set(path, value) {
    const oldState = this._state;
    const newState = this._setPath(this._state, path, value);
    
    this._history.push(oldState);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    
    this._state = this._deepFreeze(newState);
    
    // Emit change events
    eventBus.emit('state:changed', { path, value, oldState, newState: this._state });
    eventBus.emit(`state:${path}`, { value, oldValue: this.get.call({ _state: oldState }, path) });
  }

  /**
   * Batch multiple updates
   */
  batch(updates) {
    const oldState = this._state;
    let newState = { ...this._state };
    
    for (const [path, value] of Object.entries(updates)) {
      newState = this._setPath(newState, path, value);
    }
    
    this._history.push(oldState);
    this._state = this._deepFreeze(newState);
    
    eventBus.emit('state:changed', { batch: true, updates, oldState, newState: this._state });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    return eventBus.on(`state:${path}`, callback);
  }

  // Helper: Set nested path
  _setPath(obj, path, value) {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    return result;
  }

  // Helper: Deep freeze object
  _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    Object.keys(obj).forEach(key => this._deepFreeze(obj[key]));
    return obj;
  }
}

// Default initial state
const initialState = {
  // App state
  app: {
    view: 'selector',  // 'selector' | 'viewer'
    loading: false,
    error: null
  },
  
  // Session data
  session: null,
  
  // File tracking data
  fileTracking: {
    loaded: [],
    missing: [],
    failed: [],
    summary: {
      totalLoaded: 0,
      totalMissing: 0,
      totalFailed: 0
    }
  },
  
  // UI state
  ui: {
    expandedNodes: [],
    selectedNodeId: null,
    showThinking: true,
    filterType: 'all',
    searchQuery: ''
  },
  
  // Projects/sessions list
  projects: [],
  sessions: [],
  recentSessions: []
};

export const state = new StateManager(initialState);
