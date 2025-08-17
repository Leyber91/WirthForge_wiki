"""
DECIPHER Frame Loop Controller
60Hz real-time frame processing with budget management and adaptive performance

Implements precise timing control, priority-based task scheduling, and graceful
degradation under load to maintain 16.67ms frame budget compliance.
"""

import asyncio
import time
import threading
from typing import Dict, List, Callable, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
from collections import deque

logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    """Task priority levels for frame processing"""
    CRITICAL = 1    # Must complete every frame
    HIGH = 2        # Complete unless budget critical
    MEDIUM = 3      # Skip under moderate load
    LOW = 4         # Skip under any load

class FrameStatus(Enum):
    """Frame processing status"""
    PROCESSING = "processing"
    COMPLETED = "completed"
    OVERRUN = "overrun"
    ERROR = "error"

@dataclass
class FrameTask:
    """Individual frame task definition"""
    name: str
    priority: TaskPriority
    estimated_duration_ms: float
    callback: Callable
    enabled: bool = True
    skip_count: int = 0

@dataclass
class FrameMetrics:
    """Frame processing metrics"""
    sequence: int
    start_time: float
    end_time: float
    duration_ms: float
    budget_ms: float
    status: FrameStatus
    tasks_completed: List[str]
    tasks_skipped: List[str]
    overrun_ms: float = 0.0

class AdaptiveController:
    """Adaptive performance controller for dynamic load management"""
    
    def __init__(self):
        self.load_history = deque(maxlen=60)  # 1 second of history
        self.overrun_count = 0
        self.skip_recommendations = {}
        self.quality_level = 1.0  # 0.0 to 1.0
    
    def update_load(self, frame_duration_ms: float, budget_ms: float):
        """Update load metrics"""
        load_ratio = frame_duration_ms / budget_ms
        self.load_history.append(load_ratio)
        
        if frame_duration_ms > budget_ms:
            self.overrun_count += 1
    
    def get_skip_recommendations(self) -> Dict[str, bool]:
        """Get task skip recommendations based on current load"""
        if len(self.load_history) < 10:
            return {}
        
        avg_load = sum(self.load_history) / len(self.load_history)
        recent_load = sum(list(self.load_history)[-5:]) / 5
        
        recommendations = {}
        
        # Skip low priority tasks if consistently over budget
        if avg_load > 1.1:
            recommendations.update({
                "pattern_analysis": True,
                "detailed_metrics": True,
                "history_cleanup": True
            })
        
        # Skip medium priority tasks if recent overruns
        if recent_load > 1.2:
            recommendations.update({
                "state_persistence": True,
                "extended_validation": True
            })
        
        # Emergency skipping for critical overruns
        if recent_load > 1.5:
            recommendations.update({
                "all_optional": True
            })
        
        return recommendations
    
    def update_quality_level(self):
        """Update quality level based on performance"""
        if len(self.load_history) < 10:
            return
        
        avg_load = sum(self.load_history) / len(self.load_history)
        
        if avg_load < 0.7:
            self.quality_level = min(1.0, self.quality_level + 0.01)
        elif avg_load > 1.1:
            self.quality_level = max(0.3, self.quality_level - 0.02)

class FrameLoop:
    """
    60Hz frame loop controller with adaptive performance management
    
    Maintains strict 16.67ms frame budget through:
    - Priority-based task scheduling
    - Real-time budget monitoring
    - Adaptive task skipping
    - Graceful degradation
    """
    
    TARGET_FPS = 60
    FRAME_BUDGET_MS = 16.67  # 1000ms / 60fps
    BUDGET_WARNING_THRESHOLD = 0.8  # 80% of budget
    
    def __init__(self):
        self.running = False
        self.frame_sequence = 0
        self.start_time = 0.0
        
        # Task management
        self.tasks: Dict[str, FrameTask] = {}
        self.task_order: List[str] = []
        
        # Performance tracking
        self.frame_metrics = deque(maxlen=300)  # 5 seconds of history
        self.adaptive_controller = AdaptiveController()
        
        # Timing control
        self.frame_timer = None
        self.last_frame_start = 0.0
        
        # Event callbacks
        self.frame_callbacks: List[Callable] = []
        self.overrun_callbacks: List[Callable] = []
        
        # Statistics
        self.stats = {
            "total_frames": 0,
            "overrun_frames": 0,
            "average_frame_time": 0.0,
            "frame_rate": 0.0,
            "tasks_skipped": 0
        }
        
        self._setup_default_tasks()
    
    def _setup_default_tasks(self):
        """Setup default frame tasks"""
        # Critical tasks (must complete)
        self.register_task("token_processing", TaskPriority.CRITICAL, 2.0, self._dummy_task)
        self.register_task("energy_calculation", TaskPriority.CRITICAL, 1.5, self._dummy_task)
        self.register_task("event_emission", TaskPriority.CRITICAL, 1.0, self._dummy_task)
        
        # High priority tasks
        self.register_task("state_update", TaskPriority.HIGH, 2.0, self._dummy_task)
        self.register_task("performance_metrics", TaskPriority.HIGH, 1.0, self._dummy_task)
        
        # Medium priority tasks
        self.register_task("pattern_analysis", TaskPriority.MEDIUM, 4.0, self._dummy_task)
        self.register_task("history_management", TaskPriority.MEDIUM, 1.5, self._dummy_task)
        
        # Low priority tasks
        self.register_task("detailed_logging", TaskPriority.LOW, 2.0, self._dummy_task)
        self.register_task("cleanup_tasks", TaskPriority.LOW, 1.0, self._dummy_task)
    
    def register_task(self, name: str, priority: TaskPriority, 
                     estimated_duration_ms: float, callback: Callable):
        """Register a frame task"""
        task = FrameTask(name, priority, estimated_duration_ms, callback)
        self.tasks[name] = task
        
        # Maintain priority order
        self._update_task_order()
        
        logger.info(f"Registered task '{name}' with priority {priority.name}")
    
    def _update_task_order(self):
        """Update task execution order based on priority"""
        self.task_order = sorted(
            self.tasks.keys(),
            key=lambda name: (self.tasks[name].priority.value, name)
        )
    
    def register_frame_callback(self, callback: Callable):
        """Register frame completion callback"""
        self.frame_callbacks.append(callback)
    
    def register_overrun_callback(self, callback: Callable):
        """Register frame overrun callback"""
        self.overrun_callbacks.append(callback)
    
    async def start(self):
        """Start the frame loop"""
        self.running = True
        self.start_time = time.time()
        self.last_frame_start = self.start_time
        
        logger.info(f"Frame loop starting - Target: {self.TARGET_FPS}Hz, Budget: {self.FRAME_BUDGET_MS:.2f}ms")
        
        while self.running:
            frame_start = time.time()
            
            try:
                await self._process_frame(frame_start)
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await self._handle_frame_error(e)
            
            # Calculate sleep time for next frame
            frame_duration = time.time() - frame_start
            sleep_time = max(0, (self.FRAME_BUDGET_MS / 1000) - frame_duration)
            
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
            
            self.last_frame_start = frame_start
    
    async def _process_frame(self, frame_start: float):
        """Process a single frame"""
        self.frame_sequence += 1
        frame_id = f"frame_{self.frame_sequence}_{int(frame_start * 1000)}"
        
        # Initialize frame metrics
        metrics = FrameMetrics(
            sequence=self.frame_sequence,
            start_time=frame_start,
            end_time=0.0,
            duration_ms=0.0,
            budget_ms=self.FRAME_BUDGET_MS,
            status=FrameStatus.PROCESSING,
            tasks_completed=[],
            tasks_skipped=[]
        )
        
        # Get adaptive recommendations
        skip_recommendations = self.adaptive_controller.get_skip_recommendations()
        
        # Process tasks in priority order
        for task_name in self.task_order:
            task = self.tasks[task_name]
            
            if not task.enabled:
                continue
            
            # Check if we should skip this task
            if self._should_skip_task(task, skip_recommendations, frame_start):
                metrics.tasks_skipped.append(task_name)
                task.skip_count += 1
                self.stats["tasks_skipped"] += 1
                continue
            
            # Execute task with timeout protection
            try:
                await self._execute_task_with_timeout(task, frame_start)
                metrics.tasks_completed.append(task_name)
            except asyncio.TimeoutError:
                logger.warning(f"Task '{task_name}' timed out")
                metrics.tasks_skipped.append(task_name)
                break
            except Exception as e:
                logger.error(f"Task '{task_name}' failed: {e}")
                if task.priority == TaskPriority.CRITICAL:
                    metrics.status = FrameStatus.ERROR
                    break
        
        # Finalize frame metrics
        frame_end = time.time()
        metrics.end_time = frame_end
        metrics.duration_ms = (frame_end - frame_start) * 1000
        
        if metrics.duration_ms > self.FRAME_BUDGET_MS:
            metrics.status = FrameStatus.OVERRUN
            metrics.overrun_ms = metrics.duration_ms - self.FRAME_BUDGET_MS
            self.stats["overrun_frames"] += 1
            
            # Notify overrun callbacks
            for callback in self.overrun_callbacks:
                try:
                    await self._safe_callback(callback, metrics)
                except Exception as e:
                    logger.error(f"Overrun callback error: {e}")
        else:
            metrics.status = FrameStatus.COMPLETED
        
        # Update statistics and adaptive controller
        self._update_statistics(metrics)
        self.adaptive_controller.update_load(metrics.duration_ms, self.FRAME_BUDGET_MS)
        self.adaptive_controller.update_quality_level()
        
        # Store metrics
        self.frame_metrics.append(metrics)
        
        # Notify frame callbacks
        for callback in self.frame_callbacks:
            try:
                await self._safe_callback(callback, metrics)
            except Exception as e:
                logger.error(f"Frame callback error: {e}")
    
    def _should_skip_task(self, task: FrameTask, skip_recommendations: Dict[str, bool], 
                         frame_start: float) -> bool:
        """Determine if a task should be skipped"""
        # Never skip critical tasks
        if task.priority == TaskPriority.CRITICAL:
            return False
        
        # Check elapsed time vs remaining budget
        elapsed_ms = (time.time() - frame_start) * 1000
        remaining_budget = self.FRAME_BUDGET_MS - elapsed_ms
        
        # Skip if not enough budget for estimated duration
        if remaining_budget < task.estimated_duration_ms:
            return True
        
        # Check adaptive recommendations
        if skip_recommendations.get("all_optional", False):
            return task.priority != TaskPriority.CRITICAL
        
        if skip_recommendations.get(task.name, False):
            return True
        
        # Skip low priority tasks if we're at warning threshold
        if (elapsed_ms > self.FRAME_BUDGET_MS * self.BUDGET_WARNING_THRESHOLD and 
            task.priority == TaskPriority.LOW):
            return True
        
        return False
    
    async def _execute_task_with_timeout(self, task: FrameTask, frame_start: float):
        """Execute task with timeout protection"""
        # Calculate remaining budget
        elapsed_ms = (time.time() - frame_start) * 1000
        remaining_budget_s = max(0.001, (self.FRAME_BUDGET_MS - elapsed_ms) / 1000)
        
        # Execute with timeout
        try:
            await asyncio.wait_for(
                self._safe_task_execution(task),
                timeout=remaining_budget_s
            )
        except asyncio.TimeoutError:
            logger.warning(f"Task '{task.name}' exceeded budget")
            raise
    
    async def _safe_task_execution(self, task: FrameTask):
        """Safely execute a task callback"""
        try:
            if asyncio.iscoroutinefunction(task.callback):
                await task.callback()
            else:
                # Run synchronous callback in thread pool
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, task.callback)
        except Exception as e:
            logger.error(f"Task '{task.name}' execution error: {e}")
            raise
    
    async def _safe_callback(self, callback: Callable, *args):
        """Safely execute a callback"""
        if asyncio.iscoroutinefunction(callback):
            await callback(*args)
        else:
            callback(*args)
    
    def _update_statistics(self, metrics: FrameMetrics):
        """Update frame loop statistics"""
        self.stats["total_frames"] += 1
        
        # Calculate rolling averages
        if len(self.frame_metrics) > 0:
            recent_durations = [m.duration_ms for m in list(self.frame_metrics)[-60:]]
            self.stats["average_frame_time"] = sum(recent_durations) / len(recent_durations)
            
            if self.stats["average_frame_time"] > 0:
                self.stats["frame_rate"] = 1000.0 / self.stats["average_frame_time"]
    
    async def _handle_frame_error(self, error: Exception):
        """Handle frame processing error"""
        logger.error(f"Frame error: {error}")
        
        # Create error metrics
        error_metrics = FrameMetrics(
            sequence=self.frame_sequence,
            start_time=time.time(),
            end_time=time.time(),
            duration_ms=0.0,
            budget_ms=self.FRAME_BUDGET_MS,
            status=FrameStatus.ERROR,
            tasks_completed=[],
            tasks_skipped=[]
        )
        
        self.frame_metrics.append(error_metrics)
    
    def _dummy_task(self):
        """Dummy task for testing"""
        time.sleep(0.001)  # 1ms simulation
    
    def stop(self):
        """Stop the frame loop"""
        self.running = False
        logger.info("Frame loop stopped")
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        if not self.frame_metrics:
            return {"error": "No frame data available"}
        
        recent_frames = list(self.frame_metrics)[-60:]  # Last second
        
        # Calculate percentiles
        durations = [f.duration_ms for f in recent_frames]
        durations.sort()
        
        def percentile(data, p):
            k = (len(data) - 1) * p / 100
            f = int(k)
            c = k - f
            if f == len(data) - 1:
                return data[f]
            return data[f] * (1 - c) + data[f + 1] * c
        
        overrun_count = sum(1 for f in recent_frames if f.status == FrameStatus.OVERRUN)
        
        return {
            "frame_rate": {
                "target": self.TARGET_FPS,
                "actual": self.stats["frame_rate"],
                "stability": 1.0 - (len([f for f in recent_frames if f.duration_ms > self.FRAME_BUDGET_MS]) / len(recent_frames))
            },
            "timing": {
                "budget_ms": self.FRAME_BUDGET_MS,
                "average_ms": self.stats["average_frame_time"],
                "p50_ms": percentile(durations, 50),
                "p95_ms": percentile(durations, 95),
                "p99_ms": percentile(durations, 99)
            },
            "overruns": {
                "total": self.stats["overrun_frames"],
                "recent": overrun_count,
                "percentage": (overrun_count / len(recent_frames)) * 100
            },
            "tasks": {
                "total_skipped": self.stats["tasks_skipped"],
                "skip_counts": {name: task.skip_count for name, task in self.tasks.items()}
            },
            "adaptive": {
                "quality_level": self.adaptive_controller.quality_level,
                "current_load": sum(self.adaptive_controller.load_history) / len(self.adaptive_controller.load_history) if self.adaptive_controller.load_history else 0
            }
        }
    
    def enable_task(self, task_name: str, enabled: bool = True):
        """Enable or disable a specific task"""
        if task_name in self.tasks:
            self.tasks[task_name].enabled = enabled
            logger.info(f"Task '{task_name}' {'enabled' if enabled else 'disabled'}")
    
    def update_task_duration(self, task_name: str, duration_ms: float):
        """Update estimated duration for a task"""
        if task_name in self.tasks:
            self.tasks[task_name].estimated_duration_ms = duration_ms
            logger.info(f"Task '{task_name}' duration updated to {duration_ms}ms")

# Example usage and testing
async def example_usage():
    """Example usage of the frame loop"""
    
    frame_loop = FrameLoop()
    
    # Custom task example
    async def custom_energy_task():
        """Custom energy calculation task"""
        await asyncio.sleep(0.002)  # Simulate 2ms work
        print("Energy calculated")
    
    # Register custom task
    frame_loop.register_task("custom_energy", TaskPriority.CRITICAL, 2.0, custom_energy_task)
    
    # Frame completion callback
    def on_frame_complete(metrics: FrameMetrics):
        if metrics.sequence % 60 == 0:  # Every second
            print(f"Frame {metrics.sequence}: {metrics.duration_ms:.2f}ms, "
                  f"Status: {metrics.status.value}")
    
    # Overrun callback
    def on_overrun(metrics: FrameMetrics):
        print(f"OVERRUN Frame {metrics.sequence}: {metrics.overrun_ms:.2f}ms over budget")
    
    frame_loop.register_frame_callback(on_frame_complete)
    frame_loop.register_overrun_callback(on_overrun)
    
    # Run for 5 seconds
    try:
        await asyncio.wait_for(frame_loop.start(), timeout=5.0)
    except asyncio.TimeoutError:
        frame_loop.stop()
        
        # Print performance report
        report = frame_loop.get_performance_report()
        print(f"\nPerformance Report:")
        print(f"Frame Rate: {report['frame_rate']['actual']:.1f} Hz")
        print(f"Average Frame Time: {report['timing']['average_ms']:.2f}ms")
        print(f"Overruns: {report['overruns']['percentage']:.1f}%")

if __name__ == "__main__":
    asyncio.run(example_usage())
