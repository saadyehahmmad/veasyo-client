# Compatibility Guide

This document describes how the PC Agent, Backend, and Frontend work together to ensure compatibility.

## Architecture Overview

```
Frontend (Angular)
     ↓ HTTP API
Backend (Node.js/Express)
     ↓ HTTP POST /print
PC Agent (Node.js/Express)
     ↓ TCP Socket
LAN Printer (ESC/POS)
```

## API Contracts

### 1. Backend → PC Agent: Print Job Request

**Endpoint:** `POST http://<pcAgentIp>:<pcAgentPort>/print`

**Request Body:**
```json
{
  "text": "base64-encoded-escpos-commands",
  "format": "base64",
  "printerIp": "192.168.1.100",  // Optional
  "printerPort": 9100            // Optional
}
```

**Response (Success):**
```json
{
  "status": "DONE",
  "message": "Print job sent successfully",
  "printerIp": "192.168.1.100",
  "printerPort": 9100
}
```

**Response (Error):**
```json
{
  "status": "ERROR",
  "message": "Error description"
}
```

### 2. Backend → PC Agent: Health Check

**Endpoint:** `GET http://<pcAgentIp>:<pcAgentPort>/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "waiter-pc-agent",
  "version": "1.0.0"
}
```

### 3. Frontend → Backend: Test PC Agent Connection

**Endpoint:** `POST /api/integrations/printer/test-pc-agent`

**Request Body:**
```json
{
  "pcAgentIp": "192.168.1.100",
  "pcAgentPort": 3001
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "PC Agent is reachable and responding",
  "data": {
    "status": "ok",
    "service": "waiter-pc-agent",
    "version": "1.0.0",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "PC Agent unreachable",
  "message": "Detailed error message"
}
```

## Validation Rules

### IP Address Validation
- Format: `^(\d{1,3}\.){3}\d{1,3}$`
- Each octet must be 0-255
- Used in: Frontend, Backend, PC Agent

### Port Validation
- Range: 1-65535
- Must be a valid integer
- Used in: Frontend, Backend, PC Agent

### Print Format Validation
- Supported formats: `base64`, `text`
- `text` field must be a string
- Used in: Backend, PC Agent

## Error Handling

### Standard Error Response Format

All components use consistent error response formats:

**Backend API Errors:**
```json
{
  "error": "Error code",
  "message": "Human-readable error message"
}
```

**PC Agent Errors:**
```json
{
  "status": "ERROR",
  "message": "Error description"
}
```

### Error Codes

- `ECONNREFUSED`: Cannot connect to service
- `ETIMEDOUT`: Connection timeout
- `ENOTFOUND`: DNS resolution failed
- `INVALID_IP`: Invalid IP address format
- `INVALID_PORT`: Invalid port number
- `INVALID_DATA`: Invalid request data
- `MISSING_FIELD`: Required field missing

## Type Definitions

### Shared Types (PC Agent)

Located in `pc-agent/src/types/common.ts`:

- `PcAgentResponse`: Standard response format
- `PrintJobRequest`: Print job request format
- `HealthCheckResponse`: Health check response format
- `WebSocketPrintMessage`: WebSocket message format
- `WebSocketResponse`: WebSocket response format
- `ErrorResponse`: Error response format

### Backend Types

Located in `backend/src/services/integration.service.ts`:

- `PrinterIntegration`: Printer configuration interface
- Connection modes: `'direct' | 'pcAgent' | 'cloudService' | 'webhook'`

## Constants

### PC Agent Constants

Located in `pc-agent/src/constants.ts`:

- `DEFAULT_CONFIG`: Default configuration values
- `RESPONSE_STATUS`: Response status values
- `PRINT_FORMATS`: Supported print formats
- `ERROR_MESSAGES`: Standard error messages

## Configuration

### Environment Variables

**PC Agent:**
- `PORT`: HTTP server port (default: 3001)
- `PRINTER_IP`: Default printer IP (default: 192.168.1.100)
- `PRINTER_PORT`: Default printer port (default: 9100)
- `LOG_LEVEL`: Logging level (default: info)

**Backend:**
- Uses tenant-specific configuration stored in database
- PC Agent settings: `pcAgentIp`, `pcAgentPort`

### Default Values

All components use the same default values:
- PC Agent Port: `3001`
- Printer Port: `9100`
- Printer IP: `192.168.1.100`

## Testing Compatibility

### 1. Test PC Agent Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "waiter-pc-agent",
  "version": "1.0.0"
}
```

### 2. Test Print Job

```bash
curl -X POST http://localhost:3001/print \
  -H "Content-Type: application/json" \
  -d '{
    "text": "SGVsbG8gV29ybGQ=",
    "format": "base64"
  }'
```

Expected response:
```json
{
  "status": "DONE",
  "message": "Print job sent successfully"
}
```

### 3. Test from Frontend

1. Go to Admin Panel > Integrations > Printer
2. Select "PC Agent (Local Network Bridge)"
3. Enter PC Agent IP and Port
4. Click "Test PC Agent Connection"
5. Should show success message with service info

## Troubleshooting

### Connection Issues

1. **PC Agent unreachable:**
   - Check PC Agent is running: `npm start` in pc-agent directory
   - Check firewall allows port 3001
   - Verify IP address is correct

2. **Printer connection failed:**
   - Check printer is on same network as PC Agent
   - Verify printer IP and port (default: 9100)
   - Test printer connection: `telnet <printer-ip> 9100`

3. **Invalid response format:**
   - Ensure PC Agent version matches expected format
   - Check PC Agent logs for errors
   - Verify response status is "DONE" not "DONE" (case-sensitive)

### Validation Errors

1. **Invalid IP format:**
   - Use format: `192.168.1.100`
   - Each octet must be 0-255
   - No spaces or special characters

2. **Invalid port:**
   - Must be integer between 1-65535
   - Common ports: 3001 (PC Agent), 9100 (Printer)

3. **Missing fields:**
   - `text` field is required
   - `format` defaults to "text" if not provided

## Version Compatibility

- **PC Agent:** v1.0.0
- **Backend:** Compatible with PC Agent v1.0.0+
- **Frontend:** Compatible with Backend API v1.0+

## Future Enhancements

- Authentication/authorization for PC Agent
- WebSocket support in backend
- Connection pooling for printers
- Retry logic with exponential backoff
- Metrics and monitoring


