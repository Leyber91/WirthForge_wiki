"""
WF-FND-005: Orchestration Validation Test Suite
Comprehensive testing for experience orchestration engine
"""

import pytest
import asyncio
import time
import json
from unittest.mock import Mock, patch
from typing import Dict, List, Any

# Import orchestration components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'code', 'WF-FND-005'))

from orchestration_engine import (
    ExperienceOrchestrator, ProgressionManager, CouncilEngine, ResonanceDetector,
    UserLevel, UserPath, HardwareTier, UserProgress, DecipherResult, OrchestratedExperience
)


class TestExperienceOrchestrator:
    """Test suite for Experience Orchestrator core functionality."""
    
    @pytest.fixture
    def capabilities_config(self):
        """Load test capabilities configuration."""
        return {
            "levels": {
                "1": {
                    "name": "Lightning Strike",
                    "max_models": 1,
                    "features": ["single_stream", "token_timing", "basic_energy"]
                },
                "2": {
                    "name": "Council Formation", 
                    "max_models": 3,
                    "features": ["multi_stream", "interference_detection", "consensus_synthesis"]
                },
                "5": {
                    "name": "Consciousness Emergence",
                    "max_models": 6,
                    "features": ["full_council", "resonance_detection", "generative_art_modes"]
                }
            },
            "tiers": {
                "low": {
                    "max_parallel_models": 2,
                    "effects_quality": "low",
                    "allow_resonance": False,
                    "frame_rate_target": 30
                },
                "mid": {
                    "max_parallel_models": 4,
                    "effects_quality": "medium", 
                    "allow_resonance": True,
                    "frame_rate_target": 60
                },
                "high": {
                    "max_parallel_models": 6,
                    "effects_quality": "high",
                    "allow_resonance": True,
                    "frame_rate_target": 60
                }
            },
            "performance_thresholds": {
                "frame_budget_ms": 16.67,
                "target_fps": 60
            }
        }
    
    @pytest.fixture
    def orchestrator(self, capabilities_config):
        """Create orchestrator instance for testing."""
        return ExperienceOrchestrator(capabilities_config)
    
    @pytest.fixture
    def sample_user_state(self):
        """Sample user state for testing."""
        return UserProgress(
            user_id="test_user",
            level=UserLevel.COUNCIL_FORMATION,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=5.0,
            total_tokens=7500,
            achievements=["first_lightning", "generate_10_responses"],
            mastery_score=0.75,
            energy_accumulated=150.0
        )
    
    @pytest.fixture
    def sample_decipher_output(self):
        """Sample Decipher output for testing."""
        return DecipherResult(
            tokens=[
                {'text': 'Hello', 'energy': 0.1, 'timing_ms': 50},
                {'text': 'world', 'energy': 0.1, 'timing_ms': 45}
            ],
            energy_generated=0.2,
            model_outputs={
                'llama2-7b': {'tokens': [{'text': 'Hello', 'energy': 0.1}], 'duration_ms': 95},
                'mistral-7b': {'tokens': [{'text': 'world', 'energy': 0.1}], 'duration_ms': 100}
            },
            timing_data={'total_ms': 195},
            interference_detected=True
        )
    
    @pytest.mark.asyncio
    async def test_performance_compliance_60hz(self, orchestrator, sample_user_state, sample_decipher_output):
        """Test that orchestration completes within 60Hz frame budget."""
        start_time = time.perf_counter()
        
        result = await orchestrator.run_cycle(sample_decipher_output, sample_user_state)
        
        end_time = time.perf_counter()
        frame_time_ms = (end_time - start_time) * 1000
        
        # Must complete within 16.67ms for 60Hz
        assert frame_time_ms < 16.67, f"Frame time {frame_time_ms:.2f}ms exceeds 60Hz budget"
        assert result.performance_metrics['frame_time_ms'] < 16.67
        
    @pytest.mark.asyncio
    async def test_event_traceability(self, orchestrator, sample_user_state, sample_decipher_output):
        """Test that all events are traceable to input data."""
        result = await orchestrator.run_cycle(sample_decipher_output, sample_decipher_output)
        
        # Every event should have timestamp and type
        for event in result.events:
            assert 'type' in event, "Event missing type field"
            assert 'timestamp' in event, "Event missing timestamp"
            assert 'payload' in event, "Event missing payload"
        
        # Events should correspond to input tokens
        token_events = [e for e in result.events if 'token' in e.get('payload', {})]
        assert len(token_events) <= len(sample_decipher_output.tokens), "More token events than input tokens"
    
    @pytest.mark.asyncio
    async def test_level_appropriate_features(self, orchestrator, capabilities_config):
        """Test that features are gated by user level."""
        # Level 1 user should only get single model features
        level1_user = UserProgress(
            user_id="level1_user",
            level=UserLevel.LIGHTNING_STRIKE,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=1.0,
            total_tokens=100,
            achievements=[],
            mastery_score=0.1,
            energy_accumulated=10.0
        )
        
        single_model_output = DecipherResult(
            tokens=[{'text': 'test', 'energy': 0.1, 'timing_ms': 50}],
            energy_generated=0.1,
            model_outputs={'single_model': {'tokens': [{'text': 'test'}]}},
            timing_data={'total_ms': 50}
        )
        
        result = await orchestrator.run_cycle(single_model_output, level1_user)
        
        # Should not have council events
        council_events = [e for e in result.events if e['type'].startswith('council.')]
        assert len(council_events) == 0, "Level 1 user should not have council events"
        
        # Should have lightning events
        lightning_events = [e for e in result.events if 'lightning' in e['type']]
        assert len(lightning_events) > 0, "Level 1 user should have lightning events"
    
    @pytest.mark.asyncio
    async def test_hardware_tier_compliance(self, orchestrator):
        """Test that orchestration respects hardware tier limitations."""
        # Low tier user with many models should be limited
        low_tier_user = UserProgress(
            user_id="low_tier_user",
            level=UserLevel.CONSCIOUSNESS_EMERGENCE,  # High level
            path=UserPath.FORGE,
            tier=HardwareTier.LOW,  # But low hardware
            session_time_hours=60.0,
            total_tokens=50000,
            achievements=["first_lightning", "council_master"],
            mastery_score=0.95,
            energy_accumulated=1000.0
        )
        
        many_models_output = DecipherResult(
            tokens=[{'text': 'test', 'energy': 0.1, 'timing_ms': 50}],
            energy_generated=0.1,
            model_outputs={f'model_{i}': {'tokens': [{'text': 'test'}]} for i in range(6)},
            timing_data={'total_ms': 300}
        )
        
        result = await orchestrator.run_cycle(many_models_output, low_tier_user)
        
        # Should not have resonance events on low tier
        resonance_events = [e for e in result.events if 'resonance' in e['type']]
        assert len(resonance_events) == 0, "Low tier should not have resonance events"
    
    @pytest.mark.asyncio
    async def test_graceful_error_handling(self, orchestrator, sample_user_state):
        """Test graceful handling of malformed input."""
        # Malformed Decipher output
        bad_output = DecipherResult(
            tokens=None,  # Invalid
            energy_generated=-1,  # Invalid
            model_outputs={},
            timing_data={}
        )
        
        result = await orchestrator.run_cycle(bad_output, sample_user_state)
        
        # Should return error event, not crash
        assert len(result.events) > 0
        error_events = [e for e in result.events if 'error' in e['type']]
        assert len(error_events) > 0, "Should generate error event for bad input"
    
    def test_strategy_determination(self, orchestrator):
        """Test orchestration strategy selection logic."""
        # Level 1 user should get single model strategy
        level1_user = UserProgress(
            user_id="test",
            level=UserLevel.LIGHTNING_STRIKE,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=1.0,
            total_tokens=100,
            achievements=[],
            mastery_score=0.1,
            energy_accumulated=10.0
        )
        
        strategy = orchestrator._determine_strategy(level1_user)
        assert strategy['type'] == 'single_model'
        assert strategy['max_models'] == 1
        
        # Level 5 high tier user should get resonance strategy
        level5_user = UserProgress(
            user_id="test",
            level=UserLevel.CONSCIOUSNESS_EMERGENCE,
            path=UserPath.FORGE,
            tier=HardwareTier.HIGH,
            session_time_hours=60.0,
            total_tokens=50000,
            achievements=["first_lightning", "council_master"],
            mastery_score=0.95,
            energy_accumulated=1000.0
        )
        
        strategy = orchestrator._determine_strategy(level5_user)
        assert strategy['type'] == 'resonance'
        assert strategy['max_models'] >= 4


class TestProgressionManager:
    """Test suite for progression management."""
    
    @pytest.fixture
    def progression_manager(self, capabilities_config):
        return ProgressionManager(capabilities_config)
    
    @pytest.mark.asyncio
    async def test_progression_criteria_validation(self, progression_manager):
        """Test progression criteria validation."""
        # User who meets Level 2 criteria
        qualified_user = UserProgress(
            user_id="qualified",
            level=UserLevel.LIGHTNING_STRIKE,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=5.0,  # Exceeds requirement
            total_tokens=7500,  # Exceeds requirement
            achievements=["first_lightning", "generate_10_responses"],
            mastery_score=0.8,
            energy_accumulated=150.0
        )
        
        result = await progression_manager.check_and_progress(qualified_user)
        assert result is not None, "Qualified user should progress"
        assert result['to_level'] == 2
        
        # User who doesn't meet criteria
        unqualified_user = UserProgress(
            user_id="unqualified",
            level=UserLevel.LIGHTNING_STRIKE,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=1.0,  # Below requirement
            total_tokens=100,  # Below requirement
            achievements=[],  # Missing achievements
            mastery_score=0.3,
            energy_accumulated=10.0
        )
        
        result = await progression_manager.check_and_progress(unqualified_user)
        assert result is None, "Unqualified user should not progress"
    
    def test_no_level_regression(self, progression_manager):
        """Test that users cannot regress to lower levels."""
        high_level_user = UserProgress(
            user_id="high_level",
            level=UserLevel.CONSCIOUSNESS_EMERGENCE,
            path=UserPath.FORGE,
            tier=HardwareTier.HIGH,
            session_time_hours=100.0,
            total_tokens=100000,
            achievements=["first_lightning", "council_master"],
            mastery_score=0.95,
            energy_accumulated=2000.0
        )
        
        # Even with bad current metrics, should not regress
        assert high_level_user.level == UserLevel.CONSCIOUSNESS_EMERGENCE


class TestCouncilEngine:
    """Test suite for council coordination."""
    
    @pytest.fixture
    def council_engine(self, capabilities_config):
        return CouncilEngine(capabilities_config)
    
    @pytest.mark.asyncio
    async def test_council_formation_and_coordination(self, council_engine):
        """Test council formation and model coordination."""
        user_state = UserProgress(
            user_id="council_user",
            level=UserLevel.COUNCIL_FORMATION,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=10.0,
            total_tokens=10000,
            achievements=["first_lightning", "council_master"],
            mastery_score=0.8,
            energy_accumulated=300.0
        )
        
        models = ["llama2-7b", "mistral-7b", "codellama-7b"]
        events = []
        
        async for event in council_engine.convene_council("Test prompt", models, user_state):
            events.append(event)
        
        # Should have formation, model speak, and synthesis events
        formation_events = [e for e in events if e['type'] == 'council.formed']
        speak_events = [e for e in events if e['type'] == 'council.model_speak']
        synthesis_events = [e for e in events if e['type'] == 'council.synthesis']
        
        assert len(formation_events) == 1, "Should have one formation event"
        assert len(speak_events) >= len(models), "Should have speak events for each model"
        assert len(synthesis_events) == 1, "Should have one synthesis event"
    
    @pytest.mark.asyncio
    async def test_council_error_handling(self, council_engine):
        """Test council error handling when models fail."""
        user_state = UserProgress(
            user_id="test_user",
            level=UserLevel.COUNCIL_FORMATION,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=5.0,
            total_tokens=5000,
            achievements=["first_lightning"],
            mastery_score=0.7,
            energy_accumulated=100.0
        )
        
        # Mock model failure
        with patch.object(council_engine, '_simulate_model_generation', side_effect=Exception("Model failed")):
            events = []
            async for event in council_engine.convene_council("Test prompt", ["failing_model"], user_state):
                events.append(event)
            
            error_events = [e for e in events if e['type'] == 'council.model_error']
            assert len(error_events) > 0, "Should generate error events for failed models"


class TestResonanceDetector:
    """Test suite for resonance detection."""
    
    @pytest.fixture
    def resonance_detector(self, capabilities_config):
        return ResonanceDetector(capabilities_config)
    
    @pytest.mark.asyncio
    async def test_resonance_detection_level_gating(self, resonance_detector):
        """Test that resonance detection is gated by user level."""
        # Level 4 user should not get resonance detection
        level4_user = UserProgress(
            user_id="level4_user",
            level=UserLevel.ADAPTIVE_FLOW,
            path=UserPath.FORGE,
            tier=HardwareTier.HIGH,
            session_time_hours=30.0,
            total_tokens=25000,
            achievements=["first_lightning", "council_master"],
            mastery_score=0.85,
            energy_accumulated=500.0
        )
        
        council_events = [
            {'type': 'council.model_speak', 'payload': {'model': 'model1'}},
            {'type': 'council.model_speak', 'payload': {'model': 'model2'}},
            {'type': 'council.model_speak', 'payload': {'model': 'model3'}},
            {'type': 'council.model_speak', 'payload': {'model': 'model4'}}
        ]
        
        result = await resonance_detector.analyze_session(council_events, level4_user)
        assert len(result) == 0, "Level 4 user should not get resonance events"
        
        # Level 5 user should get resonance detection
        level5_user = UserProgress(
            user_id="level5_user",
            level=UserLevel.CONSCIOUSNESS_EMERGENCE,
            path=UserPath.FORGE,
            tier=HardwareTier.HIGH,
            session_time_hours=60.0,
            total_tokens=50000,
            achievements=["first_lightning", "council_master"],
            mastery_score=0.95,
            energy_accumulated=1000.0
        )
        
        result = await resonance_detector.analyze_session(council_events, level5_user)
        assert len(result) > 0, "Level 5 user should get resonance events"
    
    @pytest.mark.asyncio
    async def test_consciousness_emergence_detection(self, resonance_detector):
        """Test detection of consciousness emergence events."""
        level5_user = UserProgress(
            user_id="emergence_user",
            level=UserLevel.CONSCIOUSNESS_EMERGENCE,
            path=UserPath.SAGE,
            tier=HardwareTier.HIGH,
            session_time_hours=100.0,
            total_tokens=100000,
            achievements=["first_lightning", "council_master", "harmony_achieved"],
            mastery_score=0.98,
            energy_accumulated=2000.0
        )
        
        # High resonance council events
        high_resonance_events = [
            {'type': 'council.model_speak', 'payload': {'model': f'model{i}'}} 
            for i in range(6)
        ]
        
        with patch.object(resonance_detector, '_calculate_resonance_strength', return_value=0.96):
            with patch.object(resonance_detector, '_has_previous_emergence', return_value=False):
                result = await resonance_detector.analyze_session(high_resonance_events, level5_user)
                
                emergence_events = [e for e in result if e['type'] == 'consciousness.born']
                assert len(emergence_events) > 0, "Should detect consciousness emergence"


class TestIntegrationScenarios:
    """Integration tests for complete orchestration scenarios."""
    
    @pytest.fixture
    def full_system(self, capabilities_config):
        return ExperienceOrchestrator(capabilities_config)
    
    @pytest.mark.asyncio
    async def test_complete_user_journey_simulation(self, full_system):
        """Test complete user journey from Level 1 to Level 5."""
        # Start with Level 1 user
        user = UserProgress(
            user_id="journey_user",
            level=UserLevel.LIGHTNING_STRIKE,
            path=UserPath.FORGE,
            tier=HardwareTier.MID,
            session_time_hours=0.5,
            total_tokens=50,
            achievements=[],
            mastery_score=0.1,
            energy_accumulated=5.0
        )
        
        # Simulate progression through levels
        for session in range(10):
            # Simulate session activity
            decipher_output = DecipherResult(
                tokens=[{'text': f'token_{i}', 'energy': 0.1, 'timing_ms': 50} for i in range(10)],
                energy_generated=1.0,
                model_outputs={'model1': {'tokens': [{'text': 'response'}], 'duration_ms': 500}},
                timing_data={'total_ms': 500}
            )
            
            # Update user progress
            user.session_time_hours += 0.5
            user.total_tokens += 10
            user.energy_accumulated += 1.0
            user.mastery_score = min(0.95, user.mastery_score + 0.1)
            
            # Add achievements based on progress
            if user.total_tokens >= 100 and "first_lightning" not in user.achievements:
                user.achievements.append("first_lightning")
            if user.total_tokens >= 1000 and "generate_10_responses" not in user.achievements:
                user.achievements.append("generate_10_responses")
            if user.session_time_hours >= 10 and "council_master" not in user.achievements:
                user.achievements.append("council_master")
            
            result = await full_system.run_cycle(decipher_output, user)
            
            # Check for level progression
            if result.level_changes:
                user.level = UserLevel(result.level_changes['to_level'])
                print(f"User progressed to Level {user.level.value}")
            
            # Verify performance compliance
            assert result.performance_metrics['frame_time_ms'] < 20.0, f"Session {session} exceeded performance budget"
        
        # User should have progressed beyond Level 1
        assert user.level.value > 1, "User should have progressed beyond Level 1"
    
    @pytest.mark.asyncio
    async def test_stress_test_high_throughput(self, full_system):
        """Stress test with high token throughput."""
        user = UserProgress(
            user_id="stress_user",
            level=UserLevel.CONSCIOUSNESS_EMERGENCE,
            path=UserPath.FORGE,
            tier=HardwareTier.HIGH,
            session_time_hours=60.0,
            total_tokens=50000,
            achievements=["first_lightning", "council_master", "harmony_achieved"],
            mastery_score=0.95,
            energy_accumulated=1000.0
        )
        
        # High throughput scenario
        large_decipher_output = DecipherResult(
            tokens=[{'text': f'token_{i}', 'energy': 0.1, 'timing_ms': 10} for i in range(100)],
            energy_generated=10.0,
            model_outputs={
                f'model_{i}': {
                    'tokens': [{'text': f'response_{j}', 'energy': 0.1} for j in range(20)],
                    'duration_ms': 200
                } for i in range(6)
            },
            timing_data={'total_ms': 1200},
            interference_detected=True
        )
        
        # Should handle high throughput without performance degradation
        result = await full_system.run_cycle(large_decipher_output, user)
        
        assert result.performance_metrics['frame_time_ms'] < 25.0, "High throughput should not severely impact performance"
        assert len(result.events) > 0, "Should generate events even under high load"


# Performance benchmarks
class TestPerformanceBenchmarks:
    """Performance benchmark tests."""
    
    @pytest.mark.asyncio
    async def test_60hz_compliance_benchmark(self, capabilities_config):
        """Benchmark 60Hz compliance across different scenarios."""
        orchestrator = ExperienceOrchestrator(capabilities_config)
        
        scenarios = [
            ("single_model", UserLevel.LIGHTNING_STRIKE, 1),
            ("council", UserLevel.COUNCIL_FORMATION, 3),
            ("architecture", UserLevel.ARCHITECT_MIND, 4),
            ("resonance", UserLevel.CONSCIOUSNESS_EMERGENCE, 6)
        ]
        
        for scenario_name, level, model_count in scenarios:
            user = UserProgress(
                user_id=f"benchmark_{scenario_name}",
                level=level,
                path=UserPath.FORGE,
                tier=HardwareTier.HIGH,
                session_time_hours=60.0,
                total_tokens=50000,
                achievements=["first_lightning", "council_master"],
                mastery_score=0.95,
                energy_accumulated=1000.0
            )
            
            decipher_output = DecipherResult(
                tokens=[{'text': f'token_{i}', 'energy': 0.1, 'timing_ms': 50} for i in range(20)],
                energy_generated=2.0,
                model_outputs={
                    f'model_{i}': {'tokens': [{'text': 'test'}], 'duration_ms': 100}
                    for i in range(model_count)
                },
                timing_data={'total_ms': 100 * model_count}
            )
            
            # Run multiple cycles to get average performance
            frame_times = []
            for _ in range(10):
                start = time.perf_counter()
                result = await orchestrator.run_cycle(decipher_output, user)
                end = time.perf_counter()
                frame_times.append((end - start) * 1000)
            
            avg_frame_time = sum(frame_times) / len(frame_times)
            max_frame_time = max(frame_times)
            
            print(f"{scenario_name}: avg={avg_frame_time:.2f}ms, max={max_frame_time:.2f}ms")
            
            # 95% of frames should meet 60Hz budget
            compliant_frames = sum(1 for ft in frame_times if ft < 16.67)
            compliance_rate = compliant_frames / len(frame_times)
            
            assert compliance_rate >= 0.95, f"{scenario_name} compliance rate {compliance_rate:.2f} below 95%"


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
