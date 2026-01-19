// js/core/Component.js

import { eventBus } from './EventBus.js';
import { state } from './StateManager.js';

/**
 * Base class for UI components.
 * Provides lifecycle hooks, event binding, and DOM management.
 */
export class Component {
  /**
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Component options
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.options = options;
    this._subscriptions = [];
    this._domListeners = [];
    
    // Lifecycle
    if (this.container) {
      this.init();
    }
  }

  /**
   * Initialize component (override in subclass)
   */
  init() {
    this.bindEvents();
    this.render();
  }

  /**
   * Bind event listeners (override in subclass)
   */
  bindEvents() {}

  /**
   * Render component (override in subclass)
   */
  render() {}

  /**
   * Subscribe to EventBus event (auto-cleanup on destroy)
   */
  subscribe(event, callback) {
    const unsubscribe = eventBus.on(event, callback.bind(this));
    this._subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to state changes (auto-cleanup on destroy)
   */
  watchState(path, callback) {
    const unsubscribe = state.subscribe(path, callback.bind(this));
    this._subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Add DOM event listener (auto-cleanup on destroy)
   */
  addListener(element, event, handler, options) {
    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler, options);
    this._domListeners.push({ element, event, handler: boundHandler, options });
    return () => element.removeEventListener(event, boundHandler, options);
  }

  /**
   * Emit event via EventBus
   */
  emit(event, data) {
    eventBus.emit(event, data);
  }

  /**
   * Create DOM element with attributes
   */
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase();
        this.addListener(el, event, value);
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else {
        el.setAttribute(key, value);
      }
    }
    
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
    
    return el;
  }

  /**
   * Set inner HTML safely (escapes content)
   */
  setHTML(element, html) {
    element.innerHTML = '';
    const template = document.createElement('template');
    template.innerHTML = html;
    element.appendChild(template.content.cloneNode(true));
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (this.container) {
      this.container.classList.add('loading');
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    if (this.container) {
      this.container.classList.remove('loading');
    }
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    // Unsubscribe from all events
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
    
    // Remove all DOM listeners
    this._domListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this._domListeners = [];
    
    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
