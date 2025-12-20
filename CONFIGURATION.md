# PC Agent Configuration

## Is `.env` File Required?

**Yes, the `.env` file is REQUIRED** for the PC Agent to function properly.

The PC Agent needs several critical configuration values that must be set in the `.env` file:

1. **BACKEND_URL** - Where your Waiter backend server is running (REQUIRED)
2. **TENANT_ID** - Your restaurant's unique identifier (REQUIRED)
3. **PRINTER_IP** - Your thermal printer's IP address (REQUIRED)
4. **PRINTER_PORT** - Printer port, usually 9100 (REQUIRED)

## Required Configuration

The agent requires these settings to be configured in `.env`:

```env
# Backend Connection (REQUIRED)
BACKEND_URL=http://localhost:3000        # Change to your backend server URL
TENANT_ID=your-tenant-id-uuid-here       # Get from Admin Panel

# Printer Settings (REQUIRED)
PRINTER_IP=192.168.1.100                 # Your printer's actual IP address
PRINTER_PORT=9100                        # Usually 9100 for network printers

# Optional Settings
MAX_PRINTER_CONNECTIONS=5
LOG_LEVEL=info
```

**Critical:** All REQUIRED settings must be configured correctly:
- `BACKEND_URL`: If your backend is on a different server, use the server's IP or domain (e.g., `http://194.195.87.213:3000` or `https://your-domain.com`)
- `TENANT_ID`: Get this UUID from the Waiter Admin Panel > Tenants section
- `PRINTER_IP`: Find your printer's IP from its network settings or router admin panel

## Configuration Methods

### Method 1: Interactive CLI (Recommended)

```bash
npm run cli
# Select option 1: Complete Setup
```

The CLI will:
- Guide you through configuration
- Create `.env` file automatically
- Test printer connection
- Install as service (optional)

### Method 2: Manual `.env` File

Create a `.env` file in the PC Agent folder (see `env.example` for reference):

```env
# Backend Connection (REQUIRED)
BACKEND_URL=http://localhost:3000        # For local dev
# BACKEND_URL=http://194.195.87.213:3000  # For production server
# BACKEND_URL=https://your-domain.com     # For domain-based setup

# Tenant Configuration (REQUIRED)
TENANT_ID=2114c597-563a-4f51-9e4b-945b5e65f9e5  # Your actual tenant UUID

# Printer Configuration (REQUIRED)
PRINTER_IP=192.168.1.100    # Your printer's actual IP address
PRINTER_PORT=9100           # Usually 9100 for network printers

# Optional Settings
MAX_PRINTER_CONNECTIONS=5
LOG_LEVEL=info
```

### Method 3: Environment Variables

You can also set environment variables directly (useful for Docker/containers):

```bash
export BACKEND_URL=http://your-backend-server:3000
export TENANT_ID=your-tenant-uuid
export PRINTER_IP=192.168.1.100
export PRINTER_PORT=9100
npm start
```

## Configuration Priority

The agent uses configuration in this order (highest to lowest priority):

1. **Per-request overrides** (in print job request)
2. **Environment variables** (from `.env` file or system)
3. **Default values** (from `DEFAULT_CONFIG`)

## Important: Backend URL Configuration

### For Local Development
If your backend is running on the same machine:
```env
BACKEND_URL=http://localhost:3000
```

### For Production (Backend on Remote Server)
If your backend is on a different server, you MUST use the server's IP or domain:

```env
# Using server IP address
BACKEND_URL=http://194.195.87.213:3000

# OR using domain name
BACKEND_URL=https://your-backend-domain.com
```

**Common Mistake:** Using `http://localhost:3000` when the backend is on a different server will cause "ECONNREFUSED" errors!

## PC Agent Connection Architecture

```
┌─────────────────────────────────────────┐
│  Backend Server (Cloud/Remote)          │
│  - IP: 194.195.87.213 (or domain)      │
│  - Port: 3000                           │
│  - Socket.IO namespace: /pc-agent       │
└────────────────┬────────────────────────┘
                 │
                 │ WebSocket Connection
                 │ (Initiated by PC Agent)
                 ↓
┌─────────────────────────────────────────┐
│  PC Agent (Local/On-Premises)           │
│  - Connects TO backend (outbound)       │
│  - No port forwarding needed            │
│  - Configure BACKEND_URL in .env        │
└────────────────┬────────────────────────┘
                 │
                 │ TCP Socket (Port 9100)
                 ↓
┌─────────────────────────────────────────┐
│  Thermal Printer (Same Local Network)   │
│  - IP: 192.168.x.x                      │
│  - Port: 9100 (usually)                 │
└─────────────────────────────────────────┘
```

## Why `.env` is REQUIRED

The `.env` file is **mandatory** because:

- ✅ **BACKEND_URL** - PC Agent must know where to connect
- ✅ **TENANT_ID** - Identifies which restaurant this agent serves
- ✅ **PRINTER_IP** - Where to send print jobs on local network
- ✅ **Security** - Credentials and config should not be in code

## Best Practice

**Always use the CLI to configure:**
```bash
npm run cli
```

This ensures:
- ✅ Correct configuration
- ✅ Printer connection tested
- ✅ `.env` file created properly
- ✅ All settings validated

