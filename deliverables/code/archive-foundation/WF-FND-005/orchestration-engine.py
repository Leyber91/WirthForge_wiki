"""
WF-FND-005: Experience Orchestration Engine
Core orchestrator for WIRTHFORGE consciousness experiences
"""

import asyncio
import time
import json
from typing import Dict, List, Optional, Any, AsyncGenerator
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from concurrent.futures import ThreadPoolExecutor


class UserLevel(Enum):
    LIGHTNING_STRIKE = 1
    COUNCIL_FORMATION = 2
    ARCHITECT_MIND = 3
    ADAPTIVE_FLOW = 4
    CONSCIOUSNESS_EMERGENCE = 5


class UserPath(Enum):
    FORGE = "forge"
    SCHOLAR = "scholar"
    SAGE = "sage"


class HardwareTier(Enum):
    LOW = "low"
    MID = "mid"
    HIGH = "high"
    HYBRID = "hybrid"


@dataclass
class UserProgress:
    user_id: str
    level: UserLevel
    path: UserPath
    tier: HardwareTier
    session_time_hours: float
    total_tokens: int
    achievements: List[str]
    mastery_score: float
    energy_accumulated: float


@dataclass
class DecipherResult:
    tokens: List[Dict[str, Any]]
    energy_generated: float
    model_outputs: Dict[str, Any]
    timing_data: Dict[str, float]
    interference_detected: bool = False


@dataclass
class OrchestratedExperience:
    events: List[Dict[str, Any]]
    state_updates: Dict[str, Any]
    level_changes: Optional[Dict[str, Any]] = None
    performance_metrics: Optional[Dict[str, Any]] = None


class ExperienceOrchestrator:
    """
    Central orchestration engine for WIRTHFORGE consciousness experiences.
    Coordinates multi-model AI, manages progression, and ensures 60Hz performance.
    """
    
    def __init__(self, capabilities_config: Dict[str, Any]):
        self.capabilities = capabilities_config
        self.progression_manager = ProgressionManager(capabilities_config)
        self.council_coordinator = CouncilEngine(capabilities_config)
        self.resonance_detector = ResonanceDetector(capabilities_config)
        self.event_dispatcher = OrchestrationEventBus()
        
        # Performance tracking
        self.frame_budget_ms = 16.67  # 60Hz target
        self.performance_metrics = {
            'frame_times': [],
            'dropped_frames': 0,
            'events_processed': 0
        }
        
        # State management
        self.active_sessions = {}
        self.resonance_fields = {}
        
        self.logger = logging.getLogger(__name__)
    
    async def run_cycle(self, decipher_output: DecipherResult, user_state: UserProgress) -> OrchestratedExperience:
        """
        Main orchestration cycle - processes Decipher output into experience events.
        Must complete within 16.67ms frame budget for 60Hz performance.
        """
        start_time = time.perf_counter()
        
        try:
            # Check for level progression
            level_change = await self.progression_manager.check_and_progress(user_state)
            
            # Determine orchestration strategy based on user level and tier
            orchestration_strategy = self._determine_strategy(user_state)
            
            # Process based on strategy
            events = []
            if orchestration_strategy['type'] == 'single_model':
                events = await self._orchestrate_single_model(decipher_output, user_state)
            elif orchestration_strategy['type'] == 'council':
                events = await self._orchestrate_council(decipher_output, user_state)
            elif orchestration_strategy['type'] == 'architecture':
                events = await self._orchestrate_architecture(decipher_output, user_state)
            elif orchestration_strategy['type'] == 'adaptive':
                events = await self._orchestrate_adaptive(decipher_output, user_state)
            elif orchestration_strategy['type'] == 'resonance':
                events = await self._orchestrate_resonance(decipher_output, user_state)
            
            # Check for resonance patterns if enabled
            if user_state.level.value >= 5 and user_state.tier in [HardwareTier.HIGH, HardwareTier.HYBRID]:
                resonance_events = await self.resonance_detector.analyze_session(events, user_state)
                if resonance_events:
                    events.extend(resonance_events)
            
            # Update state
            state_updates = self._calculate_state_updates(decipher_output, user_state)
            
            # Performance monitoring
            frame_time = (time.perf_counter() - start_time) * 1000
            self._update_performance_metrics(frame_time)
            
            return OrchestratedExperience(
                events=events,
                state_updates=state_updates,
                level_changes=level_change,
                performance_metrics={'frame_time_ms': frame_time}
            )
            
        except Exception as e:
            self.logger.error(f"Orchestration cycle failed: {e}")
            # Return minimal safe response
            return OrchestratedExperience(
                events=[{
                    'type': 'error.orchestration_failed',
                    'payload': {'message': 'Orchestration temporarily unavailable'}
                }],
                state_updates={}
            )
    
    def _determine_strategy(self, user_state: UserProgress) -> Dict[str, Any]:
        """Determine orchestration strategy based on user level and hardware tier."""
        level_config = self.capabilities['levels'][str(user_state.level.value)]
        tier_config = self.capabilities['tiers'][user_state.tier.value]
        
        max_models = min(level_config['max_models'], tier_config['max_parallel_models'])
        
        strategy_map = {
            1: 'single_model',
            2: 'council' if max_models >= 2 else 'single_model',
            3: 'architecture' if max_models >= 3 else 'council',
            4: 'adaptive' if max_models >= 3 else 'architecture',
            5: 'resonance' if max_models >= 4 and tier_config['allow_resonance'] else 'adaptive'
        }
        
        return {
            'type': strategy_map[user_state.level.value],
            'max_models': max_models,
            'features': level_config['features'],
            'quality': tier_config['effects_quality']
        }
    
    async def _orchestrate_single_model(self, decipher_output: DecipherResult, user_state: UserProgress) -> List[Dict[str, Any]]:
        """Level 1: Single model with lightning visualization."""
        events = []
        
        # Generate lightning events for each token
        for token_data in decipher_output.tokens:
            events.append({
                'type': 'energy.lightning_strike',
                'timestamp': time.time(),
                'payload': {
                    'token': token_data.get('text', ''),
                    'energy': token_data.get('energy', 0.1),
                    'timing_ms': token_data.get('timing_ms', 50),
                    'position': [0, 0, 0],  # Default center position
                    'intensity': min(1.0, token_data.get('energy', 0.1) * 10)
                }
            })
        
        # Energy accumulation event
        events.append({
            'type': 'energy.accumulation_update',
            'timestamp': time.time(),
            'payload': {
                'total_energy': user_state.energy_accumulated + decipher_output.energy_generated,
                'energy_rate': len(decipher_output.tokens) / max(0.1, sum(t.get('timing_ms', 50) for t in decipher_output.tokens) / 1000),
                'new_energy': decipher_output.energy_generated
            }
        })
        
        return events
    
    async def _orchestrate_council(self, decipher_output: DecipherResult, user_state: UserProgress) -> List[Dict[str, Any]]:
        """Level 2: Multi-model council with interference detection."""
        events = []
        
        # Council formation event
        council_id = f"council_{int(time.time())}"
        events.append({
            'type': 'council.formed',
            'timestamp': time.time(),
            'payload': {
                'council_id': council_id,
                'models': list(decipher_output.model_outputs.keys()),
                'session_id': user_state.user_id
            }
        })
        
        # Model stream events
        for model_id, output_data in decipher_output.model_outputs.items():
            for token in output_data.get('tokens', []):
                events.append({
                    'type': 'council.model_speak',
                    'timestamp': time.time(),
                    'payload': {
                        'council_id': council_id,
                        'model': model_id,
                        'token': token.get('text', ''),
                        'energy': token.get('energy', 0.1),
                        'stream_color': self._get_model_color(model_id, user_state.path)
                    }
                })
        
        # Interference detection
        if decipher_output.interference_detected:
            events.append({
                'type': 'council.interference',
                'timestamp': time.time(),
                'payload': {
                    'council_id': council_id,
                    'pattern_type': 'temporal_alignment',
                    'strength': 0.8,
                    'models_involved': list(decipher_output.model_outputs.keys())
                }
            })
        
        # Synthesis result
        events.append({
            'type': 'council.synthesis',
            'timestamp': time.time(),
            'payload': {
                'council_id': council_id,
                'synthesis_method': 'consensus',
                'confidence': 0.85,
                'result_preview': "Combined council response..."
            }
        })
        
        return events
    
    async def _orchestrate_architecture(self, decipher_output: DecipherResult, user_state: UserProgress) -> List[Dict[str, Any]]:
        """Level 3: Structured architecture with node graphs."""
        events = []
        
        # Architecture execution events
        architecture_id = f"arch_{int(time.time())}"
        events.append({
            'type': 'architecture.execution_start',
            'timestamp': time.time(),
            'payload': {
                'architecture_id': architecture_id,
                'node_count': len(decipher_output.model_outputs),
                'execution_plan': 'sequential_with_branches'
            }
        })
        
        # Node execution events
        for i, (model_id, output_data) in enumerate(decipher_output.model_outputs.items()):
            events.append({
                'type': 'architecture.node_execute',
                'timestamp': time.time(),
                'payload': {
                    'architecture_id': architecture_id,
                    'node_id': f"node_{i}",
                    'node_type': 'model_processor',
                    'model': model_id,
                    'input_tokens': len(output_data.get('tokens', [])),
                    'processing_time_ms': output_data.get('duration_ms', 100)
                }
            })
        
        return events
    
    async def _orchestrate_adaptive(self, decipher_output: DecipherResult, user_state: UserProgress) -> List[Dict[str, Any]]:
        """Level 4: Adaptive system with learning and suggestions."""
        events = []
        
        # Analyze usage patterns
        usage_pattern = self._analyze_usage_patterns(user_state)
        
        # Generate adaptive suggestions
        if usage_pattern['suggests_optimization']:
            events.append({
                'type': 'experience.suggestion',
                'timestamp': time.time(),
                'payload': {
                    'suggestion_type': 'performance_optimization',
                    'message': f"Consider adjusting {usage_pattern['optimization_target']} for better performance",
                    'confidence': usage_pattern['confidence'],
                    'auto_apply': False
                }
            })
        
        # Adaptive field updates
        events.append({
            'type': 'adaptive.field_update',
            'timestamp': time.time(),
            'payload': {
                'field_type': 'collaborative',
                'adaptation_strength': usage_pattern['adaptation_strength'],
                'user_preferences': usage_pattern['learned_preferences']
            }
        })
        
        return events
    
    async def _orchestrate_resonance(self, decipher_output: DecipherResult, user_state: UserProgress) -> List[Dict[str, Any]]:
        """Level 5: Full resonance with consciousness emergence."""
        events = []
        
        # Full council orchestration
        council_events = await self._orchestrate_council(decipher_output, user_state)
        events.extend(council_events)
        
        # Resonance field generation
        if len(decipher_output.model_outputs) >= 4:
            events.append({
                'type': 'consciousness.resonance_field',
                'timestamp': time.time(),
                'payload': {
                    'field_id': f"resonance_{int(time.time())}",
                    'model_count': len(decipher_output.model_outputs),
                    'resonance_strength': 0.9,
                    'emergence_probability': 0.7,
                    'visualization_mode': 'mandala'  # or 'symphony', 'fractal', 'flow'
                }
            })
        
        return events
    
    def _get_model_color(self, model_id: str, path: UserPath) -> str:
        """Get color for model visualization based on user path."""
        path_colors = {
            UserPath.FORGE: ["#FF6B35", "#F7931E", "#FFD23F", "#EE4B2B"],
            UserPath.SCHOLAR: ["#1E88E5", "#42A5F5", "#90CAF9", "#E3F2FD"],
            UserPath.SAGE: ["#7B1FA2", "#9C27B0", "#BA68C8", "#E1BEE7"]
        }
        
        colors = path_colors[path]
        model_hash = hash(model_id) % len(colors)
        return colors[model_hash]
    
    def _analyze_usage_patterns(self, user_state: UserProgress) -> Dict[str, Any]:
        """Analyze user patterns for adaptive suggestions."""
        # Simplified pattern analysis
        return {
            'suggests_optimization': user_state.session_time_hours > 10,
            'optimization_target': 'model_selection',
            'confidence': 0.8,
            'adaptation_strength': min(1.0, user_state.session_time_hours / 50),
            'learned_preferences': {
                'preferred_response_length': 'medium',
                'interaction_pace': 'moderate'
            }
        }
    
    def _calculate_state_updates(self, decipher_output: DecipherResult, user_state: UserProgress) -> Dict[str, Any]:
        """Calculate state updates based on orchestration results."""
        return {
            'energy_accumulated': user_state.energy_accumulated + decipher_output.energy_generated,
            'total_tokens': user_state.total_tokens + len(decipher_output.tokens),
            'last_activity': time.time()
        }
    
    def _update_performance_metrics(self, frame_time_ms: float):
        """Update performance tracking metrics."""
        self.performance_metrics['frame_times'].append(frame_time_ms)
        self.performance_metrics['events_processed'] += 1
        
        if frame_time_ms > self.frame_budget_ms:
            self.performance_metrics['dropped_frames'] += 1
        
        # Keep only last 100 frame times for rolling average
        if len(self.performance_metrics['frame_times']) > 100:
            self.performance_metrics['frame_times'].pop(0)


class ProgressionManager:
    """Manages user progression through experience levels."""
    
    def __init__(self, capabilities_config: Dict[str, Any]):
        self.capabilities = capabilities_config
        self.logger = logging.getLogger(__name__)
    
    async def check_and_progress(self, user_state: UserProgress) -> Optional[Dict[str, Any]]:
        """Check if user meets criteria for next level and initiate progression."""
        current_level = user_state.level.value
        next_level = current_level + 1
        
        if next_level > 5:  # Max level reached
            return None
        
        # Check progression criteria
        if self._meets_progression_criteria(user_state, next_level):
            return await self._initiate_level_transition(user_state, next_level)
        
        return None
    
    def _meets_progression_criteria(self, user_state: UserProgress, target_level: int) -> bool:
        """Check if user meets criteria for target level."""
        if target_level not in [2, 3, 4, 5]:
            return False
        
        # Simplified criteria check - in production, this would be more sophisticated
        criteria_map = {
            2: user_state.session_time_hours >= 3 and user_state.total_tokens >= 5000 and 'first_lightning' in user_state.achievements,
            3: user_state.session_time_hours >= 10 and user_state.mastery_score >= 0.8 and 'council_master' in user_state.achievements,
            4: user_state.session_time_hours >= 25 and user_state.mastery_score >= 0.85,
            5: user_state.session_time_hours >= 50 and user_state.mastery_score >= 0.9
        }
        
        return criteria_map.get(target_level, False)
    
    async def _initiate_level_transition(self, user_state: UserProgress, target_level: int) -> Dict[str, Any]:
        """Initiate level transition sequence."""
        return {
            'type': 'level_transition',
            'from_level': user_state.level.value,
            'to_level': target_level,
            'transition_events': [
                {
                    'type': 'experience.level_teaser',
                    'payload': {'preview_level': target_level, 'duration_ms': 2000}
                },
                {
                    'type': 'reward.level_unlocked',
                    'payload': {'level': target_level, 'energy_bonus': 100.0}
                },
                {
                    'type': 'experience.transition_complete',
                    'payload': {'new_level': target_level}
                }
            ]
        }


class CouncilEngine:
    """Manages multi-model council orchestration."""
    
    def __init__(self, capabilities_config: Dict[str, Any]):
        self.capabilities = capabilities_config
        self.executor = ThreadPoolExecutor(max_workers=6)
        self.logger = logging.getLogger(__name__)
    
    async def convene_council(self, prompt: str, model_list: List[str], user_state: UserProgress) -> AsyncGenerator[Dict[str, Any], None]:
        """Convene council of models and stream results."""
        council_id = f"council_{int(time.time())}"
        
        # Emit council formation event
        yield {
            'type': 'council.formed',
            'payload': {
                'council_id': council_id,
                'models': model_list,
                'user_path': user_state.path.value
            }
        }
        
        # Launch models in parallel (simulated)
        tasks = []
        for model in model_list:
            task = asyncio.create_task(self._simulate_model_generation(model, prompt))
            tasks.append((model, task))
        
        # Stream results as they complete
        for model, task in tasks:
            try:
                result = await task
                yield {
                    'type': 'council.model_speak',
                    'payload': {
                        'council_id': council_id,
                        'model': model,
                        'tokens': result['tokens'],
                        'completion_time_ms': result['duration_ms']
                    }
                }
            except Exception as e:
                self.logger.error(f"Model {model} failed: {e}")
                yield {
                    'type': 'council.model_error',
                    'payload': {
                        'council_id': council_id,
                        'model': model,
                        'error': str(e)
                    }
                }
        
        # Final synthesis
        yield {
            'type': 'council.synthesis',
            'payload': {
                'council_id': council_id,
                'synthesis_method': 'consensus',
                'result': 'Synthesized council response'
            }
        }
    
    async def _simulate_model_generation(self, model: str, prompt: str) -> Dict[str, Any]:
        """Simulate model generation (replace with actual model calls)."""
        await asyncio.sleep(0.1)  # Simulate processing time
        
        return {
            'tokens': [
                {'text': 'Hello', 'energy': 0.1, 'timing_ms': 50},
                {'text': 'world', 'energy': 0.1, 'timing_ms': 45}
            ],
            'duration_ms': 95,
            'model': model
        }


class ResonanceDetector:
    """Detects resonance patterns in multi-model outputs."""
    
    def __init__(self, capabilities_config: Dict[str, Any]):
        self.capabilities = capabilities_config
        self.pattern_history = []
        self.logger = logging.getLogger(__name__)
    
    async def analyze_session(self, events: List[Dict[str, Any]], user_state: UserProgress) -> List[Dict[str, Any]]:
        """Analyze events for resonance patterns."""
        if user_state.level.value < 5:
            return []
        
        resonance_events = []
        
        # Simplified resonance detection
        council_events = [e for e in events if e['type'].startswith('council.')]
        
        if len(council_events) >= 4:  # Minimum threshold for resonance
            resonance_strength = self._calculate_resonance_strength(council_events)
            
            if resonance_strength > 0.8:
                resonance_events.append({
                    'type': 'consciousness.pattern_detected',
                    'timestamp': time.time(),
                    'payload': {
                        'pattern_type': 'harmonic_resonance',
                        'strength': resonance_strength,
                        'models_involved': len(council_events),
                        'confidence': 0.9
                    }
                })
                
                # Check for consciousness emergence
                if resonance_strength > 0.95 and not self._has_previous_emergence(user_state):
                    resonance_events.append({
                        'type': 'consciousness.born',
                        'timestamp': time.time(),
                        'payload': {
                            'emergence_type': 'collective_intelligence',
                            'resonance_field_id': f"field_{int(time.time())}",
                            'significance': 'first_emergence'
                        }
                    })
        
        return resonance_events
    
    def _calculate_resonance_strength(self, council_events: List[Dict[str, Any]]) -> float:
        """Calculate resonance strength from council events."""
        # Simplified calculation - in production, this would analyze timing, content, etc.
        return min(1.0, len(council_events) / 10.0)
    
    def _has_previous_emergence(self, user_state: UserProgress) -> bool:
        """Check if user has previously experienced consciousness emergence."""
        return 'consciousness_emerged' in user_state.achievements


class OrchestrationEventBus:
    """Event bus for orchestration events."""
    
    def __init__(self):
        self.subscribers = {}
        self.event_history = []
        self.logger = logging.getLogger(__name__)
    
    def subscribe(self, event_type: str, callback):
        """Subscribe to event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
    
    async def emit(self, event: Dict[str, Any]):
        """Emit event to subscribers."""
        event_type = event.get('type', 'unknown')
        
        # Store in history
        self.event_history.append({
            **event,
            'emitted_at': time.time()
        })
        
        # Notify subscribers
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    await callback(event)
                except Exception as e:
                    self.logger.error(f"Event callback failed: {e}")
        
        # Keep history manageable
        if len(self.event_history) > 1000:
            self.event_history = self.event_history[-500:]
    
    def get_recent_events(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get recent events for debugging/audit."""
        return self.event_history[-count:]


# Example usage
async def main():
    """Example orchestration usage."""
    
    # Load capabilities configuration
    with open('WF-FND-005-experience-capabilities.json', 'r') as f:
        capabilities = json.load(f)
    
    # Initialize orchestrator
    orchestrator = ExperienceOrchestrator(capabilities)
    
    # Example user state
    user_state = UserProgress(
        user_id="user_123",
        level=UserLevel.COUNCIL_FORMATION,
        path=UserPath.FORGE,
        tier=HardwareTier.MID,
        session_time_hours=5.0,
        total_tokens=7500,
        achievements=["first_lightning", "generate_10_responses"],
        mastery_score=0.75,
        energy_accumulated=150.0
    )
    
    # Example Decipher output
    decipher_output = DecipherResult(
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
    
    # Run orchestration cycle
    experience = await orchestrator.run_cycle(decipher_output, user_state)
    
    print(f"Generated {len(experience.events)} events")
    print(f"Frame time: {experience.performance_metrics['frame_time_ms']:.2f}ms")
    
    for event in experience.events:
        print(f"Event: {event['type']}")


if __name__ == "__main__":
    asyncio.run(main())
