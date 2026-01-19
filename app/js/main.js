// js/main.js

/**
 * App Orchestrator
 * Initializes all modules and manages application lifecycle.
 */

import { eventBus } from './core/EventBus.js';
import { state } from './core/StateManager.js';
import { Events } from './config/events.js';

// Data layer
import { APIClient } from './data/APIClient.js';
import { SessionParser } from './data/SessionParser.js';
import { TreeTransformer } from './data/TreeTransformer.js';
import { SubAgentLoader } from './data/SubAgentLoader.js';
import { fileTracker } from './data/FileTracker.js';

// Services
import { StorageService } from './services/StorageService.js';
import { ConfigService } from './services/ConfigService.js';
import { IconService } from './services/IconService.js';

// Features
import { SessionSelector } from './features/SessionSelector/SessionSelector.js';
import { ExportManager } from './features/Export/ExportManager.js';
import { SearchEngine } from './features/Search/SearchEngine.js';
import { FilterManager } from './features/Filters/FilterManager.js';

// UI Components
import { TreeView } from './components/TreeView/TreeView.js';
import { DetailPanel } from './components/DetailPanel/DetailPanel.js';
import { StatsBar } from './components/StatsBar/StatsBar.js';
import { Toolbar } from './components/Toolbar/Toolbar.js';
import { Toast } from './components/common/Toast.js';
import { LoadingSpinner } from './components/common/LoadingSpinner.js';
import { SessionHeader } from './components/common/SessionHeader.js';
import { SessionFilesModal } from './components/common/SessionFilesModal.js';

class App {
  constructor() {
    this.modules = {};
  }

  async init() {
    console.log('🚀 Initializing Session Viewer...');
    
    // Wait for DOM
    await this.waitForDOM();
    
    // Initialize services first
    this.initServices();
    
    // Initialize data layer
    this.initDataLayer();
    
    // Initialize features
    this.initFeatures();
    
    // Initialize UI
    this.initUI();
    
    // Bind global events
    this.bindEvents();
    
    // Check server connection
    await this.checkServer();
    
    // Load initial data
    this.loadInitialData();
    
    eventBus.emit(Events.APP_READY);
    console.log('✅ Session Viewer ready');
  }

  initServices() {
    this.modules.config = new ConfigService();
    this.modules.storage = new StorageService();
    this.modules.icons = new IconService();
  }

  initDataLayer() {
    this.modules.api = new APIClient({
      baseUrl: this.modules.config.get('API_URL')
    });
    
    this.modules.parser = new SessionParser();
    this.modules.transformer = new TreeTransformer();
    
    this.modules.subAgentLoader = new SubAgentLoader({
      apiClient: this.modules.api,
      parser: this.modules.parser,
      transformer: this.modules.transformer
    });
  }

  initFeatures() {
    this.modules.search = new SearchEngine();
    this.modules.filter = new FilterManager();
    this.modules.export = new ExportManager();
  }

  initUI() {
    // Session selector (initial view)
    this.modules.selector = new SessionSelector('#session-selector', {
      api: this.modules.api,
      storage: this.modules.storage
    });
    
    // Viewer components
    this.modules.treeView = new TreeView('#tree-scroll');
    this.modules.detailPanel = new DetailPanel('#detail-panel');
    this.modules.statsBar = new StatsBar('#stats-bar');
    this.modules.toolbar = new Toolbar('.toolbar');
    this.modules.sessionHeader = new SessionHeader('.session-info');
    
    // Common components
    this.modules.toast = new Toast();
    this.modules.spinner = new LoadingSpinner('#loading-spinner');
    this.modules.sessionFilesModal = new SessionFilesModal('#session-files-modal');
  }

  bindEvents() {
    // Session selection
    eventBus.on(Events.SESSION_SELECT, async ({ project, sessionId }) => {
      await this.loadSession(project, sessionId);
    });
    
    // View changes
    eventBus.on(Events.VIEW_CHANGE, ({ view }) => {
      this.switchView(view);
    });
    
    // Session close
    eventBus.on(Events.SESSION_CLOSE, () => {
      state.set('session', null);
      this.switchView('selector');
    });
    
    // Error handling
    eventBus.on(Events.APP_ERROR, ({ error }) => {
      console.error('App error:', error);
      eventBus.emit(Events.TOAST_SHOW, {
        message: error.message,
        type: 'error',
        duration: 5000
      });
    });
  }

  async loadSession(project, sessionId) {
    state.set('app.loading', true);
    eventBus.emit(Events.SESSION_LOADING);
    
    // Reset file tracker for new session
    fileTracker.reset();
    
    try {
      console.log(`Loading session ${sessionId} from project ${project}...`);
      
      // Load session data
      const data = await this.modules.api.loadSession(project, sessionId);
      console.log(`Loaded ${data.events.length} events`);
      
      // Track main session file
      const mainPath = data.path || this.constructSessionPath(project, sessionId);
      fileTracker.recordLoaded(mainPath, 'main', null, {
        project,
        sessionId,
        eventCount: data.events.length
      });
      
      // Parse events
      const parsedEvents = this.modules.parser.parseEvents(data.events);
      console.log(`Parsed ${parsedEvents.length} events`);
      
      // Transform to tree
      const tree = this.modules.transformer.transform(parsedEvents, {
        sessionId,
        project
      });
      console.log(`Built tree with ${tree.rootMessages.length} root messages`);
      
      // Load sub-agents (will auto-track via SubAgentLoader)
      this.modules.subAgentLoader.reset();
      await this.modules.subAgentLoader.loadSubAgents(tree, project, sessionId);
      console.log('Sub-agents loaded');
      
      // Update state with session and file tracking
      state.set('session', tree);
      state.set('fileTracking', fileTracker.getReport());
      
      // Save to recent
      this.modules.storage.addRecentSession(project, sessionId);
      
      // Switch to viewer
      this.switchView('viewer');
      
      eventBus.emit(Events.SESSION_LOADED, { session: tree });
      
      eventBus.emit(Events.TOAST_SHOW, {
        message: 'Session loaded successfully',
        type: 'success'
      });
      
    } catch (error) {
      console.error('Failed to load session:', error);
      
      // Track the failure
      const expectedPath = this.constructSessionPath(project, sessionId);
      fileTracker.recordFailed(expectedPath, error.message, {
        project,
        sessionId,
        status: error.status
      });
      state.set('fileTracking', fileTracker.getReport());
      
      eventBus.emit(Events.SESSION_ERROR, { error });
      eventBus.emit(Events.APP_ERROR, { error });
    } finally {
      state.set('app.loading', false);
    }
  }
  
  constructSessionPath(project, sessionId) {
    const normalizedProject = project.replace(/\//g, '-').replace(/\./g, '-');
    return `~/.claude/projects/${normalizedProject}/${sessionId}.jsonl`;
  }

  switchView(view) {
    state.set('app.view', view);
    
    const selector = document.getElementById('session-selector');
    const viewer = document.getElementById('session-viewer');
    
    if (view === 'selector') {
      if (selector) selector.style.display = 'flex';
      if (viewer) viewer.style.display = 'none';
    } else {
      if (selector) selector.style.display = 'none';
      if (viewer) viewer.style.display = 'flex';
    }
  }

  async checkServer() {
    const isHealthy = await this.modules.api.healthCheck();
    if (!isHealthy) {
      eventBus.emit(Events.TOAST_SHOW, {
        message: 'Warning: Cannot connect to server. Make sure serve.py is running.',
        type: 'error',
        duration: 0
      });
    }
  }

  loadInitialData() {
    // Load recent sessions
    const recent = this.modules.storage.getRecentSessions();
    state.set('recentSessions', recent);
    eventBus.emit(Events.RECENT_UPDATED, { sessions: recent });
    
    // Load projects
    eventBus.emit(Events.PROJECTS_LOAD);
  }

  waitForDOM() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }
}

// Initialize app
const app = new App();
app.init().catch(console.error);

export { app };
