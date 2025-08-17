# WF-TECH-002: Local AI Integration

## Overview

Local AI Integration provides web-engaged local-core API for model control, streaming, and energy visualization. It implements the WIRTHFORGE energy metaphor with real-time token-to-energy mapping and supports progressive hardware tiers.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start the API server
python fastapi_endpoints.py

# Run energy mapping tests
pytest test_integration.py -v
```

## Core Features

- **Ollama Integration**: Direct integration with local Ollama models
- **Energy Mapping**: Real-time E(t) computation from token streams
- **Tier-Based Scaling**: Progressive features based on hardware capabilities
- **Turbo Mode**: Multi-model ensemble processing for high-tier systems
- **60Hz Compliance**: Energy updates at 60Hz for smooth visualization

## API Endpoints

### Model Management
- `GET /models` - List available models and memory status
- `POST /models/load` - Load model into memory
- `POST /generate` - Start token generation session
- `GET /stream/{session_id}` - Stream generated tokens via SSE
- `POST /stop` - Stop active generation session

### Monitoring
- `GET /stats` - Real-time performance statistics
- `WebSocket /ws` - Real-time event streaming

## Energy Computation

The energy mapper computes E(t) ∈ [0,1] using:

```
E(t) = w_c * E_cadence + w_cert * E_certainty + w_stall * E_stall
```

Where:
- **E_cadence**: Energy from token generation speed (faster = higher)
- **E_certainty**: Energy from model confidence (logprobs)
- **E_stall**: Penalty for generation stalls (>200ms)

## Hardware Tiers

### Low-Tier (8GB RAM, Integrated GPU)
- Single model only
- Basic energy tracking
- Simple UI feedback

### Mid-Tier (16GB RAM, Dedicated GPU)
- 2-3 models concurrent
- Advanced energy metrics
- Turbo mode available

### High-Tier (32GB+ RAM, High-end GPU)
- 4-6 models concurrent
- Full council mode
- Complex interference patterns

## Performance Requirements

- **TTFT**: <2s for warm models, <5s for cold models
- **TPS**: 20+ tokens/second baseline
- **Latency**: <50ms API response time
- **Memory**: Efficient model swapping and caching

## Integration Points

- **WF-TECH-001**: Boot system integration via orchestrator
- **WF-TECH-003**: WebSocket protocol for real-time streaming
- **WF-FND-002**: Energy metaphor implementation
- **WF-FND-004**: DECIPHER integration for energy calculation

## Testing

```bash
# Run all tests
pytest test_integration.py -v

# Run performance benchmarks
pytest test_integration.py::TestBenchmarks -v

# Test energy computation
python energy_mapping.py
```

## Security

- **Localhost Only**: Server binds to 127.0.0.1 exclusively
- **No External Requests**: All processing happens locally
- **Privacy by Design**: No raw user data transmitted

## Development

Key modules:
- `energy_mapping.py`: Core energy computation logic
- `fastapi_endpoints.py`: Web API implementation
- `test_integration.py`: Comprehensive test suite
