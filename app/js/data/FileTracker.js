// js/data/FileTracker.js

/**
 * Singleton service to track all file operations during session loading.
 * Tracks successfully loaded files, missing files, and failed file operations.
 */
class FileTracker {
  constructor() {
    this.reset();
  }

  /**
   * Reset all tracking data (call at start of new session load)
   */
  reset() {
    this.loaded = [];
    this.missing = [];
    this.failed = [];
  }

  /**
   * Record a successfully loaded file
   * @param {string} path - Full file path
   * @param {string} type - File type ('main' or 'subagent')
   * @param {string} agentId - Agent ID (for subagent files)
   * @param {object} metadata - Additional metadata
   */
  recordLoaded(path, type, agentId = null, metadata = {}) {
    this.loaded.push({
      path,
      type,
      agentId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Record a missing file (agentId detected but file doesn't exist)
   * @param {string} expectedPath - Expected file path
   * @param {string} agentId - Agent ID that was detected
   * @param {string} detectedIn - Where the agentId was detected (node ID)
   */
  recordMissing(expectedPath, agentId, detectedIn = null) {
    this.missing.push({
      expectedPath,
      agentId,
      detectedIn,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record a failed file operation
   * @param {string} path - Attempted file path
   * @param {string} error - Error message
   * @param {object} details - Additional error details
   */
  recordFailed(path, error, details = {}) {
    this.failed.push({
      path,
      error,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Get complete tracking report
   * @returns {object} Report with loaded, missing, and failed files
   */
  getReport() {
    return {
      loaded: [...this.loaded],
      missing: [...this.missing],
      failed: [...this.failed],
      summary: {
        totalLoaded: this.loaded.length,
        totalMissing: this.missing.length,
        totalFailed: this.failed.length
      }
    };
  }

  /**
   * Check if any files are missing or failed
   * @returns {boolean}
   */
  hasIssues() {
    return this.missing.length > 0 || this.failed.length > 0;
  }
}

// Export singleton instance
export const fileTracker = new FileTracker();
