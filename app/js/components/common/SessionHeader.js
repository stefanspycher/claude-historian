// js/components/common/SessionHeader.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';
import { formatTimestamp } from '../../utils/date.js';

/**
 * Session header component for displaying session metadata.
 */
export class SessionHeader extends Component {
  init() {
    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.SESSION_LOADED, ({ session }) => {
      this.updateHeader(session);
    });

    this.subscribe(Events.SESSION_CLOSE, () => {
      this.clearHeader();
    });
  }

  setupClickHandler(sessionIdEl) {
    if (sessionIdEl && !sessionIdEl.dataset.handlerSet) {
      console.log('Setting up click handler for session ID');
      sessionIdEl.style.cursor = 'pointer';
      sessionIdEl.title = 'Click to view session files';
      sessionIdEl.onclick = () => {
        console.log('Session ID clicked! Emitting SESSION_FILES_MODAL_OPEN');
        this.emit(Events.SESSION_FILES_MODAL_OPEN);
      };
      sessionIdEl.dataset.handlerSet = 'true';
    } else {
      console.log('Click handler already set or element not found');
    }
  }

  updateHeader(session) {
    console.log('SessionHeader.updateHeader called with:', session);
    
    const sessionIdEl = document.getElementById('session-id');
    const sessionModelEl = document.getElementById('session-model');
    const sessionTimeEl = document.getElementById('session-time');

    console.log('Found elements:', { sessionIdEl, sessionModelEl, sessionTimeEl });

    if (sessionIdEl) {
      // Show full session ID instead of truncated
      console.log('Setting session ID to:', session.id);
      sessionIdEl.textContent = session.id;
      sessionIdEl.classList.add('clickable');
      // Setup click handler now that element exists
      this.setupClickHandler(sessionIdEl);
    }

    if (sessionModelEl) {
      sessionModelEl.textContent = session.model;
    }

    if (sessionTimeEl) {
      sessionTimeEl.textContent = formatTimestamp(session.timestamp);
    }
  }

  clearHeader() {
    const sessionIdEl = document.getElementById('session-id');
    const sessionModelEl = document.getElementById('session-model');
    const sessionTimeEl = document.getElementById('session-time');

    if (sessionIdEl) {
      sessionIdEl.textContent = '';
      sessionIdEl.classList.remove('clickable');
    }
    if (sessionModelEl) sessionModelEl.textContent = '';
    if (sessionTimeEl) sessionTimeEl.textContent = '';
  }

  render() {
    // Header is static HTML, just update content
  }
}
