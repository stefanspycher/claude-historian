// js/services/ConfigService.js

import { Module } from '../core/Module.js';
import { APP_CONFIG } from '../config/constants.js';

/**
 * Configuration service for app settings.
 */
export class ConfigService extends Module {
  constructor(options = {}) {
    super(options);
    this.config = { ...APP_CONFIG, ...options };
  }

  /**
   * Get configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    this.config[key] = value;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }
}
