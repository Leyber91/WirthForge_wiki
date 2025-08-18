"""
WF-UX-006 Frame Timer Utility
High-precision frame timing measurement and budget enforcement for 60Hz performance
"""

import time
import threading
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass
from collections import deque
import statistics

@dataclass
class FrameMetrics:
    """Frame timing metrics"""
    frame_time: float  # Current frame time in seconds
    frame_time_ms: float  # Current frame time in milliseconds
    target_fps: int  # Target frame rate
    actual_fps: float  # Actual frame rate
    budget_exceeded: bool  # Whether frame exceeded budget
    overrun_ms: float  # How much over budget (if any)
    timestamp: float  # When the frame completed

class FrameTimer:
    """
    High-precision frame timer with budget enforcement
    Measures frame execution time and triggers callbacks for budget violations
    """
    
    FRAME_BUDGET_60FPS = 1.0 / 60.0  # 16.67ms in seconds
    FRAME_BUDGET_30FPS = 1.0 / 30.0  # 33.33ms in seconds
    
    def __init__(self, target_fps: int = 60, history_size: int = 120):
        """
        Initialize frame timer
        
        Args:
            target_fps: Target frame rate (60 or 30)
            history_size: Number of frames to keep in history
        """
        self.target_fps = target_fps
        self.frame_budget = 1.0 / target_fps
        self.history_size = history_size
        
        # Frame timing data
        self.frame_times: deque = deque(maxlen=history_size)
        self.frame_start_time: Optional[float] = None
        self.frame_count = 0
        self.total_time = 0.0
        
        # Statistics
        self.overrun_count = 0
        self.consecutive_overruns = 0
        self.max_consecutive_overruns = 0
        
        # Callbacks
        self.overrun_callback: Optional[Callable[[FrameMetrics], None]] = None
        self.metrics_callback: Optional[Callable[[FrameMetrics], None]] = None
        
        # Thread safety
        self._lock = threading.Lock()
        
    def start_frame(self) -> None:
        """Mark the start of a new frame"""
        with self._lock:
            self.frame_start_time = time.perf_counter()
    
    def end_frame(self) -> FrameMetrics:
        """
        Mark the end of a frame and calculate metrics
        
        Returns:
            FrameMetrics object with timing information
        """
        if self.frame_start_time is None:
            raise RuntimeError("start_frame() must be called before end_frame()")
        
        end_time = time.perf_counter()
        
        with self._lock:
            frame_time = end_time - self.frame_start_time
            frame_time_ms = frame_time * 1000.0
            
            # Update statistics
            self.frame_times.append(frame_time)
            self.frame_count += 1
            self.total_time += frame_time
            
            # Check budget
            budget_exceeded = frame_time > self.frame_budget
            overrun_ms = max(0, (frame_time - self.frame_budget) * 1000.0)
            
            if budget_exceeded:
                self.overrun_count += 1
                self.consecutive_overruns += 1
                self.max_consecutive_overruns = max(
                    self.max_consecutive_overruns, 
                    self.consecutive_overruns
                )
            else:
                self.consecutive_overruns = 0
            
            # Calculate actual FPS
            actual_fps = 1.0 / frame_time if frame_time > 0 else 0
            
            # Create metrics object
            metrics = FrameMetrics(
                frame_time=frame_time,
                frame_time_ms=frame_time_ms,
                target_fps=self.target_fps,
                actual_fps=actual_fps,
                budget_exceeded=budget_exceeded,
                overrun_ms=overrun_ms,
                timestamp=end_time
            )
            
            # Reset for next frame
            self.frame_start_time = None
            
            # Trigger callbacks
            if self.metrics_callback:
                self.metrics_callback(metrics)
            
            if budget_exceeded and self.overrun_callback:
                self.overrun_callback(metrics)
            
            return metrics
    
    def get_average_fps(self) -> float:
        """Get average FPS over the history window"""
        with self._lock:
            if not self.frame_times:
                return 0.0
            avg_frame_time = statistics.mean(self.frame_times)
            return 1.0 / avg_frame_time if avg_frame_time > 0 else 0.0
    
    def get_percentile_frame_time(self, percentile: float = 95.0) -> float:
        """Get percentile frame time in milliseconds"""
        with self._lock:
            if not self.frame_times:
                return 0.0
            frame_times_ms = [ft * 1000.0 for ft in self.frame_times]
            return statistics.quantiles(frame_times_ms, n=100)[int(percentile) - 1]
    
    def get_frame_statistics(self) -> Dict[str, Any]:
        """Get comprehensive frame timing statistics"""
        with self._lock:
            if not self.frame_times:
                return {
                    "frame_count": 0,
                    "average_fps": 0.0,
                    "average_frame_time_ms": 0.0,
                    "min_frame_time_ms": 0.0,
                    "max_frame_time_ms": 0.0,
                    "p95_frame_time_ms": 0.0,
                    "p99_frame_time_ms": 0.0,
                    "overrun_count": 0,
                    "overrun_percentage": 0.0,
                    "consecutive_overruns": 0,
                    "max_consecutive_overruns": 0
                }
            
            frame_times_ms = [ft * 1000.0 for ft in self.frame_times]
            
            return {
                "frame_count": self.frame_count,
                "average_fps": self.get_average_fps(),
                "average_frame_time_ms": statistics.mean(frame_times_ms),
                "min_frame_time_ms": min(frame_times_ms),
                "max_frame_time_ms": max(frame_times_ms),
                "p95_frame_time_ms": self.get_percentile_frame_time(95.0),
                "p99_frame_time_ms": self.get_percentile_frame_time(99.0),
                "overrun_count": self.overrun_count,
                "overrun_percentage": (self.overrun_count / self.frame_count) * 100.0,
                "consecutive_overruns": self.consecutive_overruns,
                "max_consecutive_overruns": self.max_consecutive_overruns
            }
    
    def set_target_fps(self, fps: int) -> None:
        """Change target frame rate"""
        with self._lock:
            self.target_fps = fps
            self.frame_budget = 1.0 / fps
    
    def set_overrun_callback(self, callback: Callable[[FrameMetrics], None]) -> None:
        """Set callback for frame budget overruns"""
        self.overrun_callback = callback
    
    def set_metrics_callback(self, callback: Callable[[FrameMetrics], None]) -> None:
        """Set callback for all frame metrics"""
        self.metrics_callback = callback
    
    def reset_statistics(self) -> None:
        """Reset all timing statistics"""
        with self._lock:
            self.frame_times.clear()
            self.frame_count = 0
            self.total_time = 0.0
            self.overrun_count = 0
            self.consecutive_overruns = 0
            self.max_consecutive_overruns = 0

class FrameTimerContext:
    """Context manager for automatic frame timing"""
    
    def __init__(self, timer: FrameTimer):
        self.timer = timer
        self.metrics: Optional[FrameMetrics] = None
    
    def __enter__(self) -> 'FrameTimerContext':
        self.timer.start_frame()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.metrics = self.timer.end_frame()

# Usage example and testing utilities
def create_performance_timer(target_fps: int = 60) -> FrameTimer:
    """Create a pre-configured performance timer"""
    timer = FrameTimer(target_fps=target_fps)
    
    def log_overrun(metrics: FrameMetrics):
        print(f"Frame overrun: {metrics.frame_time_ms:.2f}ms "
              f"(target: {1000.0/metrics.target_fps:.2f}ms, "
              f"overrun: {metrics.overrun_ms:.2f}ms)")
    
    timer.set_overrun_callback(log_overrun)
    return timer

def simulate_frame_work(duration_ms: float) -> None:
    """Simulate frame work for testing"""
    time.sleep(duration_ms / 1000.0)

# Example usage
if __name__ == "__main__":
    # Create timer for 60 FPS
    timer = create_performance_timer(60)
    
    # Simulate some frames
    for i in range(10):
        with FrameTimerContext(timer) as frame:
            # Simulate varying frame work
            work_time = 15.0 + (i % 3) * 5.0  # 15-25ms
            simulate_frame_work(work_time)
        
        print(f"Frame {i+1}: {frame.metrics.frame_time_ms:.2f}ms "
              f"({frame.metrics.actual_fps:.1f} FPS)")
    
    # Print statistics
    stats = timer.get_frame_statistics()
    print(f"\nFrame Statistics:")
    print(f"Average FPS: {stats['average_fps']:.1f}")
    print(f"Average frame time: {stats['average_frame_time_ms']:.2f}ms")
    print(f"P95 frame time: {stats['p95_frame_time_ms']:.2f}ms")
    print(f"Overruns: {stats['overrun_count']}/{stats['frame_count']} "
          f"({stats['overrun_percentage']:.1f}%)")
