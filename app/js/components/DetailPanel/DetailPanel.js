// js/components/DetailPanel/DetailPanel.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';
import { NODE_CONFIG, STATUS_CONFIG } from '../../config/nodeTypes.js';
import { formatTimestamp, formatDuration } from '../../utils/date.js';
import { escapeHtml } from '../../utils/sanitize.js';

/**
 * Detail panel component for displaying selected node details.
 */
export class DetailPanel extends Component {
  init() {
    this.currentNode = null;
    this.bindEvents();
    this.renderEmpty();
  }

  bindEvents() {
    this.subscribe(Events.NODE_SELECT, ({ node }) => {
      this.currentNode = node;
      this.render();
    });

    this.subscribe(Events.SESSION_CLOSE, () => {
      this.currentNode = null;
      this.renderEmpty();
    });
  }

  render() {
    if (!this.container) return;

    if (!this.currentNode) {
      this.renderEmpty();
      return;
    }

    const node = this.currentNode;
    const config = NODE_CONFIG[node.type];

    this.container.innerHTML = '';

    // Header
    const header = this.createElement('div', {
      className: 'detail-header',
      style: { borderColor: config.color }
    });

    const typeDiv = this.createElement('div', {
      className: 'detail-type',
      style: { backgroundColor: config.color }
    }, [config.label]);
    header.appendChild(typeDiv);

    if (node.name) {
      const nameEl = this.createElement('h2', { className: 'detail-name' }, [node.name]);
      header.appendChild(nameEl);
    }

    if (node.status) {
      const statusDiv = this.renderStatus(node);
      header.appendChild(statusDiv);
    }

    this.container.appendChild(header);

    // Body
    const body = this.createElement('div', { className: 'detail-body' });

    // Metadata
    body.appendChild(this.renderMetadata(node));

    // Thinking
    if (node.thinking) {
      body.appendChild(this.renderThinking(node));
    }

    // Decision
    if (node.decision) {
      body.appendChild(this.renderDecision(node));
    }

    // Content
    if (node.content) {
      body.appendChild(this.renderContent(node));
    }

    // Task (for subagents)
    if (node.task) {
      body.appendChild(this.renderTask(node));
    }

    // Tool details
    if (node.type === 'tool_call') {
      body.appendChild(this.renderToolInput(node));
      body.appendChild(this.renderToolOutput(node));
    }

    this.container.appendChild(body);
  }

  renderEmpty() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="detail-panel empty">
        <div class="empty-state">
          <p>Select a node to view details</p>
        </div>
      </div>
    `;
  }

  renderStatus(node) {
    const statusConfig = STATUS_CONFIG[node.status];
    if (!statusConfig) return document.createDocumentFragment();

    const statusDiv = this.createElement('div', {
      className: 'detail-status',
      style: { color: statusConfig.color }
    });

    const statusText = this.createElement('span', {}, [node.status.toUpperCase()]);
    statusDiv.appendChild(statusText);

    return statusDiv;
  }

  renderMetadata(node) {
    const section = this.createElement('div', { className: 'detail-meta-row' });

    const timeItem = this.createElement('div', { className: 'meta-item' });
    timeItem.innerHTML = `<span>⏰</span><span>${formatTimestamp(node.timestamp)}</span>`;
    section.appendChild(timeItem);

    if (node.duration) {
      const durationItem = this.createElement('div', { className: 'meta-item' });
      durationItem.innerHTML = `<span>⚡</span><span>${formatDuration(node.duration)}</span>`;
      section.appendChild(durationItem);
    }

    return section;
  }

  renderThinking(node) {
    const section = this.createElement('div', { className: 'detail-section thinking' });
    
    const header = this.createElement('h3', {}, ['👁️ Internal Reasoning']);
    section.appendChild(header);

    const pre = this.createElement('pre', {});
    pre.textContent = node.thinking;
    section.appendChild(pre);

    return section;
  }

  renderDecision(node) {
    const section = this.createElement('div', { className: 'detail-section decision' });
    
    const header = this.createElement('h3', {}, ['🔀 Decision Point']);
    section.appendChild(header);

    const question = this.createElement('p', { className: 'decision-question' });
    question.textContent = node.decision.question;
    section.appendChild(question);

    const options = this.createElement('div', { className: 'decision-options' });
    node.decision.options.forEach(opt => {
      const optEl = this.createElement('span', { className: 'decision-option' }, [opt]);
      options.appendChild(optEl);
    });
    section.appendChild(options);

    return section;
  }

  renderContent(node) {
    const section = this.createElement('div', { className: 'detail-section content' });
    
    const header = this.createElement('h3', {}, ['💬 Content']);
    section.appendChild(header);

    const contentDiv = this.createElement('div', { className: 'content-body' });
    contentDiv.textContent = node.content;
    section.appendChild(contentDiv);

    return section;
  }

  renderTask(node) {
    const section = this.createElement('div', { className: 'detail-section task' });
    
    const header = this.createElement('h3', {}, ['⚡ Task']);
    section.appendChild(header);

    const taskDiv = this.createElement('div', { className: 'content-body' });
    taskDiv.textContent = node.task;
    section.appendChild(taskDiv);

    return section;
  }

  renderToolInput(node) {
    const section = this.createElement('div', { className: 'detail-section input' });
    
    const header = this.createElement('h3', {}, ['📥 Input']);
    section.appendChild(header);

    const pre = this.createElement('pre', {});
    pre.textContent = JSON.stringify(node.input, null, 2);
    section.appendChild(pre);

    return section;
  }

  renderToolOutput(node) {
    const section = this.createElement('div', { 
      className: `detail-section output ${node.error ? 'error' : ''}` 
    });
    
    const header = this.createElement('h3', {}, [node.error ? '❌ Error' : '📤 Output']);
    section.appendChild(header);

    const pre = this.createElement('pre', { 
      className: node.error ? 'error' : '' 
    });
    pre.textContent = node.output;
    section.appendChild(pre);

    return section;
  }
}
