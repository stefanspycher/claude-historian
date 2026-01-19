// js/features/SessionSelector/SessionSelector.js

import { Component } from '../../core/Component.js';
import { Events } from '../../config/events.js';

/**
 * Session selector for browsing and selecting sessions.
 */
export class SessionSelector extends Component {
  init() {
    this.projects = [];
    this.sessions = [];
    this.selectedProject = null;
    this.selectedSession = null;
    
    this.bindEvents();
    this.loadProjects();
  }

  bindEvents() {
    // Projects loaded
    this.subscribe(Events.PROJECTS_LOAD, () => {
      this.loadProjects();
    });

    this.subscribe(Events.PROJECTS_LOADED, ({ projects }) => {
      this.projects = projects;
      this.renderProjects();
    });

    // Sessions loaded
    this.subscribe(Events.SESSIONS_LOADED, ({ sessions }) => {
      this.sessions = sessions;
      this.renderSessions();
    });

    // Recent sessions
    this.subscribe(Events.RECENT_UPDATED, ({ sessions }) => {
      this.renderRecentSessions(sessions);
    });

    // Setup UI controls
    this.setupControls();
  }

  setupControls() {
    // Project select
    const projectSelect = document.querySelector('#project-select');
    if (projectSelect) {
      this.addListener(projectSelect, 'change', (e) => {
        this.selectedProject = e.target.value;
        if (this.selectedProject) {
          this.loadSessions(this.selectedProject);
        }
      });
    }

    // Load button
    const loadBtn = document.querySelector('#load-session-btn');
    if (loadBtn) {
      this.addListener(loadBtn, 'click', () => {
        if (this.selectedProject && this.selectedSession) {
          this.emit(Events.SESSION_SELECT, {
            project: this.selectedProject,
            sessionId: this.selectedSession
          });
        }
      });
    }
  }

  async loadProjects() {
    try {
      const api = this.options.api;
      const data = await api.listProjects();
      this.emit(Events.PROJECTS_LOADED, { projects: data.projects });
    } catch (error) {
      this.emit(Events.PROJECTS_ERROR, { error });
    }
  }

  async loadSessions(project) {
    try {
      const api = this.options.api;
      const data = await api.listSessions(project);
      this.emit(Events.SESSIONS_LOADED, { sessions: data.sessions });
    } catch (error) {
      this.emit(Events.SESSIONS_ERROR, { error });
    }
  }

  renderProjects() {
    const select = document.querySelector('#project-select');
    if (!select) return;

    // Clear existing options (except first)
    while (select.options.length > 1) {
      select.remove(1);
    }

    this.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.name;
      option.textContent = `${project.name} (${project.sessionCount} sessions)`;
      select.appendChild(option);
    });
  }

  renderSessions() {
    const list = document.querySelector('#session-list');
    if (!list) return;

    list.innerHTML = '';

    if (this.sessions.length === 0) {
      list.innerHTML = '<p class="empty-message">No sessions found</p>';
      return;
    }

    this.sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'session-item';
      
      if (this.selectedSession === session.sessionId) {
        item.classList.add('selected');
      }

      const info = document.createElement('div');
      info.className = 'session-info';
      
      const timestamp = document.createElement('div');
      timestamp.className = 'session-timestamp';
      timestamp.textContent = new Date(session.timestamp).toLocaleString();
      info.appendChild(timestamp);

      if (session.firstPrompt) {
        const prompt = document.createElement('div');
        prompt.className = 'session-prompt';
        prompt.textContent = session.firstPrompt;
        info.appendChild(prompt);
      }

      const meta = document.createElement('div');
      meta.className = 'session-meta';
      meta.textContent = `${session.messageCount || 0} messages`;
      info.appendChild(meta);

      item.appendChild(info);

      this.addListener(item, 'click', () => {
        this.selectedSession = session.sessionId;
        this.renderSessions();
      });

      list.appendChild(item);
    });
  }

  renderRecentSessions(sessions) {
    const list = document.querySelector('#recent-list');
    if (!list) return;

    list.innerHTML = '';

    if (sessions.length === 0) {
      list.innerHTML = '<li class="empty-message">No recent sessions</li>';
      return;
    }

    sessions.forEach(session => {
      const item = document.createElement('li');
      item.className = 'recent-item';
      
      const text = `${session.project} / ${session.sessionId.slice(0, 8)}...`;
      item.textContent = text;

      this.addListener(item, 'click', () => {
        this.emit(Events.SESSION_SELECT, {
          project: session.project,
          sessionId: session.sessionId
        });
      });

      list.appendChild(item);
    });
  }

  render() {
    // Selector is mostly event-driven
  }
}
