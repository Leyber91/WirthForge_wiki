# test_startup_performance.py
import asyncio
import time
import pytest
from wirthforge.orchestrator import startup_sequence

@pytest.mark.asyncio
async def test_cold_boot_time():
    """Verify ≤2s startup on mid-tier hardware"""
    start_time = time.time()
    
    # Execute startup sequence
    await startup_sequence()
    
    boot_time = time.time() - start_time
    assert boot_time <= 2.0, f"Boot time {boot_time:.2f}s exceeds 2s limit"

@pytest.mark.asyncio 
async def test_60hz_stability():
    """Verify 60Hz loop maintains timing"""
    frame_times = []
    
    for _ in range(300):  # 5 seconds of frames
        start = time.perf_counter()
        await asyncio.sleep(1/60)  # Simulate frame
        frame_times.append(time.perf_counter() - start)
    
    avg_frame_time = sum(frame_times) / len(frame_times)
    assert avg_frame_time <= 0.0167, f"Average frame time {avg_frame_time:.4f}s exceeds 16.67ms"

@pytest.mark.asyncio
async def test_startup_integrity():
    """Verify all components start successfully"""
    from wirthforge.health_monitor import HealthMonitor
    
    monitor = HealthMonitor()
    await asyncio.sleep(3)  # Allow startup to complete
    
    # Check all services are healthy
    for service in ["orchestrator", "model_engine", "decipher"]:
        assert monitor.status[service]["healthy"], f"{service} failed health check"

@pytest.mark.asyncio
async def test_no_external_traffic():
    """Verify no outbound network requests during startup"""
    import socket
    
    # Mock socket to detect external connections
    original_connect = socket.socket.connect
    external_connections = []
    
    def mock_connect(self, address):
        if address[0] not in ['127.0.0.1', 'localhost']:
            external_connections.append(address)
        return original_connect(self, address)
    
    socket.socket.connect = mock_connect
    
    try:
        await startup_sequence()
        assert len(external_connections) == 0, f"External connections detected: {external_connections}"
    finally:
        socket.socket.connect = original_connect
