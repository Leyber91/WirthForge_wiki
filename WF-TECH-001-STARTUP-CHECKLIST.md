# WF-TECH-001-STARTUP-CHECKLIST: Boot Sequence Validation

## Startup Integrity Checklist

### Core System Initialization
- [ ] **Hardware Detection Complete**: CPU/GPU/RAM profiled, tier assigned
- [ ] **Model Availability**: Default model present or downloaded
- [ ] **Orchestrator Launch**: Main loop started, 60Hz timer active

### Service Startup
- [ ] **Model Engine Ready**: Ollama responding to health checks
- [ ] **API Server Listening**: FastAPI bound to 127.0.0.1:8145
- [ ] **WebSocket Active**: Real-time channel established
- [ ] **DECIPHER Online**: Token→energy mapping functional

### Integration Validation
- [ ] **UI Handshake**: startup_complete event sent/received
- [ ] **Energy Loop**: First frame update within 16.67ms
- [ ] **No External Traffic**: Network monitor confirms localhost-only

## Boot Sequence Steps

1. **Hardware Auto-Detection** (0-200ms)
   - Detect CPU cores, RAM, GPU capabilities
   - Assign hardware tier (Low/Mid/High)
   - Load appropriate configuration profile

2. **Model Initialization** (200ms-1.5s)
   - Check for local model availability
   - Download if missing (excluded from boot time)
   - Launch Ollama server process
   - Wait for model load confirmation

3. **Core Services** (1.5s-1.8s)
   - Start orchestrator main loop (60Hz)
   - Initialize energy state service
   - Launch DECIPHER runtime
   - Start FastAPI server

4. **UI Integration** (1.8s-2.0s)
   - Establish WebSocket connection
   - Send startup_complete handshake
   - Begin energy visualization loop
   - System ready for user input

## Failure Recovery Procedures

### Model Engine Failures
- Retry model load with smaller model
- Fall back to CPU-only inference
- Display clear error message to user

### Port Conflicts
- Auto-increment port numbers (8145→8146)
- Update configuration automatically
- Retry service binding

### Resource Constraints
- Reduce concurrent processes
- Lower frame rate target (60Hz→30Hz)
- Disable non-essential features
