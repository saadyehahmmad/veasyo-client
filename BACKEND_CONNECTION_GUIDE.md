# PC Agent Backend Connection Guide

## The Problem You're Experiencing

You're seeing this error:
```
Error: websocket error
ECONNREFUSED ::1:3000 or 127.0.0.1:3000
```

This happens because the PC Agent is trying to connect to `http://localhost:3000` but can't find the backend server.

## Why This Happens

The PC Agent uses **WebSocket client** architecture (NEW design):
- PC Agent **connects TO** the backend server (outbound connection)
- No port forwarding needed on your router
- But you MUST configure where the backend is!

## Solution: Configure BACKEND_URL

### Step 1: Determine Where Your Backend Is

**Option A: Backend on Same Machine (Development)**
- Backend URL: `http://localhost:3000`

**Option B: Backend on Remote Server (Production)**
- Backend URL: `http://YOUR_SERVER_IP:3000` or `https://your-domain.com`
- Example: `http://194.195.87.213:3000`

### Step 2: Configure PC Agent

Run the interactive CLI:
```bash
cd C:\Users\Ahmad.Sadieh\Downloads\waiter\pc-agent
npm run cli
```

Select **Option 1: Setup Wizard** and provide:

1. **Backend URL**: 
   - Local: `http://localhost:3000`
   - Remote: `http://194.195.87.213:3000` (your actual server IP)

2. **Tenant ID**: Your UUID from admin panel
   - Example: `2114c597-563a-4f51-9e4b-945b5e65f9e5`

3. **Printer IP**: Your printer's local network IP
   - Example: `172.16.4.29`

4. **Printer Port**: Usually `9100`

### Step 3: Verify Configuration

The wizard will create a `.env` file with your settings:

```env
BACKEND_URL=http://your-server-ip:3000
TENANT_ID=2114c597-563a-4f51-9e4b-945b5e65f9e5
PRINTER_IP=172.16.4.29
PRINTER_PORT=9100
```

### Step 4: Test Connection

Run the diagnostic tool:
```bash
npm run diagnose
```

This will check:
- ✅ Backend server is reachable
- ✅ Configuration is correct
- ✅ Printer connection works

### Step 5: Start PC Agent

```bash
npm start
```

## Architecture Overview

```
┌─────────────────────────────────────┐
│  Backend Server                     │
│  Location: Cloud/Remote Server      │
│  URL: http://194.195.87.213:3000   │
│  (or https://your-domain.com)       │
└──────────────┬──────────────────────┘
               │
               │ WebSocket (Socket.IO)
               │ PC Agent connects TO backend
               │ No port forwarding needed!
               ↓
┌─────────────────────────────────────┐
│  PC Agent                           │
│  Location: Your Office/Local PC     │
│  Configure: BACKEND_URL in .env     │
└──────────────┬──────────────────────┘
               │
               │ TCP Socket (Port 9100)
               │ Direct connection (same LAN)
               ↓
┌─────────────────────────────────────┐
│  Thermal Printer                    │
│  Location: Same network as PC Agent │
│  IP: 172.16.4.29 (your actual IP)   │
└─────────────────────────────────────┘
```

## Key Points

### ✅ DO:
- Use the actual server IP/domain if backend is remote
- Ensure backend server is running before starting PC Agent
- Configure correct tenant ID from admin panel
- Keep PC Agent and printer on same local network

### ❌ DON'T:
- Use `localhost` when backend is on different server
- Try to access printer from outside local network
- Forget to start backend server first

## Troubleshooting

### Error: ECONNREFUSED
**Cause:** Backend server not running or wrong URL
**Fix:** 
1. Check backend is running: `curl http://your-backend:3000/health`
2. Update BACKEND_URL in `.env` to correct server address

### Error: TENANT_ID is required
**Cause:** Not configured in `.env`
**Fix:** Run `npm run cli` and complete setup

### Error: Printer connection failed
**Cause:** Wrong printer IP or network issue
**Fix:** 
1. Check printer IP from printer settings
2. Ensure PC and printer on same network
3. Run `npm run diagnose` to test

## Quick Start Commands

```bash
# 1. Navigate to PC Agent directory
cd C:\Users\Ahmad.Sadieh\Downloads\waiter\pc-agent

# 2. Install dependencies (if not done)
npm install

# 3. Run setup wizard
npm run cli
# Select option 1: Setup Wizard

# 4. Test configuration
npm run diagnose

# 5. Start PC Agent
npm start
```

## Need Help?

Run the diagnostic tool for detailed connection tests:
```bash
npm run diagnose
```

Or check the logs:
```
logs/pc-agent.log
logs/error.log
```

## Common Configurations

### Local Development
```env
BACKEND_URL=http://localhost:3000
TENANT_ID=2114c597-563a-4f51-9e4b-945b5e65f9e5
PRINTER_IP=172.16.4.29
PRINTER_PORT=9100
```

### Production (Remote Backend)
```env
BACKEND_URL=http://194.195.87.213:3000
TENANT_ID=2114c597-563a-4f51-9e4b-945b5e65f9e5
PRINTER_IP=172.16.4.29
PRINTER_PORT=9100
```

### Production (Domain-based)
```env
BACKEND_URL=https://api.your-domain.com
TENANT_ID=2114c597-563a-4f51-9e4b-945b5e65f9e5
PRINTER_IP=172.16.4.29
PRINTER_PORT=9100
```

