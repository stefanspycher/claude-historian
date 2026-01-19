// js/components/TreeView/TreeView.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';
import { NODE_CONFIG } from '../../config/nodeTypes.js';
import { APP_CONFIG } from '../../config/constants.js';
import { formatTime } from '../../utils/date.js';

/**
 * Tree view component for displaying hierarchical session data.
 */
export class TreeView extends Component {
  init() {
    this.expandedNodes = new Set();
    this.selectedNodeId = null;
    this.currentSession = null;
    this.filterType = 'all';
    this.searchQuery = '';
    this.showThinking = true;
    
    this.bindEvents();
  }

  bindEvents() {
    // Listen for session loaded
    this.subscribe(Events.SESSION_LOADED, ({ session }) => {
      this.currentSession = session;
      // Auto-expand first level
      this.autoExpandFirstLevel(session.rootMessages);
      this.render();
    });

    // Listen for node expand/collapse
    this.subscribe(Events.NODE_TOGGLE, ({ nodeId }) => {
      this.toggleExpand(nodeId);
    });

    this.subscribe(Events.TREE_EXPAND_ALL, () => {
      this.expandAll();
    });

    this.subscribe(Events.TREE_COLLAPSE_ALL, () => {
      this.collapseAll();
    });

    // Listen for filter changes
    this.subscribe(Events.FILTER_CHANGE, ({ filterType }) => {
      this.filterType = filterType;
      this.render();
    });

    this.subscribe(Events.SEARCH_CHANGE, ({ query }) => {
      this.searchQuery = query;
      this.render();
    });

    this.subscribe(Events.THINKING_TOGGLE, () => {
      this.showThinking = !this.showThinking;
      this.setState('ui.showThinking', this.showThinking);
      this.render();
    });
  }

  render() {
    if (!this.container || !this.currentSession) return;

    this.container.innerHTML = '';
    const flatNodes = this.flattenTree(this.currentSession.rootMessages);
    const visibleNodes = this.filterNodes(flatNodes);

    visibleNodes.forEach(node => {
      const element = this.renderNode(node);
      this.container.appendChild(element);
    });
  }

  /**
   * Flatten tree for rendering
   */
  flattenTree(nodes, depth = 0, path = []) {
    const result = [];
    nodes.forEach((node, index) => {
      const currentPath = [...path, index];
      result.push({ ...node, depth, path: currentPath });
      
      if (node.children?.length && this.expandedNodes.has(node.id)) {
        result.push(...this.flattenTree(node.children, depth + 1, currentPath));
      }
    });
    return result;
  }

  /**
   * Filter nodes by type and search
   */
  filterNodes(nodes) {
    return nodes.filter(node => {
      // Type filter
      if (this.filterType !== 'all' && node.type !== this.filterType) {
        return false;
      }

      // Thinking filter - hide assistant nodes with thinking blocks
      if (!this.showThinking && node.type === 'assistant' && node.thinking) {
        return false;
      }

      // Search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const searchText = [
          node.content,
          node.task,
          node.name,
          node.output,
          JSON.stringify(node.input)
        ].join(' ').toLowerCase();
        
        if (!searchText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Render single node
   */
  renderNode(node) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node-wrapper';

    // Connection lines
    wrapper.appendChild(this.renderLines(node.depth));

    // Node element
    const nodeEl = document.createElement('div');
    nodeEl.className = `tree-node ${this.selectedNodeId === node.id ? 'selected' : ''}`;
    nodeEl.style.marginLeft = `${node.depth * APP_CONFIG.TREE_INDENT_PX}px`;
    
    const config = NODE_CONFIG[node.type];
    if (this.selectedNodeId === node.id) {
      nodeEl.style.backgroundColor = config.bgColor;
      nodeEl.style.borderColor = config.borderColor;
    }

    // Expand toggle
    if (node.children?.length > 0) {
      const toggle = this.renderExpandToggle(node);
      nodeEl.appendChild(toggle);
    } else {
      const spacer = document.createElement('div');
      spacer.className = 'expand-toggle';
      spacer.style.visibility = 'hidden';
      nodeEl.appendChild(spacer);
    }

    // Type badge
    nodeEl.appendChild(this.renderTypeBadge(node));

    // Content
    nodeEl.appendChild(this.renderContent(node));

    // Meta
    nodeEl.appendChild(this.renderMeta(node));

    // Click to select
    this.addListener(nodeEl, 'click', () => {
      this.selectNode(node);
    });

    wrapper.appendChild(nodeEl);
    return wrapper;
  }

  /**
   * Render connection lines
   */
  renderLines(depth) {
    const lines = document.createElement('div');
    lines.className = 'tree-lines';
    lines.style.width = `${depth * APP_CONFIG.TREE_INDENT_PX}px`;

    for (let i = 0; i < depth; i++) {
      const vLine = document.createElement('div');
      vLine.className = 'tree-line-vertical';
      vLine.style.left = `${i * APP_CONFIG.TREE_INDENT_PX + 11}px`;
      lines.appendChild(vLine);
    }

    if (depth > 0) {
      const hLine = document.createElement('div');
      hLine.className = 'tree-line-horizontal';
      hLine.style.left = `${(depth - 1) * APP_CONFIG.TREE_INDENT_PX + 11}px`;
      lines.appendChild(hLine);
    }

    return lines;
  }

  /**
   * Render expand/collapse toggle
   */
  renderExpandToggle(node) {
    const button = document.createElement('button');
    button.className = 'expand-toggle';
    button.innerHTML = this.expandedNodes.has(node.id) ? '▼' : '▶';
    
    this.addListener(button, 'click', (e) => {
      e.stopPropagation();
      this.emit(Events.NODE_TOGGLE, { nodeId: node.id });
    });

    return button;
  }

  /**
   * Render type badge
   */
  renderTypeBadge(node) {
    const config = NODE_CONFIG[node.type];
    const badge = document.createElement('div');
    badge.className = 'node-type-badge';
    badge.style.backgroundColor = config.color;
    badge.innerHTML = config.icon.charAt(0).toUpperCase(); // Simple text icon
    return badge;
  }

  /**
   * Render node content
   */
  renderContent(node) {
    const content = document.createElement('div');
    content.className = 'node-content';

    const header = document.createElement('div');
    header.className = 'node-header';

    const config = NODE_CONFIG[node.type];
    const label = document.createElement('span');
    label.className = 'node-label';
    label.style.color = config.color;
    label.textContent = config.label;
    header.appendChild(label);

    if (node.name) {
      const name = document.createElement('span');
      name.className = 'node-name';
      name.textContent = node.name;
      header.appendChild(name);
    }

    if (node.duration) {
      const duration = document.createElement('span');
      duration.className = 'node-duration';
      duration.textContent = `${node.duration}ms`;
      header.appendChild(duration);
    }

    if (node.status) {
      const status = document.createElement('span');
      status.className = `node-status status-${node.status}`;
      status.textContent = node.status;
      header.appendChild(status);
    }

    content.appendChild(header);

    // Preview
    const preview = document.createElement('div');
    preview.className = 'node-preview';
    const previewText = this.getPreviewText(node);
    preview.textContent = previewText.slice(0, 100) + (previewText.length > 100 ? '...' : '');
    content.appendChild(preview);

    return content;
  }

  /**
   * Get preview text for node
   */
  getPreviewText(node) {
    if (node.content) return node.content;
    if (node.task) return node.task;
    if (node.input?.path) return node.input.path;
    if (node.input?.command) return node.input.command;
    if (node.output) return node.output;
    return '...';
  }

  /**
   * Render meta info
   */
  renderMeta(node) {
    const meta = document.createElement('div');
    meta.className = 'node-meta';

    const time = document.createElement('span');
    time.className = 'node-time';
    time.textContent = formatTime(node.timestamp);
    meta.appendChild(time);

    if (node.children?.length > 0 && !this.expandedNodes.has(node.id)) {
      const count = this.countDescendants(node);
      const badge = document.createElement('span');
      badge.className = 'descendant-count';
      badge.textContent = `+${count}`;
      meta.appendChild(badge);
    }

    return meta;
  }

  /**
   * Count all descendants
   */
  countDescendants(node) {
    if (!node.children?.length) return 0;
    return node.children.reduce((sum, child) => sum + 1 + this.countDescendants(child), 0);
  }

  /**
   * Toggle expand state
   */
  toggleExpand(nodeId) {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
    this.render();
  }

  /**
   * Select node
   */
  selectNode(node) {
    this.selectedNodeId = node.id;
    this.emit(Events.NODE_SELECT, { node });
    this.render();
  }

  /**
   * Expand all nodes
   */
  expandAll() {
    if (!this.currentSession) return;
    
    const collectIds = (nodes) => {
      const ids = [];
      nodes.forEach(node => {
        ids.push(node.id);
        if (node.children?.length) {
          ids.push(...collectIds(node.children));
        }
      });
      return ids;
    };

    const allIds = collectIds(this.currentSession.rootMessages);
    this.expandedNodes = new Set(allIds);
    this.render();
  }

  /**
   * Collapse all nodes
   */
  collapseAll() {
    this.expandedNodes.clear();
    this.render();
  }

  /**
   * Auto-expand first level
   */
  autoExpandFirstLevel(nodes) {
    nodes.forEach(node => {
      this.expandedNodes.add(node.id);
      if (node.children?.length > 0) {
        node.children.forEach(child => {
          this.expandedNodes.add(child.id);
        });
      }
    });
  }
}
