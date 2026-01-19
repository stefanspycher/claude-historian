// js/data/SessionParser.js

import { Module } from '../core/Module.js';

/**
 * Parses raw JSONL events into structured format.
 * Handles content extraction, thinking blocks, tool matching.
 */
export class SessionParser extends Module {
  /**
   * Parse array of raw events
   */
  parseEvents(events) {
    return events.map((event, index) => this.parseEvent(event, index));
  }

  /**
   * Parse single event
   */
  parseEvent(event, index) {
    const base = {
      _index: index,
      type: event.type,
      timestamp: event.timestamp
    };

    switch (event.type) {
      case 'user':
        return { ...base, ...this.parseUserEvent(event) };
      case 'assistant':
        return { ...base, ...this.parseAssistantEvent(event) };
      case 'summary':
        return { ...base, summary: event.summary };
      default:
        return base;
    }
  }

  /**
   * Parse user event
   */
  parseUserEvent(event) {
    const content = event.message?.content || [];
    const result = {
      textContent: [],
      toolResults: []
    };

    const items = Array.isArray(content) ? content : [{ type: 'text', text: content }];
    
    for (const item of items) {
      if (item.type === 'text') {
        result.textContent.push(item.text);
      } else if (item.type === 'tool_result') {
        result.toolResults.push({
          toolUseId: item.tool_use_id,
          content: this.extractContent(item.content),
          isError: item.is_error || false
          // Note: agentId detection removed - now using Approach A (API-based discovery)
        });
      }
    }

    return result;
  }

  /**
   * Parse assistant event
   */
  parseAssistantEvent(event) {
    const content = event.message?.content || [];
    const result = {
      textContent: [],
      thinking: null,
      toolUses: []
    };

    const items = Array.isArray(content) ? content : [{ type: 'text', text: content }];
    
    for (const item of items) {
      if (item.type === 'text') {
        result.textContent.push(item.text);
      } else if (item.type === 'thinking') {
        result.thinking = item.thinking;
      } else if (item.type === 'tool_use') {
        result.toolUses.push({
          id: item.id,
          name: item.name,
          input: item.input
        });
      }
    }

    return result;
  }

  /**
   * Extract text content from various formats
   */
  extractContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }
    return '';
  }
}
