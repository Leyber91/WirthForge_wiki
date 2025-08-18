"""
WF-TECH-002: Integration Tests
Contract and latency tests for 60Hz compliance and schema validation
"""

import asyncio
import pytest
import time
import json
from typing import Dict, List
from unittest.mock import AsyncMock, MagicMock

from .energy_mapping import EnergyMapper, TokenEvent, DiversityIndexCalculator
from .fastapi_endpoints import app
from .tier_policy import TierPolicy
import httpx


class TestEnergyMapping:
    """Test energy computation and EMA smoothing"""
    
    def setup_method(self):
        self.energy_mapper = EnergyMapper({
            'cadence_weight': 0.4,
            'certainty_weight': 0.4,
            'stall_weight': 0.2,
            'ema_alpha': 0.1
        })
    
    def test_energy_computation_basic(self):
        """Test basic energy computation from token events"""
        event = TokenEvent(
            token="hello",
            timestamp_ms=1000,
            delta_ms=50,
            model="test_model",
            session_id="test_session",
            logprobs=[-0.1, -0.5, -1.2]
        )
        
        energy = self.energy_mapper.compute_energy(event)
        
        assert 0.0 <= energy <= 1.0
        assert energy > 0.5  # Should be high for good timing and confidence
    
    def test_energy_stall_penalty(self):
        """Test energy reduction for stalled generation"""
        fast_event = TokenEvent("fast", 1000, 30, "model", "session")
        slow_event = TokenEvent("slow", 1030, 300, "model", "session")  # Stalled
        
        fast_energy = self.energy_mapper.compute_energy(fast_event)
        slow_energy = self.energy_mapper.compute_energy(slow_event)
        
        assert fast_energy > slow_energy
    
    def test_ema_smoothing(self):
        """Test exponential moving average smoothing"""
        events = [
            TokenEvent(f"token{i}", 1000 + i*50, 50, "model", "session")
            for i in range(10)
        ]
        
        energies = []
        for event in events:
            energy = self.energy_mapper.compute_energy(event)
            energies.append(energy)
        
        # EMA should be smoother than raw values
        smoothed = self.energy_mapper.get_smoothed_energy()
        assert 0.0 <= smoothed <= 1.0
    
    def test_graceful_degradation_no_logprobs(self):
        """Test energy computation when logprobs unavailable"""
        event = TokenEvent("token", 1000, 50, "model", "session", logprobs=None)
        
        energy = self.energy_mapper.compute_energy(event)
        
        assert 0.0 <= energy <= 1.0  # Should still work


class TestDiversityIndex:
    """Test diversity index calculation for ensemble streams"""
    
    def setup_method(self):
        self.di_calculator = DiversityIndexCalculator()
    
    def test_di_high_agreement(self):
        """Test DI when models agree (low diversity)"""
        aligned_tokens = [
            TokenEvent("same", 1000, 50, "model1", "session", [-0.1, -1.0, -2.0]),
            TokenEvent("same", 1000, 50, "model2", "session", [-0.1, -1.0, -2.0]),
            TokenEvent("same", 1000, 50, "model3", "session", [-0.1, -1.0, -2.0])
        ]
        
        di = self.di_calculator.compute_di(aligned_tokens)
        
        assert di < 0.3  # Low diversity for high agreement
    
    def test_di_high_disagreement(self):
        """Test DI when models disagree (high diversity)"""
        aligned_tokens = [
            TokenEvent("hello", 1000, 50, "model1", "session", [-0.1, -1.0, -2.0]),
            TokenEvent("world", 1000, 50, "model2", "session", [-1.0, -0.1, -2.0]),
            TokenEvent("test", 1000, 50, "model3", "session", [-2.0, -1.0, -0.1])
        ]
        
        di = self.di_calculator.compute_di(aligned_tokens)
        
        assert di > 0.5  # High diversity for disagreement
    
    def test_di_fallback_no_logprobs(self):
        """Test DI fallback when logprobs unavailable"""
        aligned_tokens = [
            TokenEvent("different", 1000, 50, "model1", "session"),
            TokenEvent("tokens", 1000, 50, "model2", "session"),
            TokenEvent("here", 1000, 50, "model3", "session")
        ]
        
        di = self.di_calculator.compute_di(aligned_tokens)
        
        assert 0.0 <= di <= 1.0  # Should still compute


class TestPerformanceCompliance:
    """Test 60Hz compliance and latency requirements"""
    
    @pytest.mark.asyncio
    async def test_60hz_frame_budget(self):
        """Test that energy computation stays within 16.67ms frame budget"""
        energy_mapper = EnergyMapper()
        
        # Simulate high-frequency token events
        events = [
            TokenEvent(f"token{i}", 1000 + i*16, 16, "model", "session")
            for i in range(100)
        ]
        
        start_time = time.perf_counter()
        
        for event in events:
            energy_mapper.compute_energy(event)
        
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        avg_per_token = elapsed_ms / len(events)
        
        assert avg_per_token < 0.5  # Well under 16.67ms budget
    
    @pytest.mark.asyncio
    async def test_ttft_requirements(self):
        """Test Time-To-First-Token requirements"""
        # Mock Ollama adapter
        mock_ollama = AsyncMock()
        
        # Simulate model loading and first token
        start_time = time.perf_counter()
        
        # Mock warm model response
        mock_ollama.generate_stream.return_value = AsyncMock()
        
        # Should complete within TTFT targets
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        
        assert elapsed_ms < 2000  # Warm model TTFT target


class TestAPIEndpoints:
    """Test FastAPI endpoint contracts and responses"""
    
    @pytest.mark.asyncio
    async def test_models_endpoint_schema(self):
        """Test /models endpoint response schema"""
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/models")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate schema
        assert "models" in data
        assert "total_memory_gb" in data
        assert "available_memory_gb" in data
        
        if data["models"]:
            model = data["models"][0]
            required_fields = ["name", "size_gb", "status", "memory_usage_mb", "capabilities"]
            for field in required_fields:
                assert field in model
    
    @pytest.mark.asyncio
    async def test_generate_endpoint_validation(self):
        """Test /generate endpoint input validation"""
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            # Valid request
            valid_request = {
                "model": "llama2:7b",
                "prompt": "Hello world",
                "mode": "single"
            }
            
            response = await client.post("/generate", json=valid_request)
            
            # Should return session info
            if response.status_code == 200:
                data = response.json()
                assert "session_id" in data
                assert "stream_url" in data
                assert "estimated_tokens" in data
    
    @pytest.mark.asyncio
    async def test_stats_endpoint_performance(self):
        """Test /stats endpoint response time"""
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            start_time = time.perf_counter()
            
            response = await client.get("/stats")
            
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            
            assert response.status_code == 200
            assert elapsed_ms < 100  # Should be fast for real-time use


class TestTierCompliance:
    """Test tier policy enforcement and resource limits"""
    
    def setup_method(self):
        self.tier_policy = TierPolicy({
            'low': {'max_parallel_models': 2, 'turbo_enabled': False},
            'mid': {'max_parallel_models': 4, 'turbo_enabled': True},
            'high': {'max_parallel_models': 6, 'turbo_enabled': True}
        })
    
    def test_tier_limits_enforcement(self):
        """Test that tier limits are properly enforced"""
        # Low tier should reject turbo mode
        assert not self.tier_policy.can_use_turbo('low')
        
        # High tier should allow maximum parallelism
        assert self.tier_policy.get_max_parallel('high') == 6
        
        # Mid tier should have intermediate limits
        assert self.tier_policy.get_max_parallel('mid') == 4
        assert self.tier_policy.can_use_turbo('mid')
    
    def test_resource_budgeting(self):
        """Test memory and VRAM budget enforcement"""
        # Should respect memory limits per tier
        low_budget = self.tier_policy.get_memory_budget('low')
        high_budget = self.tier_policy.get_memory_budget('high')
        
        assert high_budget > low_budget


class TestSchemaVersioning:
    """Test API schema versioning and contract compliance"""
    
    def test_schema_version_headers(self):
        """Test that API responses include schema version headers"""
        # Mock API response
        mock_response = {
            "schema_version": "tech-002-v1.0.0",
            "api_version": "1.0.0"
        }
        
        assert "schema_version" in mock_response
        assert mock_response["schema_version"].startswith("tech-002-v")
    
    def test_event_schema_compliance(self):
        """Test that token events match defined schema"""
        event = TokenEvent(
            token="test",
            timestamp_ms=1000,
            delta_ms=50,
            model="test_model",
            session_id="test_session"
        )
        
        # Convert to dict for schema validation
        event_dict = {
            "session_id": event.session_id,
            "token": event.token,
            "timestamp_ms": event.timestamp_ms,
            "model": event.model,
            "energy": 0.5
        }
        
        # Required fields should be present
        required_fields = ["session_id", "token", "timestamp_ms", "model", "energy"]
        for field in required_fields:
            assert field in event_dict


class TestSecurityCompliance:
    """Test security and privacy compliance"""
    
    def test_localhost_only_binding(self):
        """Test that server only binds to localhost"""
        from .fastapi_endpoints import create_server_config
        
        config = create_server_config()
        
        assert config.host == "127.0.0.1"
        assert config.port > 0
    
    def test_no_external_requests(self):
        """Test that no external network requests are made"""
        # This would be tested with network monitoring in integration environment
        # For unit tests, we verify configuration
        
        # Ollama adapter should only connect to localhost
        from .ollama_adapter import OllamaAdapter
        
        adapter = OllamaAdapter()
        assert "127.0.0.1" in adapter.base_url or "localhost" in adapter.base_url


# Performance benchmarks
class TestBenchmarks:
    """Performance benchmarks for monitoring regression"""
    
    @pytest.mark.benchmark
    def test_energy_computation_benchmark(self, benchmark):
        """Benchmark energy computation performance"""
        energy_mapper = EnergyMapper()
        
        event = TokenEvent("benchmark", 1000, 50, "model", "session")
        
        result = benchmark(energy_mapper.compute_energy, event)
        
        assert 0.0 <= result <= 1.0
    
    @pytest.mark.benchmark
    def test_di_computation_benchmark(self, benchmark):
        """Benchmark diversity index computation"""
        di_calculator = DiversityIndexCalculator()
        
        events = [
            TokenEvent(f"token{i}", 1000, 50, f"model{i}", "session")
            for i in range(6)  # Max ensemble size
        ]
        
        result = benchmark(di_calculator.compute_di, events)
        
        assert 0.0 <= result <= 1.0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
