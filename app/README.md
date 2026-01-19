# Claude Session Viewer

Interactive web application for visualizing and analyzing Claude Code session data.

## Features

- **Session Discovery**: Browse all Claude Code sessions across projects
- **Hierarchical Tree View**: Visualize conversation flow with expandable nodes
- **Sub-Agent Support**: Automatically loads and displays nested sub-agent sessions
- **Rich Details**: View thinking blocks, tool calls, inputs/outputs, and errors
- **Search & Filter**: Find specific nodes by content or type
- **Export**: Export sessions to Markdown or HTML
- **Recent Sessions**: Quick access to recently viewed sessions

## Quick Start

1. **Start the server:**
   ```bash
   cd app
   ./start.sh
   ```
   Or manually:
   ```bash
   python3 serve.py
   ```

2. **Open in browser:**
   ```
   http://localhost:8000/index.html
   ```

3. **Select a session:**
   - Choose a project from the dropdown
   - Select a session from the list
   - Click "Load Session"

## Architecture

The application uses a fully modular architecture:

### Core Infrastructure
- **EventBus**: Pub/sub system for decoupled module communication
- **StateManager**: Centralized immutable state management
- **Component**: Base class for UI components with lifecycle hooks
- **Module**: Base class for non-UI modules

### Data Layer
- **APIClient**: HTTP client for backend communication
- **SessionParser**: Parses JSONL events into structured data
- **TreeTransformer**: Builds hierarchical tree from flat events
- **SubAgentLoader**: Detects and loads sub-agent sessions
- **NodeFactory**: Creates typed tree nodes

### UI Components
- **TreeView**: Hierarchical tree visualization
- **DetailPanel**: Selected node details
- **StatsBar**: Session statistics
- **Toolbar**: Filters and controls
- **Toast**: Notifications

### Features
- **SessionSelector**: Project and session browsing
- **ExportManager**: Markdown and HTML export
- **SearchEngine**: Content search
- **FilterManager**: Type filtering

### Services
- **StorageService**: localStorage persistence
- **ConfigService**: Application configuration
- **IconService**: SVG icon management

## Directory Structure

```
app/
├── index.html              # Main HTML shell
├── serve.py                # Python backend server
├── start.sh                # Quick start script
│
├── server/                 # Backend modules
│   ├── handler.py          # Request router
│   ├── routes/             # API endpoints
│   │   ├── projects.py
│   │   ├── sessions.py
│   │   ├── session.py
│   │   └── subagent.py
│   └── utils/              # Server utilities
│       ├── security.py
│       ├── jsonl.py
│       └── discovery.py
│
├── js/                     # Frontend modules
│   ├── main.js             # App orchestrator
│   ├── core/               # Core infrastructure
│   ├── data/               # Data layer
│   ├── components/         # UI components
│   ├── features/           # Feature modules
│   ├── services/           # Application services
│   ├── utils/              # Utility functions
│   └── config/             # Configuration
│
└── css/                    # Stylesheets
    ├── reset.css
    ├── variables.css
    ├── typography.css
    ├── layout.css
    └── components.css
```

## API Endpoints

- `GET /api/projects` - List all projects
- `GET /api/sessions?project=<name>` - List sessions for project
- `GET /api/session?project=<name>&sessionId=<id>` - Load session
- `GET /api/subagent?project=<name>&sessionId=<id>&agentId=<aid>` - Load sub-agent
- `GET /api/health` - Health check

## Development

### Prerequisites
- Python 3.7+
- Modern browser (Chrome, Firefox, Safari, Edge)

### No Build Step
The application uses vanilla JavaScript ES6 modules - no build tools required.

### Development Workflow
1. Edit files in `app/`
2. Refresh browser to see changes
3. Check browser console for errors

### Adding New Features

**New Exporter:**
1. Create `js/features/Export/exporters/NewExporter.js`
2. Implement `export(session, options)` method
3. Register in `ExportManager.js`

**New Component:**
1. Create `js/components/NewComponent/NewComponent.js`
2. Extend `Component` base class
3. Initialize in `main.js`

**New Service:**
1. Create `js/services/NewService.js`
2. Extend `Module` base class
3. Initialize in `main.js`

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- ES6+ modules
- Fetch API
- localStorage
- CSS Grid/Flexbox

## Security

- Backend restricts file access to `~/.claude/` directory only
- All user inputs are sanitized
- XSS prevention via `textContent` usage
- Path traversal protection

## License

Private collection - not for public distribution
