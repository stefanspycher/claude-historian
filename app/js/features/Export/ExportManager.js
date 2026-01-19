// js/features/Export/ExportManager.js

import { Module } from '../../core/Module.js';
import { Events } from '../../config/events.js';
import { MarkdownExporter } from './exporters/MarkdownExporter.js';
import { HTMLExporter } from './exporters/HTMLExporter.js';

/**
 * Export manager for handling session exports.
 */
export class ExportManager extends Module {
  init() {
    this.exporters = {
      markdown: new MarkdownExporter(),
      html: new HTMLExporter()
    };

    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.EXPORT_START, async ({ format, options }) => {
      await this.export(format, options);
    });
  }

  async export(format, options = {}) {
    try {
      const session = this.getState('session');
      if (!session) {
        throw new Error('No session loaded');
      }

      const exporter = this.exporters[format];
      if (!exporter) {
        throw new Error(`Unknown export format: ${format}`);
      }

      const content = exporter.export(session, options);
      const filename = this.generateFilename(session, format);
      
      this.downloadFile(content, filename, exporter.mimeType);
      
      this.emit(Events.EXPORT_COMPLETE, { format, filename });
      this.emit(Events.TOAST_SHOW, {
        message: `Exported to ${filename}`,
        type: 'success'
      });
    } catch (error) {
      this.emit(Events.EXPORT_ERROR, { error });
      this.emit(Events.TOAST_SHOW, {
        message: `Export failed: ${error.message}`,
        type: 'error'
      });
    }
  }

  generateFilename(session, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = format === 'html' ? 'html' : 'md';
    return `session-${session.id.slice(0, 8)}-${timestamp}.${ext}`;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
