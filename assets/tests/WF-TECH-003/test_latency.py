"""
WIRTHFORGE WebSocket Protocol Latency Test Suite
WF-TECH-003 Performance Validation

Tests the <5ms median latency requirement and 60Hz frame stability.
"""

import asyncio
import json
import time
import statistics
import logging
from typing import List, Dict, Tuple
from dataclasses import dataclass
import websockets
import pytest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LatencyMeasurement:
    """Single latency measurement record"""
    timestamp: float
    round_trip_ms: float
    message_type: str
    frame_number: int = None

@dataclass
class TestResults:
    """Test execution results"""
    total_messages: int
    median_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float
    frame_drops: int
    test_duration_s: float
    frames_per_second: float
    passed: bool

class WirthForgeLatencyTester:
    """WebSocket protocol latency and performance tester"""
    
    def __init__(self, server_url: str = "ws://127.0.0.1:8145/ws"):
        self.server_url = server_url
        self.measurements: List[LatencyMeasurement] = []
        self.frame_times: List[float] = []
        self.last_frame_number = 0
        self.frame_drops = 0
        self.test_start_time = 0
        self.connected = False
        
    async def connect(self) -> bool:
        """Connect to WebSocket server with timeout"""
        try:
            self.websocket = await asyncio.wait_for(
                websockets.connect(self.server_url),
                timeout=5.0
            )
            self.connected = True
            logger.info(f"Connected to {self.server_url}")
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Clean disconnect"""
        if hasattr(self, 'websocket') and self.websocket:
            await self.websocket.close()
            self.connected = False
    
    async def measure_round_trip_latency(self, duration_seconds: int = 10) -> TestResults:
        """Measure round-trip latency using heartbeat messages"""
        logger.info(f"Starting {duration_seconds}s latency test...")
        
        if not await self.connect():
            raise ConnectionError("Failed to connect to server")
        
        self.test_start_time = time.perf_counter()
        end_time = self.test_start_time + duration_seconds
        
        try:
            # Wait for startup_complete
            startup_msg = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            startup_data = json.loads(startup_msg)
            
            if startup_data.get('type') != 'startup_complete':
                raise ValueError("Expected startup_complete message")
            
            logger.info("Received startup handshake")
            
            # Collect messages and measure latency
            while time.perf_counter() < end_time:
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    receive_time = time.perf_counter()
                    
                    data = json.loads(message)
                    msg_type = data.get('type')
                    timestamp = data.get('timestamp', 0)
                    
                    # Calculate latency for timestamped messages
                    if timestamp > 0:
                        # Convert server timestamp to seconds
                        server_time_s = timestamp / 1000.0
                        current_time_s = time.time()
                        latency_ms = (current_time_s - server_time_s) * 1000
                        
                        # Only record reasonable latencies (filter clock skew)
                        if 0 <= latency_ms <= 1000:
                            measurement = LatencyMeasurement(
                                timestamp=receive_time,
                                round_trip_ms=latency_ms,
                                message_type=msg_type,
                                frame_number=data.get('frameNumber')
                            )
                            self.measurements.append(measurement)
                    
                    # Track frame drops for energy_update messages
                    if msg_type == 'energy_update':
                        frame_num = data.get('frameNumber', 0)
                        if self.last_frame_number > 0:
                            expected_frame = self.last_frame_number + 1
                            if frame_num > expected_frame:
                                drops = frame_num - expected_frame
                                self.frame_drops += drops
                                logger.warning(f"Frame drop detected: {drops} frames")
                        self.last_frame_number = frame_num
                        self.frame_times.append(receive_time)
                
                except asyncio.TimeoutError:
                    logger.warning("Message receive timeout")
                    continue
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {e}")
                    continue
        
        finally:
            await self.disconnect()
        
        return self._calculate_results()
    
    async def measure_frame_stability(self, duration_seconds: int = 60) -> TestResults:
        """Measure 60Hz frame stability over extended period"""
        logger.info(f"Starting {duration_seconds}s frame stability test...")
        
        if not await self.connect():
            raise ConnectionError("Failed to connect to server")
        
        self.test_start_time = time.perf_counter()
        end_time = self.test_start_time + duration_seconds
        energy_frames = []
        
        try:
            # Skip startup message
            await self.websocket.recv()
            
            while time.perf_counter() < end_time:
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=2.0)
                    data = json.loads(message)
                    
                    if data.get('type') == 'energy_update':
                        frame_time = time.perf_counter()
                        frame_num = data.get('frameNumber', 0)
                        
                        energy_frames.append({
                            'frame_number': frame_num,
                            'timestamp': frame_time,
                            'processing_time': data.get('payload', {}).get('processingTime', 0)
                        })
                        
                        # Check for frame drops
                        if len(energy_frames) > 1:
                            prev_frame = energy_frames[-2]['frame_number']
                            if frame_num != prev_frame + 1:
                                self.frame_drops += frame_num - prev_frame - 1
                
                except asyncio.TimeoutError:
                    logger.error("Frame timeout - server may have stopped")
                    break
        
        finally:
            await self.disconnect()
        
        # Calculate frame rate statistics
        if len(energy_frames) > 1:
            total_time = energy_frames[-1]['timestamp'] - energy_frames[0]['timestamp']
            actual_fps = (len(energy_frames) - 1) / total_time
        else:
            actual_fps = 0
        
        return TestResults(
            total_messages=len(energy_frames),
            median_latency_ms=0,  # Not measured in this test
            p99_latency_ms=0,
            max_latency_ms=0,
            frame_drops=self.frame_drops,
            test_duration_s=duration_seconds,
            frames_per_second=actual_fps,
            passed=abs(actual_fps - 60) < 5 and self.frame_drops < 10  # Allow 5Hz tolerance
        )
    
    def _calculate_results(self) -> TestResults:
        """Calculate test results from measurements"""
        if not self.measurements:
            return TestResults(0, 0, 0, 0, 0, 0, 0, False)
        
        latencies = [m.round_trip_ms for m in self.measurements]
        
        median_latency = statistics.median(latencies)
        p99_latency = statistics.quantiles(latencies, n=100)[98] if len(latencies) >= 100 else max(latencies)
        max_latency = max(latencies)
        
        test_duration = time.perf_counter() - self.test_start_time
        
        # Calculate frame rate from frame times
        if len(self.frame_times) > 1:
            frame_duration = self.frame_times[-1] - self.frame_times[0]
            fps = (len(self.frame_times) - 1) / frame_duration
        else:
            fps = 0
        
        # Test passes if median latency < 5ms and frame rate close to 60Hz
        passed = (median_latency < 5.0 and 
                 55 <= fps <= 65 and 
                 self.frame_drops < 10)
        
        return TestResults(
            total_messages=len(self.measurements),
            median_latency_ms=median_latency,
            p99_latency_ms=p99_latency,
            max_latency_ms=max_latency,
            frame_drops=self.frame_drops,
            test_duration_s=test_duration,
            frames_per_second=fps,
            passed=passed
        )

# Pytest test functions
@pytest.mark.asyncio
async def test_websocket_latency_requirement():
    """Test that median latency is under 5ms"""
    tester = WirthForgeLatencyTester()
    results = await tester.measure_round_trip_latency(duration_seconds=10)
    
    logger.info(f"Latency test results:")
    logger.info(f"  Messages: {results.total_messages}")
    logger.info(f"  Median latency: {results.median_latency_ms:.2f}ms")
    logger.info(f"  P99 latency: {results.p99_latency_ms:.2f}ms")
    logger.info(f"  Max latency: {results.max_latency_ms:.2f}ms")
    logger.info(f"  Frame drops: {results.frame_drops}")
    
    assert results.median_latency_ms < 5.0, f"Median latency {results.median_latency_ms:.2f}ms exceeds 5ms requirement"
    assert results.p99_latency_ms < 10.0, f"P99 latency {results.p99_latency_ms:.2f}ms too high"

@pytest.mark.asyncio
async def test_frame_rate_stability():
    """Test 60Hz frame rate stability"""
    tester = WirthForgeLatencyTester()
    results = await tester.measure_frame_stability(duration_seconds=30)
    
    logger.info(f"Frame stability test results:")
    logger.info(f"  Duration: {results.test_duration_s:.1f}s")
    logger.info(f"  Frame rate: {results.frames_per_second:.1f} Hz")
    logger.info(f"  Frame drops: {results.frame_drops}")
    
    assert 55 <= results.frames_per_second <= 65, f"Frame rate {results.frames_per_second:.1f}Hz not within 60Hz ±5Hz tolerance"
    assert results.frame_drops < 10, f"Too many frame drops: {results.frame_drops}"

@pytest.mark.asyncio
async def test_connection_recovery():
    """Test connection recovery after disconnect"""
    tester = WirthForgeLatencyTester()
    
    # Initial connection
    assert await tester.connect(), "Initial connection failed"
    await tester.disconnect()
    
    # Reconnection
    await asyncio.sleep(1)  # Brief delay
    assert await tester.connect(), "Reconnection failed"
    await tester.disconnect()

if __name__ == "__main__":
    async def run_manual_tests():
        """Run tests manually for development"""
        tester = WirthForgeLatencyTester()
        
        print("🧬 WIRTHFORGE WebSocket Latency Test Suite")
        print("=" * 50)
        
        try:
            # Latency test
            print("\n1. Testing latency requirements...")
            latency_results = await tester.measure_round_trip_latency(10)
            
            print(f"   ✓ Messages received: {latency_results.total_messages}")
            print(f"   ✓ Median latency: {latency_results.median_latency_ms:.2f}ms")
            print(f"   ✓ P99 latency: {latency_results.p99_latency_ms:.2f}ms")
            print(f"   ✓ Frame drops: {latency_results.frame_drops}")
            print(f"   {'✅ PASS' if latency_results.passed else '❌ FAIL'}")
            
            # Frame stability test
            print("\n2. Testing frame rate stability...")
            stability_results = await tester.measure_frame_stability(20)
            
            print(f"   ✓ Frame rate: {stability_results.frames_per_second:.1f} Hz")
            print(f"   ✓ Frame drops: {stability_results.frame_drops}")
            print(f"   {'✅ PASS' if stability_results.passed else '❌ FAIL'}")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
    
    # Run manual tests
    asyncio.run(run_manual_tests())
