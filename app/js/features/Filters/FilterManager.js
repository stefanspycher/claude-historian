// js/features/Filters/FilterManager.js

import { Module } from '../../core/Module.js';
import { Events } from '../../config/events.js';

/**
 * Filter manager for node type filtering.
 */
export class FilterManager extends Module {
  init() {
    this.filterType = 'all';
    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.FILTER_CHANGE, ({ filterType }) => {
      this.filterType = filterType;
      this.setState('ui.filterType', filterType);
    });
  }

  /**
   * Filter nodes by type
   */
  filter(nodes, type) {
    if (type === 'all') return nodes;

    const results = [];

    const filterNode = (node) => {
      if (node.type === type) {
        results.push(node);
      }

      if (node.children?.length) {
        node.children.forEach(filterNode);
      }
    };

    nodes.forEach(filterNode);
    return results;
  }
}
