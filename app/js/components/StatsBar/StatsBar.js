// js/components/StatsBar/StatsBar.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';

/**
 * Statistics bar component showing session metrics.
 */
export class StatsBar extends Component {
  init() {
    this.stats = null;
    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.SESSION_LOADED, ({ session }) => {
      this.calculateStats(session);
      this.render();
    });

    this.subscribe(Events.SESSION_CLOSE, () => {
      this.stats = null;
      this.container.innerHTML = '';
    });
  }

  calculateStats(session) {
    const flatNodes = this.flattenTree(session.rootMessages);
    
    const toolCalls = flatNodes.filter(n => n.type === 'tool_call');
    const subagents = flatNodes.filter(n => n.type === 'subagent');
    const errors = flatNodes.filter(n => n.status === 'error');
    const totalDuration = toolCalls.reduce((sum, n) => sum + (n.duration || 0), 0);
    const maxDepth = Math.max(...flatNodes.map(n => n.depth || 0), 0);

    this.stats = {
      totalNodes: flatNodes.length,
      toolCalls: toolCalls.length,
      subagents: subagents.length,
      errors: errors.length,
      maxDepth,
      totalDuration
    };
  }

  flattenTree(nodes, depth = 0) {
    const result = [];
    nodes.forEach(node => {
      result.push({ ...node, depth });
      if (node.children?.length) {
        result.push(...this.flattenTree(node.children, depth + 1));
      }
    });
    return result;
  }

  render() {
    if (!this.container || !this.stats) return;

    this.container.innerHTML = '';

    const stats = [
      { label: 'Nodes', value: this.stats.totalNodes },
      { label: 'Tool Calls', value: this.stats.toolCalls },
      { label: 'Sub-agents', value: this.stats.subagents },
      { label: 'Errors', value: this.stats.errors, error: true },
      { label: 'Max Depth', value: this.stats.maxDepth },
      { label: 'Tool Time', value: `${(this.stats.totalDuration / 1000).toFixed(1)}s` }
    ];

    stats.forEach(stat => {
      const statEl = this.createElement('div', {
        className: `stat ${stat.error ? 'error' : ''}`
      });

      const value = this.createElement('span', { className: 'stat-value' }, [String(stat.value)]);
      const label = this.createElement('span', { className: 'stat-label' }, [stat.label]);

      statEl.appendChild(value);
      statEl.appendChild(label);
      this.container.appendChild(statEl);
    });
  }
}
