// js/core/EventBus.js

/**
 * Central event bus for decoupled module communication.
 * Implements pub/sub pattern with namespaced events.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports namespaces: 'session:loaded')
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    // Emit exact event
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
    
    // Emit wildcard for namespace (e.g., 'session:*' catches 'session:loaded')
    const namespace = event.split(':')[0];
    const wildcardEvent = `${namespace}:*`;
    if (this.listeners.has(wildcardEvent)) {
      this.listeners.get(wildcardEvent).forEach(cb => cb({ event, data }));
    }
  }

  /**
   * Remove all listeners (for cleanup)
   */
  clear() {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
