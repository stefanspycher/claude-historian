// js/core/Module.js

import { eventBus } from './EventBus.js';
import { state } from './StateManager.js';

/**
 * Base class for non-UI modules (services, data handlers).
 */
export class Module {
  constructor(options = {}) {
    this.options = options;
    this._subscriptions = [];
    this.init();
  }

  /**
   * Initialize module (override in subclass)
   */
  init() {}

  /**
   * Subscribe to EventBus event
   */
  subscribe(event, callback) {
    const unsubscribe = eventBus.on(event, callback.bind(this));
    this._subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Emit event
   */
  emit(event, data) {
    eventBus.emit(event, data);
  }

  /**
   * Get state value
   */
  getState(path) {
    return state.get(path);
  }

  /**
   * Set state value
   */
  setState(path, value) {
    state.set(path, value);
  }

  /**
   * Destroy module
   */
  destroy() {
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
  }
}
