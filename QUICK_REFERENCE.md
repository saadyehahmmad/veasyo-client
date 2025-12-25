# PC Agent - Quick Reference Guide

## Installation & Setup

### One-Time Setup
```bash
npm install
npm run build
```

### Create Configuration
Copy `env.example` to `.env` and edit:
```bash
# Windows
copy env.example .env
notepad .env
```

Required settings:
- `BACKEND_URL` - Your Waiter backend URL
- `TENANT_ID` - Your restaurant/tenant UUID
- `PRINTER_IP` - Your printer's IP address (optional, can be set in admin panel)
- `PRINTER_PORT` - Usually 9100

---

## Running the Agent

### Method 1: Foreground (Testing/Debugging)
```bash
npm start
```
- See output in real-time
- Press Ctrl+C to stop
- Best for debugging

### Method 2: Background Process (Production - Simple)
```bash
npm run start:bg   # Start in background
npm run status     # Check if running
npm run stop       # Stop the agent
```
- No console output
- Runs hidden in background
- Check logs: `logs/pc-agent.log`
- Best for daily use

**Windows Users - Double-click method:**
- Double-click `start-background.bat` to start
- Double-click `stop-agent.bat` to stop
- Double-click `status-agent.bat` to check status

### Method 3: Windows Service (Production - Auto-start)
```bash
# Install (run as Administrator)
npm run cli
# Select option 4: Install as Windows Service

# Or use PowerShell script:
.\install-service-admin.ps1
```
- Auto-starts on Windows boot
- Requires Administrator privileges
- Manage via Windows Services (services.msc)
- Best for servers

---

## Common Commands

### Check Status
```bash
npm run status
```

### View Logs
```bash
# Windows PowerShell
Get-Content logs/pc-agent.log -Tail 50

# Windows CMD
type logs\pc-agent.log
```

### Restart Agent
```bash
npm run stop
npm run start:bg
```

### Update Configuration
```bash
notepad .env
npm run stop
npm run start:bg
```

---

## Troubleshooting

### Agent Won't Start
1. Check if already running: `npm run status`
2. Check logs: `logs/error.log`
3. Verify .env file exists
4. Rebuild: `npm run build`

### Can't Connect to Backend
- Check `BACKEND_URL` in `.env`
- Verify backend is running
- Check firewall settings
- Test: `curl http://your-backend-url/health`

### Printer Not Working
1. Test printer connection: `npm run cli` → option 3
2. Verify printer IP: `ping PRINTER_IP`
3. Check printer port (usually 9100)
4. Ensure printer is on same network

### Background Process Issues
- Check PID file: `pc-agent.pid`
- Kill manually if stuck: `Stop-Process -Name node -Force`
- Remove stale PID: `del pc-agent.pid`

---

## File Structure

```
pc-agent/
├── dist/               # Compiled JavaScript (auto-generated)
├── logs/               # Log files
│   ├── pc-agent.log   # Main log
│   └── error.log      # Error log
├── src/               # TypeScript source code
├── .env               # Configuration (create from env.example)
├── env.example        # Example configuration
├── package.json       # Dependencies and scripts
├── start-background.ps1  # PowerShell: Start in background
├── stop-agent.ps1        # PowerShell: Stop agent
├── status-agent.ps1      # PowerShell: Check status
├── start-background.bat  # Batch: Start in background
├── stop-agent.bat        # Batch: Stop agent
└── status-agent.bat      # Batch: Check status
```

---

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run in foreground (press Ctrl+C to stop) |
| `npm run start:bg` | Run in background |
| `npm run stop` | Stop background process |
| `npm run status` | Check if running |
| `npm run cli` | Interactive management tool |
| `npm run dev` | Run in development mode (with ts-node) |
| `npm run diagnose` | Run diagnostics |
| `npm run install-service` | Install Windows service (admin required) |
| `npm run uninstall-service` | Remove Windows service (admin required) |

---

## Production Deployment Checklist

- [ ] Copy `env.example` to `.env`
- [ ] Set `BACKEND_URL` to production backend
- [ ] Set `TENANT_ID` from admin panel
- [ ] Set `PRINTER_IP` (or configure in admin panel)
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Test printer: `npm run cli` → option 3
- [ ] Choose running method:
  - [ ] Background process: `npm run start:bg`
  - [ ] OR Windows service: `npm run cli` → option 4
- [ ] Verify connection in admin panel
- [ ] Test a print job
- [ ] Check logs: `logs/pc-agent.log`

---

## Support

For more detailed documentation, see:
- `README.md` - Complete documentation
- `ARCHITECTURE.md` - Technical architecture
- `CONFIGURATION.md` - Configuration details
- `COMPATIBILITY.md` - Compatibility information
- `BACKEND_CONNECTION_GUIDE.md` - Connection troubleshooting

