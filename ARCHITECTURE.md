# PC Agent Architecture

## Overview

The PC Agent is a standalone Node.js bridge service that enables SaaS-compatible printer integration for the Waiter system. It solves the network isolation problem where the cloud server cannot directly access customer printers on their local network.

## Architecture Diagram

```
┌─────────────────────────────────┐
│   Cloud/Web App (Backend)       │
│   - Waiter Backend Server        │
│   - Different Network            │
└──────────────┬──────────────────┘
               │
               │ HTTP POST /print
               │ or WebSocket
               │
               ▼
┌─────────────────────────────────┐
│   PC Agent (This Service)       │
│   - Runs on Customer PC         │
│   - Same Network as Printer     │
│   - Port: 3001 (configurable)    │
└──────────────┬──────────────────┘
               │
               │ TCP Socket
               │ ESC/POS Commands
               │
               ▼
┌─────────────────────────────────┐
│   LAN Printer (ESC/POS)          │
│   - IP: 192.168.1.100            │
│   - Port: 9100                   │
└─────────────────────────────────┘
```

## Components

### 1. HTTP Server
- Express.js server listening on configurable port (default: 3001)
- Receives print jobs from cloud backend via HTTP POST
- Endpoint: `POST /print`
- Returns JSON response with status

### 2. WebSocket Server
- Native WebSocket server (ws library)
- Real-time communication option
- Same endpoint as HTTP server
- Supports persistent connections

### 3. Printer Connection Manager
- TCP socket connections to ESC/POS printers
- Handles connection lifecycle (connect, send, close)
- Error handling and retry logic
- Supports per-request printer configuration

### 4. Windows Service Integration
- Installable as Windows service
- Auto-start on system boot
- Service management scripts included

## Data Flow

### HTTP Flow
1. Cloud backend generates ESC/POS commands
2. Commands encoded as base64
3. HTTP POST to `http://<pc-agent-ip>:3001/print`
4. PC Agent decodes base64
5. PC Agent opens TCP connection to printer
6. Commands sent via TCP socket
7. Connection closed
8. Response sent back to backend

### WebSocket Flow
1. Cloud backend connects to PC Agent WebSocket
2. Sends JSON message with print job
3. PC Agent processes and prints
4. Response sent via WebSocket
5. Connection remains open for future jobs

## Configuration

### Environment Variables

- `PORT`: HTTP/WebSocket server port (default: 3001)
- `PRINTER_IP`: Default printer IP address
- `PRINTER_PORT`: Default printer port (default: 9100)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `LOG_FILE`: Log file path

### Per-Request Override

Each print request can override the default printer settings:
- `printerIp`: Override default printer IP
- `printerPort`: Override default printer port

## API Reference

### POST /print

Print a job to the configured printer.

**Request:**
```json
{
  "text": "base64-encoded-escpos-commands",
  "format": "base64",
  "printerIp": "192.168.1.100",  // Optional
  "printerPort": 9100            // Optional
}
```

**Response:**
```json
{
  "status": "DONE",
  "message": "Print job sent successfully",
  "printerIp": "192.168.1.100",
  "printerPort": 9100
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "waiter-pc-agent",
  "version": "1.0.0"
}
```

### WebSocket

Connect to `ws://<pc-agent-ip>:3001`

**Message Format:**
```json
{
  "type": "print",
  "data": {
    "text": "base64-encoded-escpos-commands",
    "format": "base64",
    "printerIp": "192.168.1.100",
    "printerPort": 9100
  }
}
```

**Response:**
```json
{
  "type": "success",
  "message": "Print job sent successfully"
}
```

## Security Considerations

1. **Network Isolation**: PC Agent runs on customer network, isolated from cloud
2. **CORS**: Configurable CORS origins for HTTP requests
3. **No Authentication**: PC Agent assumes it's on trusted local network
4. **Firewall**: Customer must allow incoming connections on configured port

## Deployment

### Development
```bash
npm install
npm run build
npm start
```

### Production (Windows Service)
```bash
npm install
npm run build
npm run install-service
```

## Troubleshooting

### Connection Issues
- Verify printer IP and port are correct
- Check printer is on same network as PC Agent
- Test TCP connection: `telnet <printer-ip> 9100`
- Check Windows Firewall settings

### Service Issues
- Check Windows Event Viewer for errors
- Review logs in `logs/pc-agent.log`
- Verify Node.js is in system PATH
- Ensure port is not in use by another application

## Future Enhancements

- Authentication/authorization for PC Agent
- Multiple printer support
- Print queue management
- Connection pooling for printers
- Health monitoring and auto-recovery


