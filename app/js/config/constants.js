// js/config/constants.js

/**
 * Application-wide constants.
 */
export const APP_CONFIG = {
  API_URL: 'http://localhost:8000',
  API_TIMEOUT: 30000,
  
  STORAGE_KEY: 'claude-session-viewer',
  MAX_RECENT_SESSIONS: 10,
  
  TREE_INDENT_PX: 24,
  MAX_SUBAGENT_DEPTH: 10,
  
  SEARCH_DEBOUNCE_MS: 300,
  
  FONTS: {
    mono: "'JetBrains Mono', monospace",
    sans: "'IBM Plex Sans', -apple-system, sans-serif"
  }
};
