// js/components/common/SessionFilesModal.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';
import { state } from '../../core/StateManager.js';
import { escapeHtml } from '../../utils/sanitize.js';

/**
 * Modal component for displaying session file tracking information.
 * Shows loaded files, missing files, and failed file operations.
 */
export class SessionFilesModal extends Component {
  init() {
    this.isOpen = false;
    this.bindEvents();
  }

  bindEvents() {
    console.log('SessionFilesModal: Binding events');
    this.subscribe(Events.SESSION_FILES_MODAL_OPEN, () => {
      console.log('SessionFilesModal: Received OPEN event');
      this.open();
    });

    this.subscribe(Events.SESSION_FILES_MODAL_CLOSE, () => {
      console.log('SessionFilesModal: Received CLOSE event');
      this.close();
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.render();
    const modal = document.getElementById('session-files-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Animate in
      requestAnimationFrame(() => {
        modal.classList.add('show');
      });
    }
  }

  close() {
    this.isOpen = false;
    const modal = document.getElementById('session-files-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 200); // Match CSS transition duration
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.emit(Events.TOAST_SHOW, {
        message: 'Path copied to clipboard',
        type: 'success',
        duration: 2000
      });
    }).catch(() => {
      this.emit(Events.TOAST_SHOW, {
        message: 'Failed to copy path',
        type: 'error',
        duration: 2000
      });
    });
  }

  renderFileItem(file, type) {
    const icons = {
      loaded: '✓',
      missing: '⚠',
      failed: '✗'
    };
    
    const colors = {
      loaded: 'var(--color-success)',
      missing: '#f59e0b',
      failed: 'var(--color-error)'
    };

    const path = file.path || file.expectedPath;
    const displayPath = path.replace(/^~/, '~'); // Keep tilde notation
    
    let details = '';
    if (type === 'loaded') {
      details = `<span class="file-meta">Type: ${file.type}${file.agentId ? ` | Agent: ${file.agentId}` : ''}</span>`;
    } else if (type === 'missing') {
      details = `<span class="file-meta">Agent ID: ${file.agentId}${file.detectedIn ? ` | Detected in: ${file.detectedIn}` : ''}</span>`;
    } else if (type === 'failed') {
      details = `<span class="file-meta error-text">Error: ${escapeHtml(file.error)}</span>`;
    }

    return `
      <div class="file-item">
        <span class="file-icon" style="color: ${colors[type]}">${icons[type]}</span>
        <div class="file-info">
          <div class="file-path" title="${escapeHtml(displayPath)}">${escapeHtml(displayPath)}</div>
          ${details}
        </div>
        <button class="btn-copy" data-path="${escapeHtml(path)}" title="Copy path">
          📋
        </button>
      </div>
    `;
  }

  renderSection(title, files, type, icon) {
    if (files.length === 0) {
      return '';
    }

    const items = files.map(file => this.renderFileItem(file, type)).join('');
    
    return `
      <div class="file-section">
        <div class="section-header">
          <h3>${icon} ${title} (${files.length})</h3>
        </div>
        <div class="file-list">
          ${items}
        </div>
      </div>
    `;
  }

  render() {
    const modal = document.getElementById('session-files-modal');
    if (!modal) return;

    const fileTracking = state.get('fileTracking') || {
      loaded: [],
      missing: [],
      failed: [],
      summary: { totalLoaded: 0, totalMissing: 0, totalFailed: 0 }
    };

    const session = state.get('session');
    const sessionId = session?.id || 'Unknown';

    const loadedSection = this.renderSection(
      'Loaded Files',
      fileTracking.loaded,
      'loaded',
      '✓'
    );

    const missingSection = this.renderSection(
      'Missing Files',
      fileTracking.missing,
      'missing',
      '⚠'
    );

    const failedSection = this.renderSection(
      'Failed Files',
      fileTracking.failed,
      'failed',
      '✗'
    );

    const hasContent = fileTracking.loaded.length > 0 || 
                       fileTracking.missing.length > 0 || 
                       fileTracking.failed.length > 0;

    const content = hasContent ? 
      `${loadedSection}${missingSection}${failedSection}` :
      '<div class="empty-state"><p>No file tracking data available</p></div>';

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Session Files</h2>
          <div class="session-id-display">${escapeHtml(sessionId)}</div>
          <button class="modal-close" id="modal-close-btn">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          <div class="summary">
            <span class="summary-item">
              <span style="color: var(--color-success)">✓</span> ${fileTracking.summary.totalLoaded} loaded
            </span>
            <span class="summary-item">
              <span style="color: #f59e0b">⚠</span> ${fileTracking.summary.totalMissing} missing
            </span>
            <span class="summary-item">
              <span style="color: var(--color-error)">✗</span> ${fileTracking.summary.totalFailed} failed
            </span>
          </div>
        </div>
      </div>
    `;

    // Bind close button
    const closeBtn = modal.querySelector('#modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    // Bind backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.close();
      }
    };

    // Bind copy buttons
    const copyButtons = modal.querySelectorAll('.btn-copy');
    copyButtons.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const path = btn.getAttribute('data-path');
        if (path) {
          this.copyToClipboard(path);
        }
      };
    });
  }
}
