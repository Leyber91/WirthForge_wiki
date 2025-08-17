# WF-TECH-005 Decipher Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the WIRTHFORGE Decipher real-time AI token processing system into your application. Decipher converts AI token streams into structured energy events at 60Hz for real-time visualization and analysis.

## Quick Start

### Prerequisites

- Python 3.8+
- asyncio support
- WebSocket server capability
- JSON schema validation (optional)

### Installation

```bash
# Install required dependencies
pip install asyncio websockets jsonschema

# Copy Decipher modules to your project
cp WF-TECH-005-decipher-loop.py your_project/
cp WF-TECH-005-energy-mapper.py your_project/
cp WF-TECH-005-frame-composer.py your_project/
cp WF-TECH-005-websocket-integration.py your_project/
```

### Basic Integration

```python
import asyncio
from decipher_loop import DecipherLoop
from energy_mapper import EnergyMapper
from frame_composer import FrameComposer
from websocket_integration import DecipherWebSocketServer

async def main():
    # Initialize components
    energy_mapper = EnergyMapper()
    frame_composer = FrameComposer()
    decipher_loop = DecipherLoop(energy_mapper, frame_composer)
    
    # Setup WebSocket server
    ws_server = DecipherWebSocketServer()
    await ws_server.start()
    
    # Register event callbacks
    decipher_loop.register_callback('energy_update', ws_server.broadcast_event)
    
    # Start processing
    await decipher_loop.start()
    
    # Feed tokens from your AI model
    await decipher_loop.add_token({
        'content': 'Hello',
        'confidence': 0.9,
        'position': 1,
        'model_id': 'your_model'
    })

if __name__ == "__main__":
    asyncio.run(main())
```

## Architecture Integration

### Component Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Model      │───▶│  Decipher Loop  │───▶│  WebSocket      │
│   (Your Code)   │    │  (60Hz Engine)  │    │  (Client UI)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Energy Mapper  │
                       │  (WF-FND-002)   │
                       └─────────────────┘
```

### Integration Points

1. **Token Input**: Feed AI tokens to Decipher Loop
2. **Event Output**: Subscribe to energy events via WebSocket
3. **Configuration**: Customize energy calculations and performance
4. **Monitoring**: Track performance metrics and health

## Detailed Integration Steps

### 1. Initialize Decipher Components

```python
from decipher_loop import DecipherLoop, DecipherConfig
from energy_mapper import EnergyMapper, EnergyConfig
from frame_composer import FrameComposer, ComposerConfig

# Configure energy mapping
energy_config = EnergyConfig(
    base_energy_per_token=1.0,
    velocity_weight=0.3,
    certainty_weight=0.4,
    friction_weight=0.3,
    enable_caching=True,
    cache_size=1000
)

# Configure frame composition
composer_config = ComposerConfig(
    enable_schema_validation=True,
    enable_object_pooling=True,
    max_particles_per_frame=50,
    enable_compression=False
)

# Configure decipher loop
decipher_config = DecipherConfig(
    target_fps=60,
    frame_budget_ms=16.0,
    max_queue_size=1000,
    enable_degraded_mode=True,
    degraded_threshold_ms=20.0,
    enable_pattern_detection=True
)

# Initialize components
energy_mapper = EnergyMapper(energy_config)
frame_composer = FrameComposer(composer_config)
decipher_loop = DecipherLoop(energy_mapper, frame_composer, decipher_config)
```

### 2. Setup Event Handling

```python
# Define event handlers
async def on_energy_update(event_data):
    """Handle energy update events"""
    print(f"Energy: {event_data['payload']['total_energy']:.2f} EU")
    
async def on_pattern_detected(event_data):
    """Handle interference/resonance patterns"""
    pattern_type = event_data['payload']['type']
    print(f"Pattern detected: {pattern_type}")
    
async def on_error(event_data):
    """Handle system errors"""
    print(f"Error: {event_data['payload']['message']}")

# Register callbacks
decipher_loop.register_callback('energy.update', on_energy_update)
decipher_loop.register_callback('council.interference', on_pattern_detected)
decipher_loop.register_callback('council.resonance', on_pattern_detected)
decipher_loop.register_callback('system.error', on_error)
```

### 3. Integrate with AI Model

```python
class AIModelIntegration:
    def __init__(self, decipher_loop):
        self.decipher_loop = decipher_loop
        self.session_id = None
        
    async def start_session(self, user_prompt):
        """Start new AI session"""
        self.session_id = f"session_{int(time.time())}"
        
        # Emit session start event
        await self.decipher_loop.emit_session_start(
            session_id=self.session_id,
            user_id="user_123",
            prompt=user_prompt
        )
        
    async def process_token_stream(self, model_response_stream):
        """Process streaming tokens from AI model"""
        position = 0
        
        async for token_data in model_response_stream:
            # Convert model token to Decipher format
            decipher_token = {
                'content': token_data.get('text', ''),
                'confidence': token_data.get('logprobs', 0.8),
                'position': position,
                'model_id': token_data.get('model', 'default'),
                'is_final': token_data.get('finish_reason') is not None,
                'timestamp': time.time(),
                'metadata': {
                    'generation_time_ms': token_data.get('generation_time', 100),
                    'context_length': token_data.get('context_length', 0)
                }
            }
            
            # Feed to Decipher
            await self.decipher_loop.add_token(decipher_token)
            position += 1
            
    async def end_session(self):
        """End AI session"""
        if self.session_id:
            await self.decipher_loop.emit_session_end(self.session_id)
            self.session_id = None
```

### 4. Setup WebSocket Server

```python
from websocket_integration import DecipherWebSocketServer, WebSocketConfig

# Configure WebSocket server
ws_config = WebSocketConfig(
    host="localhost",
    port=8765,
    max_connections=100,
    enable_heartbeat=True,
    heartbeat_interval=5.0
)

# Create and start server
ws_server = DecipherWebSocketServer(ws_config)
await ws_server.start()

# Create integration bridge
from websocket_integration import DecipherWebSocketIntegration
ws_integration = DecipherWebSocketIntegration(ws_server)

# Connect Decipher events to WebSocket
decipher_loop.register_callback('energy.update', ws_integration.on_energy_update)
decipher_loop.register_callback('experience.token', ws_integration.on_token_event)
decipher_loop.register_callback('council.interference', ws_integration.on_pattern_event)
decipher_loop.register_callback('council.resonance', ws_integration.on_pattern_event)
decipher_loop.register_callback('session.start', ws_integration.on_session_event)
decipher_loop.register_callback('session.end', ws_integration.on_session_event)
decipher_loop.register_callback('system.error', ws_integration.on_error_event)
```

## Frontend Integration

### JavaScript Client

```javascript
class DecipherClient {
    constructor(wsUrl = 'ws://localhost:8765') {
        this.wsUrl = wsUrl;
        this.socket = null;
        this.eventHandlers = {};
        this.connected = false;
    }
    
    async connect() {
        this.socket = new WebSocket(this.wsUrl);
        
        this.socket.onopen = () => {
            this.connected = true;
            console.log('Connected to Decipher');
            
            // Subscribe to energy events
            this.subscribe(['energy.update', 'council.interference', 'council.resonance']);
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleEvent(data);
        };
        
        this.socket.onclose = () => {
            this.connected = false;
            console.log('Disconnected from Decipher');
        };
    }
    
    subscribe(eventTypes) {
        if (this.connected) {
            this.socket.send(JSON.stringify({
                type: 'subscribe',
                event_types: eventTypes
            }));
        }
    }
    
    on(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }
    
    handleEvent(eventData) {
        const handlers = this.eventHandlers[eventData.type] || [];
        handlers.forEach(handler => handler(eventData));
    }
}

// Usage
const decipher = new DecipherClient();
await decipher.connect();

// Handle energy updates
decipher.on('energy.update', (event) => {
    const energy = event.payload.total_energy;
    const rate = event.payload.energy_rate;
    
    // Update visualization
    updateEnergyVisualization(energy, rate);
});

// Handle interference patterns
decipher.on('council.interference', (event) => {
    const pattern = event.payload;
    showInterferenceEffect(pattern.type, pattern.strength);
});
```

### React Integration

```jsx
import React, { useState, useEffect } from 'react';

const DecipherVisualization = () => {
    const [energy, setEnergy] = useState(0);
    const [energyRate, setEnergyRate] = useState(0);
    const [state, setState] = useState('IDLE');
    const [patterns, setPatterns] = useState([]);
    
    useEffect(() => {
        const decipher = new DecipherClient();
        
        decipher.on('energy.update', (event) => {
            setEnergy(event.payload.total_energy);
            setEnergyRate(event.payload.energy_rate);
            setState(event.payload.state);
        });
        
        decipher.on('council.interference', (event) => {
            setPatterns(prev => [...prev, {
                id: event.id,
                type: 'interference',
                data: event.payload
            }]);
        });
        
        decipher.connect();
        
        return () => decipher.disconnect();
    }, []);
    
    return (
        <div className="decipher-visualization">
            <div className="energy-display">
                <h3>Energy: {energy.toFixed(2)} EU</h3>
                <p>Rate: {energyRate.toFixed(1)} EU/s</p>
                <p>State: {state}</p>
            </div>
            
            <div className="patterns">
                {patterns.map(pattern => (
                    <PatternEffect key={pattern.id} pattern={pattern} />
                ))}
            </div>
        </div>
    );
};
```

## Configuration Options

### Performance Tuning

```python
# High-performance configuration
high_perf_config = DecipherConfig(
    target_fps=60,
    frame_budget_ms=14.0,  # Tighter budget
    max_queue_size=500,    # Smaller queue
    enable_degraded_mode=True,
    degraded_threshold_ms=16.0,
    enable_pattern_detection=False,  # Disable for performance
    enable_particles=False           # Disable for performance
)

# Quality-focused configuration
quality_config = DecipherConfig(
    target_fps=60,
    frame_budget_ms=16.0,
    max_queue_size=2000,   # Larger queue
    enable_degraded_mode=True,
    degraded_threshold_ms=25.0,
    enable_pattern_detection=True,
    enable_particles=True,
    max_particles_per_frame=100
)

# Low-resource configuration
low_resource_config = DecipherConfig(
    target_fps=30,         # Lower FPS
    frame_budget_ms=30.0,  # Relaxed budget
    max_queue_size=200,    # Small queue
    enable_degraded_mode=True,
    degraded_threshold_ms=40.0,
    enable_pattern_detection=False,
    enable_particles=False
)
```

### Energy Calculation Tuning

```python
# Responsive energy mapping
responsive_config = EnergyConfig(
    base_energy_per_token=1.2,
    velocity_weight=0.5,    # Emphasize speed
    certainty_weight=0.3,
    friction_weight=0.2,
    burst_multiplier=2.0,
    stall_decay_rate=0.95
)

# Smooth energy mapping
smooth_config = EnergyConfig(
    base_energy_per_token=1.0,
    velocity_weight=0.2,
    certainty_weight=0.5,   # Emphasize quality
    friction_weight=0.3,
    burst_multiplier=1.5,
    stall_decay_rate=0.98
)
```

## Error Handling

### Common Issues and Solutions

```python
class DecipherErrorHandler:
    def __init__(self, decipher_loop):
        self.decipher_loop = decipher_loop
        self.error_counts = {}
        
    async def handle_frame_overrun(self, frame_data):
        """Handle frame timing overruns"""
        if frame_data['processing_time_ms'] > 20.0:
            # Enter degraded mode
            await self.decipher_loop.set_degraded_mode(True)
            
    async def handle_queue_overflow(self, queue_size):
        """Handle token queue overflow"""
        if queue_size > 1500:
            # Drop oldest tokens
            await self.decipher_loop.clear_old_tokens(0.5)
            
    async def handle_websocket_disconnect(self, connection_id):
        """Handle WebSocket client disconnection"""
        # Clean up client-specific state
        await self.decipher_loop.cleanup_client_state(connection_id)
        
    async def handle_energy_calculation_error(self, token, error):
        """Handle energy calculation failures"""
        # Use fallback energy value
        fallback_energy = 1.0
        await self.decipher_loop.set_token_energy(token['id'], fallback_energy)
```

## Monitoring and Debugging

### Performance Monitoring

```python
class DecipherMonitor:
    def __init__(self, decipher_loop):
        self.decipher_loop = decipher_loop
        self.metrics = {}
        
    async def start_monitoring(self):
        """Start performance monitoring"""
        while True:
            stats = await self.decipher_loop.get_performance_stats()
            
            # Log performance metrics
            if stats['avg_frame_time_ms'] > 16.0:
                logger.warning(f"Frame overrun: {stats['avg_frame_time_ms']:.2f}ms")
                
            if stats['queue_depth'] > 500:
                logger.warning(f"High queue depth: {stats['queue_depth']}")
                
            # Update metrics dashboard
            await self.update_dashboard(stats)
            
            await asyncio.sleep(5.0)  # Monitor every 5 seconds
            
    async def update_dashboard(self, stats):
        """Update monitoring dashboard"""
        dashboard_data = {
            'fps': stats['current_fps'],
            'frame_time': stats['avg_frame_time_ms'],
            'queue_depth': stats['queue_depth'],
            'energy_rate': stats['avg_energy_rate'],
            'overruns': stats['frame_overruns'],
            'degraded_mode': stats['degraded_mode_active']
        }
        
        # Send to monitoring system
        await self.send_to_monitoring(dashboard_data)
```

### Debug Logging

```python
import logging

# Configure debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('decipher_debug.log'),
        logging.StreamHandler()
    ]
)

# Enable component-specific logging
logging.getLogger('decipher_loop').setLevel(logging.DEBUG)
logging.getLogger('energy_mapper').setLevel(logging.INFO)
logging.getLogger('frame_composer').setLevel(logging.INFO)
logging.getLogger('websocket_integration').setLevel(logging.DEBUG)
```

## Testing Integration

### Unit Testing

```python
import unittest
from unittest.mock import AsyncMock, MagicMock

class TestDecipherIntegration(unittest.TestCase):
    def setUp(self):
        self.energy_mapper = EnergyMapper()
        self.frame_composer = FrameComposer()
        self.decipher_loop = DecipherLoop(self.energy_mapper, self.frame_composer)
        
    async def test_token_processing(self):
        """Test basic token processing"""
        token = {
            'content': 'test',
            'confidence': 0.9,
            'position': 1,
            'model_id': 'test_model'
        }
        
        # Mock event callback
        callback = AsyncMock()
        self.decipher_loop.register_callback('energy.update', callback)
        
        # Process token
        await self.decipher_loop.add_token(token)
        
        # Verify callback was called
        callback.assert_called_once()
        
    async def test_performance_under_load(self):
        """Test performance under high load"""
        # Generate 1000 tokens
        tokens = [
            {
                'content': f'token_{i}',
                'confidence': 0.8,
                'position': i,
                'model_id': 'test_model'
            }
            for i in range(1000)
        ]
        
        start_time = time.time()
        
        # Process all tokens
        for token in tokens:
            await self.decipher_loop.add_token(token)
            
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Verify performance
        self.assertLess(processing_time, 1.0)  # Should process in under 1 second
```

### Integration Testing

```python
async def test_full_integration():
    """Test complete integration flow"""
    
    # Setup components
    energy_mapper = EnergyMapper()
    frame_composer = FrameComposer()
    decipher_loop = DecipherLoop(energy_mapper, frame_composer)
    
    # Setup WebSocket server
    ws_server = DecipherWebSocketServer()
    await ws_server.start()
    
    # Setup integration
    ws_integration = DecipherWebSocketIntegration(ws_server)
    decipher_loop.register_callback('energy.update', ws_integration.on_energy_update)
    
    # Start processing
    await decipher_loop.start()
    
    # Simulate AI model interaction
    ai_integration = AIModelIntegration(decipher_loop)
    await ai_integration.start_session("Test prompt")
    
    # Simulate token stream
    for i in range(10):
        token = {
            'content': f'word_{i}',
            'confidence': 0.9,
            'position': i,
            'model_id': 'test_model'
        }
        await ai_integration.process_token_stream([token])
        await asyncio.sleep(0.1)  # 100ms between tokens
        
    await ai_integration.end_session()
    
    # Cleanup
    await decipher_loop.stop()
    await ws_server.stop()
    
    print("✅ Full integration test completed successfully")
```

## Migration Guide

### From Previous Versions

If migrating from a previous implementation:

1. **Update Token Format**: Ensure tokens include required fields
2. **Update Event Handlers**: Use new event schema format
3. **Update Configuration**: Use new configuration classes
4. **Update WebSocket Protocol**: Use new event types and payloads

### Breaking Changes

- Event schema format changed to include `id`, `type`, `timestamp`
- WebSocket protocol now requires subscription to event types
- Energy calculation formula updated per WF-FND-002
- Frame timing budget reduced to 16ms for 60Hz compliance

## Support and Troubleshooting

### Common Issues

1. **Frame Overruns**: Reduce quality settings or enable degraded mode
2. **High Memory Usage**: Enable object pooling and reduce cache sizes
3. **WebSocket Disconnections**: Implement reconnection logic with exponential backoff
4. **Energy Calculation Errors**: Validate token format and enable fallback values

### Performance Optimization

1. **Enable Caching**: Use energy calculation caching for repeated patterns
2. **Tune Frame Budget**: Adjust frame budget based on hardware capabilities
3. **Optimize Token Processing**: Batch process tokens when possible
4. **Use Degraded Mode**: Allow graceful degradation under high load

### Getting Help

- Check debug logs for detailed error information
- Use performance monitoring to identify bottlenecks
- Review test suite for integration examples
- Consult WF-TECH-005 specification for detailed requirements

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Compatibility**: WF-TECH-005 v1.0, WIRTHFORGE Framework v1.0
