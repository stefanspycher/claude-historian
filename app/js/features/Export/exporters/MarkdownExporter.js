// js/features/Export/exporters/MarkdownExporter.js

import { formatTimestamp } from '../../../utils/date.js';

/**
 * Markdown exporter for sessions.
 */
export class MarkdownExporter {
  constructor() {
    this.mimeType = 'text/markdown';
  }

  export(session, options = {}) {
    const lines = [];
    
    lines.push('# Session Reconstruction\n');
    lines.push(`**Session ID**: \`${session.id}\``);
    lines.push(`**Model**: ${session.model}`);
    lines.push(`**Date**: ${formatTimestamp(session.timestamp)}\n`);
    lines.push('---\n');
    
    this.traverseNodes(session.rootMessages, 0, (node, depth) => {
      lines.push(this.renderNode(node, depth, options));
    });
    
    return lines.join('\n');
  }

  traverseNodes(nodes, depth, callback) {
    nodes.forEach(node => {
      callback(node, depth);
      if (node.children?.length) {
        this.traverseNodes(node.children, depth + 1, callback);
      }
    });
  }

  renderNode(node, depth, options) {
    const indent = '> '.repeat(depth);
    const lines = [];
    
    switch (node.type) {
      case 'user':
        lines.push(`${indent}## User (${formatTimestamp(node.timestamp)})`);
        lines.push(`${indent}${node.content}`);
        lines.push('');
        break;
        
      case 'assistant':
        lines.push(`${indent}## Claude (${formatTimestamp(node.timestamp)})`);
        
        if (node.thinking && !options.noThinking) {
          lines.push(`${indent}> [!NOTE] Thinking Process`);
          node.thinking.split('\n').forEach(line => {
            lines.push(`${indent}> ${line}`);
          });
          lines.push('');
        }
        
        lines.push(`${indent}${node.content}`);
        lines.push('');
        break;
        
      case 'tool_call':
        lines.push(`${indent}**Tool**: \`${node.name}\` (${node.status})`);
        lines.push(`${indent}\`\`\`json`);
        lines.push(`${indent}${JSON.stringify(node.input, null, 2)}`);
        lines.push(`${indent}\`\`\``);
        
        if (node.output) {
          lines.push(`${indent}**Result**:`);
          lines.push(`${indent}\`\`\``);
          lines.push(`${indent}${node.output}`);
          lines.push(`${indent}\`\`\``);
        }
        
        if (node.error) {
          lines.push(`${indent}**Error**: ${node.error}`);
        }
        lines.push('');
        break;
        
      case 'subagent':
        lines.push(`${indent}---`);
        lines.push(`${indent}**Sub-Agent**: ${node.name}`);
        lines.push(`${indent}**Task**: ${node.task}`);
        lines.push(`${indent}---`);
        lines.push('');
        break;
    }
    
    return lines.join('\n');
  }
}
