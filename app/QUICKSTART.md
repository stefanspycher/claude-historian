# Quick Start Guide

## 1. Start the Server

```bash
cd app
./start.sh
```

Or manually:
```bash
python3 serve.py
```

## 2. Open in Browser

Navigate to: `http://localhost:8000/index.html`

## 3. Load a Session

1. **Select Project**: Choose from dropdown
2. **Select Session**: Click on a session in the list
3. **Load**: Click "Load Session" button

## 4. Explore the Session

- **Click nodes** to see details
- **Click arrows (▶/▼)** to expand/collapse
- **Use search** to find specific content
- **Use filters** to show only certain node types
- **Click Export** to download as Markdown or HTML

## That's it!

For more details, see:
- `README.md` - Full documentation
- `USAGE.md` - Detailed usage guide
- `ARCHITECTURE.md` - Technical architecture
- `TESTING.md` - Testing checklist

## Troubleshooting

**Server won't start?**
- Check Python 3 is installed: `python3 --version`
- Check port 8000 is free: `lsof -i :8000`

**No sessions showing?**
- Make sure you have Claude Code sessions in `~/.claude/projects/`
- Check browser console (F12) for errors

**Need help?**
- Check browser console for errors
- Check server terminal for logs
- See `TESTING.md` for common issues
