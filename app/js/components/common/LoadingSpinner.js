// js/components/common/LoadingSpinner.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';

/**
 * Loading spinner component.
 */
export class LoadingSpinner extends Component {
  init() {
    this.bindEvents();
  }

  bindEvents() {
    this.watchState('app.loading', ({ value }) => {
      if (value) {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  show() {
    if (!this.container) return;
    this.container.style.display = 'flex';
  }

  hide() {
    if (!this.container) return;
    this.container.style.display = 'none';
  }

  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="spinner">
        <div class="spinner-circle"></div>
      </div>
    `;
    this.hide();
  }
}
