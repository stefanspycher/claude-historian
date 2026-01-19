// js/components/Toolbar/Toolbar.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';

/**
 * Toolbar component with filters and controls.
 */
export class Toolbar extends Component {
  init() {
    this.bindEvents();
    this.setupControls();
  }

  bindEvents() {
    // Listen for state changes to update UI
    this.watchState('ui.filterType', ({ value }) => {
      const select = this.container.querySelector('#filter-type');
      if (select) select.value = value;
    });

    this.watchState('ui.showThinking', ({ value }) => {
      const btn = this.container.querySelector('#toggle-thinking');
      if (btn) {
        btn.classList.toggle('active', value);
      }
    });
  }

  setupControls() {
    // Filter dropdown
    const filterSelect = this.container.querySelector('#filter-type');
    if (filterSelect) {
      this.addListener(filterSelect, 'change', (e) => {
        this.emit(Events.FILTER_CHANGE, { filterType: e.target.value });
      });
    }

    // Thinking toggle
    const thinkingBtn = this.container.querySelector('#toggle-thinking');
    if (thinkingBtn) {
      this.addListener(thinkingBtn, 'click', () => {
        this.emit(Events.THINKING_TOGGLE);
      });
    }

    // Expand all
    const expandBtn = this.container.querySelector('#expand-all');
    if (expandBtn) {
      this.addListener(expandBtn, 'click', () => {
        this.emit(Events.TREE_EXPAND_ALL);
      });
    }

    // Collapse all
    const collapseBtn = this.container.querySelector('#collapse-all');
    if (collapseBtn) {
      this.addListener(collapseBtn, 'click', () => {
        this.emit(Events.TREE_COLLAPSE_ALL);
      });
    }

    // Search input
    const searchInput = this.container.querySelector('#search-input');
    if (searchInput) {
      let timeoutId;
      this.addListener(searchInput, 'input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          this.emit(Events.SEARCH_CHANGE, { query: e.target.value });
        }, 300);
      });
    }

    // Export button
    const exportBtn = document.querySelector('#export-btn');
    if (exportBtn) {
      this.addListener(exportBtn, 'click', () => {
        this.emit(Events.EXPORT_START, { format: 'markdown', options: {} });
      });
    }

    // Back button
    const backBtn = document.querySelector('#back-btn');
    if (backBtn) {
      this.addListener(backBtn, 'click', () => {
        this.emit(Events.SESSION_CLOSE);
      });
    }
  }

  render() {
    // Toolbar is mostly static HTML, just update state
  }
}
