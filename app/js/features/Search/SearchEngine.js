// js/features/Search/SearchEngine.js

import { Module } from '../../core/Module.js';
import { Events } from '../../config/events.js';

/**
 * Search engine for filtering nodes.
 */
export class SearchEngine extends Module {
  init() {
    this.query = '';
    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.SEARCH_CHANGE, ({ query }) => {
      this.query = query;
      this.setState('ui.searchQuery', query);
    });

    this.subscribe(Events.SEARCH_CLEAR, () => {
      this.query = '';
      this.setState('ui.searchQuery', '');
    });
  }

  /**
   * Search nodes for query
   */
  search(nodes, query) {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();
    const results = [];

    const searchNode = (node) => {
      const searchText = [
        node.content,
        node.task,
        node.name,
        node.output,
        JSON.stringify(node.input)
      ].join(' ').toLowerCase();

      if (searchText.includes(lowerQuery)) {
        results.push(node);
      }

      if (node.children?.length) {
        node.children.forEach(searchNode);
      }
    };

    nodes.forEach(searchNode);
    return results;
  }
}
