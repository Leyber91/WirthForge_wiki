# WF-TECH-003 WebSocket Protocol Implementation

## Overview

This directory contains the reference implementation and supporting assets for WF-TECH-003 Real-Time Protocol (WebSockets), providing 60Hz real-time communication between WIRTHFORGE's local backend and browser UI.

## Files Structure

```
WF-TECH-003/
├── ws_server.py              # FastAPI WebSocket server implementation
├── client-example.html       # Browser client with auto-reconnect
├── test_latency.py          # Latency and performance tests
├── test_schema_compliance.py # Schema validation tests
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start WebSocket Server

```bash
python ws_server.py
```

The server will start on `ws://127.0.0.1:8145/ws`

### 3. Open Client Interface

Open `client-example.html` in a web browser and click "Connect" to establish WebSocket connection.

### 4. Run Tests

```bash
# Latency tests
python test_latency.py

# Schema compliance tests  
python test_schema_compliance.py

# Or use pytest
pytest test_latency.py test_schema_compliance.py -v
```

## Protocol Features

- **60Hz Frame Rate**: Real-time energy updates at 60 FPS
- **<5ms Latency**: Sub-5ms median message latency on localhost
- **Auto-Reconnect**: Client automatically reconnects on connection loss
- **Schema Validation**: All messages validated against JSON schemas
- **Multiple Channels**: Organized by purpose (energy, experience, council, reward, system)
- **Heartbeat Monitoring**: Connection liveness and latency measurement

## Message Types

| Type | Channel | Description |
|------|---------|-------------|
| `startup_complete` | system | Initial handshake after connection |
| `energy_update` | energy | 60Hz energy metrics for visualization |
| `token_stream` | experience | AI-generated token output |
| `heartbeat` | system | Connection liveness ping |
| `error_event` | system | Error notifications |
| `interference_event` | council | Multi-model interference patterns |
| `resonance_event` | council | Multi-model resonance events |
| `reward_event` | reward | User achievements and feedback |

## Performance Requirements

- **Frame Rate**: 60 Hz ±5 Hz tolerance
- **Latency**: <5ms median, <10ms P99
- **Frame Budget**: 16.67ms processing time per frame
- **Connection Recovery**: <2s reconnect time
- **Message Validation**: 100% schema compliance

## Configuration

Server configuration can be modified in `ws_server.py`:

```python
self.frame_rate = 60          # Target frame rate
self.heartbeat_interval = 1.0 # Heartbeat frequency (seconds)
self.frame_budget_ms = 16.67  # Frame processing budget
```

## Integration

This WebSocket server integrates with:

- **WF-TECH-001**: System Runtime & Services (orchestrator hooks)
- **WF-FND-004**: DECIPHER (energy event schemas)
- **WF-TECH-004**: State & Storage (event persistence)
- **WF-UX-006**: Energy Visualization (real-time UI updates)

## Troubleshooting

### Connection Issues
- Ensure server is running on port 8145
- Check firewall settings for localhost connections
- Verify no other services are using port 8145

### Performance Issues
- Monitor frame rate in client interface
- Check server logs for frame overruns
- Run latency tests to measure performance

### Schema Validation Errors
- Run schema compliance tests
- Check message format against JSON schemas
- Verify all required fields are present

## Development

### Adding New Message Types

1. Define schema in `../../assets/schemas/WF-TECH-003-event-schemas.json`
2. Add handler in `ws_server.py`
3. Update client in `client-example.html`
4. Add test cases in `test_schema_compliance.py`

### Performance Optimization

- Use `asyncio.gather()` for concurrent operations
- Implement backpressure for high-frequency messages
- Monitor memory usage and connection pooling
- Profile with `cProfile` for bottlenecks

## License

Part of the WIRTHFORGE project. See main project LICENSE file.
