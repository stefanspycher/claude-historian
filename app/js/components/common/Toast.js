// js/components/common/Toast.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';

/**
 * Toast notification component.
 */
export class Toast extends Component {
  init() {
    this.toasts = [];
    this.bindEvents();
  }

  bindEvents() {
    this.subscribe(Events.TOAST_SHOW, ({ message, type, duration }) => {
      this.show(message, type, duration);
    });

    this.subscribe(Events.TOAST_HIDE, () => {
      this.hideAll();
    });
  }

  show(message, type = 'info', duration = 3000) {
    const toast = this.createElement('div', {
      className: `toast toast-${type}`
    });

    const messageEl = this.createElement('span', {}, [message]);
    toast.appendChild(messageEl);

    const closeBtn = this.createElement('button', {
      className: 'toast-close'
    }, ['×']);
    
    this.addListener(closeBtn, 'click', () => {
      this.hide(toast);
    });
    
    toast.appendChild(closeBtn);

    document.body.appendChild(toast);
    this.toasts.push(toast);

    // Auto-hide
    if (duration > 0) {
      setTimeout(() => this.hide(toast), duration);
    }

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
  }

  hide(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300);
  }

  hideAll() {
    this.toasts.forEach(toast => this.hide(toast));
  }
}
