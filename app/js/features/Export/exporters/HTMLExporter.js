// js/features/Export/exporters/HTMLExporter.js

import { formatTimestamp } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/sanitize.js';
import { NODE_CONFIG } from '../../../config/nodeTypes.js';

/**
 * HTML exporter for sessions.
 */
export class HTMLExporter {
  constructor() {
    this.mimeType = 'text/html';
  }

  export(session, options = {}) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session ${session.id}</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="session-export">
    <header>
      <h1>Session Reconstruction</h1>
      <div class="metadata">
        <div><strong>Session ID:</strong> ${escapeHtml(session.id)}</div>
        <div><strong>Model:</strong> ${escapeHtml(session.model)}</div>
        <div><strong>Date:</strong> ${formatTimestamp(session.timestamp)}</div>
      </div>
    </header>
    
    <div class="content">
      ${this.renderNodes(session.rootMessages, 0, options)}
    </div>
  </div>
</body>
</html>`;
    
    return html;
  }

  renderNodes(nodes, depth, options) {
    return nodes.map(node => this.renderNode(node, depth, options)).join('\n');
  }

  renderNode(node, depth, options) {
    const config = NODE_CONFIG[node.type];
    const indent = depth * 20;
    
    let html = `<div class="node node-${node.type}" style="margin-left: ${indent}px; border-left-color: ${config.color};">`;
    
    switch (node.type) {
      case 'user':
        html += `<div class="node-header" style="background-color: ${config.bgColor};">
          <span class="node-label" style="color: ${config.color};">${config.label}</span>
          <span class="node-time">${formatTimestamp(node.timestamp)}</span>
        </div>`;
        html += `<div class="node-content">${escapeHtml(node.content).replace(/\n/g, '<br>')}</div>`;
        break;
        
      case 'assistant':
        html += `<div class="node-header" style="background-color: ${config.bgColor};">
          <span class="node-label" style="color: ${config.color};">${config.label}</span>
          <span class="node-time">${formatTimestamp(node.timestamp)}</span>
        </div>`;
        
        if (node.thinking && !options.noThinking) {
          html += `<div class="thinking-block">
            <strong>Thinking:</strong>
            <pre>${escapeHtml(node.thinking)}</pre>
          </div>`;
        }
        
        html += `<div class="node-content">${escapeHtml(node.content).replace(/\n/g, '<br>')}</div>`;
        break;
        
      case 'tool_call':
        html += `<div class="node-header" style="background-color: ${config.bgColor};">
          <span class="node-label" style="color: ${config.color};">${config.label}: ${escapeHtml(node.name)}</span>
          <span class="node-status status-${node.status}">${node.status}</span>
        </div>`;
        html += `<div class="tool-details">
          <strong>Input:</strong>
          <pre>${escapeHtml(JSON.stringify(node.input, null, 2))}</pre>
          <strong>Output:</strong>
          <pre>${escapeHtml(node.output)}</pre>
        </div>`;
        break;
        
      case 'subagent':
        html += `<div class="node-header" style="background-color: ${config.bgColor};">
          <span class="node-label" style="color: ${config.color};">${config.label}: ${escapeHtml(node.name)}</span>
        </div>`;
        html += `<div class="node-content"><strong>Task:</strong> ${escapeHtml(node.task)}</div>`;
        break;
    }
    
    if (node.children?.length) {
      html += this.renderNodes(node.children, depth + 1, options);
    }
    
    html += '</div>';
    return html;
  }

  getStyles() {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, sans-serif; background: #0a0a0b; color: #e4e4e7; padding: 20px; }
      .session-export { max-width: 1200px; margin: 0 auto; }
      header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #27272a; }
      h1 { font-size: 24px; margin-bottom: 15px; }
      .metadata { display: flex; gap: 20px; font-size: 14px; color: #a1a1aa; }
      .content { display: flex; flex-direction: column; gap: 10px; }
      .node { border-left: 3px solid; padding: 12px; background: #18181b; border-radius: 4px; }
      .node-header { display: flex; justify-content: space-between; padding: 8px; border-radius: 4px; margin-bottom: 8px; }
      .node-label { font-weight: 600; font-size: 12px; text-transform: uppercase; }
      .node-time { font-size: 11px; color: #71717a; }
      .node-content { padding: 8px; line-height: 1.6; }
      .node-status { font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #27272a; }
      .status-error { color: #ef4444; }
      .status-success { color: #10b981; }
      .thinking-block { background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 4px; margin: 8px 0; }
      .thinking-block strong { color: #10b981; }
      .thinking-block pre { margin-top: 8px; white-space: pre-wrap; font-size: 12px; }
      .tool-details { padding: 8px; }
      .tool-details strong { display: block; margin-top: 12px; margin-bottom: 4px; color: #a1a1aa; }
      .tool-details pre { background: #0a0a0b; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
      .empty-message { color: #71717a; font-style: italic; }
    `;
  }
}
