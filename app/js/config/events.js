// js/config/events.js

/**
 * Event name constants for type safety and documentation.
 */
export const Events = {
  // App lifecycle
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  
  // Navigation
  VIEW_CHANGE: 'view:change',           // { view: 'selector' | 'viewer' }
  
  // Session discovery
  PROJECTS_LOAD: 'projects:load',
  PROJECTS_LOADED: 'projects:loaded',   // { projects: [] }
  PROJECTS_ERROR: 'projects:error',     // { error }
  
  SESSIONS_LOAD: 'sessions:load',       // { project }
  SESSIONS_LOADED: 'sessions:loaded',   // { sessions: [] }
  SESSIONS_ERROR: 'sessions:error',
  
  // Session loading
  SESSION_SELECT: 'session:select',     // { project, sessionId }
  SESSION_LOADING: 'session:loading',
  SESSION_LOADED: 'session:loaded',     // { session }
  SESSION_ERROR: 'session:error',
  SESSION_CLOSE: 'session:close',
  
  // Tree interactions
  NODE_SELECT: 'node:select',           // { node }
  NODE_EXPAND: 'node:expand',           // { nodeId }
  NODE_COLLAPSE: 'node:collapse',       // { nodeId }
  NODE_TOGGLE: 'node:toggle',           // { nodeId }
  TREE_EXPAND_ALL: 'tree:expandAll',
  TREE_COLLAPSE_ALL: 'tree:collapseAll',
  
  // Filters & Search
  FILTER_CHANGE: 'filter:change',       // { filterType }
  SEARCH_CHANGE: 'search:change',       // { query }
  SEARCH_CLEAR: 'search:clear',
  
  // UI toggles
  THINKING_TOGGLE: 'thinking:toggle',
  THEME_TOGGLE: 'theme:toggle',
  
  // Modals
  SESSION_FILES_MODAL_OPEN: 'modal:sessionFiles:open',
  SESSION_FILES_MODAL_CLOSE: 'modal:sessionFiles:close',
  
  // Export
  EXPORT_START: 'export:start',         // { format, options }
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error',
  
  // Storage
  RECENT_UPDATED: 'recent:updated',     // { sessions: [] }
  
  // Notifications
  TOAST_SHOW: 'toast:show',             // { message, type, duration }
  TOAST_HIDE: 'toast:hide'
};
