# PC Agent Configuration

## Is `.env` File Required?

**Short answer: No, but highly recommended.**

The PC Agent can start without a `.env` file using default values, but you **must configure your printer IP** for printing to work.

## Default Configuration

If no `.env` file exists, the agent uses these defaults:

```env
PORT=3001
PRINTER_IP=192.168.1.100  # ⚠️ This is likely NOT your printer!
PRINTER_PORT=9100
MAX_PRINTER_CONNECTIONS=5
LOG_LEVEL=info
```

**Important:** The default `PRINTER_IP=192.168.1.100` is a placeholder and will likely not match your printer. You must configure the correct printer IP.

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

Create a `.env` file in the PC Agent folder:

```env
PORT=3001
PRINTER_IP=192.168.1.100    # Your printer's IP address
PRINTER_PORT=9100
MAX_PRINTER_CONNECTIONS=5
LOG_LEVEL=info
```

### Method 3: Environment Variables

You can also set environment variables directly (useful for Docker/containers):

```bash
export PRINTER_IP=192.168.1.100
export PRINTER_PORT=9100
npm start
```

## Configuration Priority

The agent uses configuration in this order (highest to lowest priority):

1. **Per-request overrides** (in print job request)
2. **Environment variables** (from `.env` file or system)
3. **Default values** (from `DEFAULT_CONFIG`)

## When `.env` is Required

While `.env` is optional for starting the agent, it's **required for**:

- ✅ Proper printer configuration (PRINTER_IP must be set)
- ✅ Custom port configuration
- ✅ Advanced settings (connection pool, timeouts)
- ✅ Service installation (validates .env exists)

## Quick Start Without `.env`

You can start the agent without `.env`:

```bash
npm install
npm run build
npm start
```

But you'll see a warning:
```
⚠️  Using default printer IP. This is likely incorrect!
   Please configure PRINTER_IP in .env file or use the CLI: npm run cli
```

**Solution:** Run `npm run cli` and configure your printer IP.

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

