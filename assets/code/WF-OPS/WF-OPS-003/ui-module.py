#!/usr/bin/env python3
"""
WF-OPS-003 UI Module
Responsive user interface for backup and recovery operations with 60Hz frame budget compliance.
Provides real-time progress updates, energy-aware visualizations, and local-first controls.
"""

import os
import json
import time
import threading
import asyncio
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import queue

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UIState:
    """Current UI state"""
    current_operation: str = "idle"
    progress_percentage: float = 0.0
    status_message: str = "Ready"
    energy_level: str = "optimal"
    frame_budget_status: str = "within_budget"
    last_update: str = ""

@dataclass
class ProgressUpdate:
    """Progress update for UI"""
    operation_id: str
    operation_type: str
    percentage: float
    current_item: str
    items_processed: int
    total_items: int
    bytes_processed: int
    total_bytes: int
    estimated_remaining: float
    performance_metrics: Dict[str, float]

class FrameBudgetMonitor:
    """Monitor and enforce 60Hz frame budget"""
    def __init__(self, target_fps: float = 60.0):
        self.target_fps = target_fps
        self.frame_budget_ms = 1000.0 / target_fps
        self.frame_start_time = None
        self.frame_times = []
        self.max_frame_history = 60
        
    def start_frame(self):
        """Start timing current frame"""
        self.frame_start_time = time.perf_counter()
        
    def end_frame(self):
        """End frame timing and record performance"""
        if self.frame_start_time is None:
            return
            
        frame_time = (time.perf_counter() - self.frame_start_time) * 1000
        self.frame_times.append(frame_time)
        
        # Keep only recent frame times
        if len(self.frame_times) > self.max_frame_history:
            self.frame_times.pop(0)
            
    def get_frame_stats(self) -> Dict[str, float]:
        """Get frame timing statistics"""
        if not self.frame_times:
            return {}
            
        return {
            'current_fps': 1000.0 / self.frame_times[-1] if self.frame_times[-1] > 0 else 0,
            'average_fps': 1000.0 / (sum(self.frame_times) / len(self.frame_times)),
            'min_fps': 1000.0 / max(self.frame_times),
            'max_fps': 1000.0 / min(self.frame_times),
            'frame_budget_utilization': (sum(self.frame_times) / len(self.frame_times)) / self.frame_budget_ms
        }
        
    def is_within_budget(self) -> bool:
        """Check if current frame is within budget"""
        if not self.frame_times:
            return True
        return self.frame_times[-1] <= self.frame_budget_ms

class EnergyAwareVisualizer:
    """Energy-aware progress visualizations"""
    
    def __init__(self, canvas: tk.Canvas):
        self.canvas = canvas
        self.particles = []
        self.ribbons = []
        self.energy_level = "optimal"
        
    def update_energy_level(self, level: str):
        """Update energy level for visualization intensity"""
        self.energy_level = level
        
    def draw_progress_ribbon(self, progress: float, color: str = "#4CAF50"):
        """Draw animated progress ribbon"""
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        if canvas_width <= 1 or canvas_height <= 1:
            return
            
        # Clear previous ribbon
        self.canvas.delete("progress_ribbon")
        
        # Draw background
        self.canvas.create_rectangle(
            10, canvas_height - 30, canvas_width - 10, canvas_height - 10,
            fill="#E0E0E0", outline="", tags="progress_ribbon"
        )
        
        # Draw progress
        progress_width = (canvas_width - 20) * (progress / 100.0)
        if progress_width > 0:
            self.canvas.create_rectangle(
                10, canvas_height - 30, 10 + progress_width, canvas_height - 10,
                fill=color, outline="", tags="progress_ribbon"
            )
            
        # Add progress text
        self.canvas.create_text(
            canvas_width // 2, canvas_height - 20,
            text=f"{progress:.1f}%", fill="black",
            tags="progress_ribbon"
        )
        
    def draw_energy_particles(self, count: int):
        """Draw energy-aware particles based on system load"""
        # Adjust particle count based on energy level
        if self.energy_level == "low":
            count = max(1, count // 4)
        elif self.energy_level == "medium":
            count = max(1, count // 2)
            
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        if canvas_width <= 1 or canvas_height <= 1:
            return
            
        # Clear previous particles
        self.canvas.delete("energy_particles")
        
        # Draw particles
        import random
        for i in range(count):
            x = random.randint(10, canvas_width - 10)
            y = random.randint(10, canvas_height - 50)
            size = random.randint(2, 6)
            
            color = "#4CAF50" if self.energy_level == "optimal" else "#FFC107"
            
            self.canvas.create_oval(
                x - size, y - size, x + size, y + size,
                fill=color, outline="", tags="energy_particles"
            )

class BackupRecoveryUI:
    """Main UI for backup and recovery operations"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("WF-OPS-003 Backup & Recovery")
        self.root.geometry("800x600")
        
        self.ui_state = UIState()
        self.frame_monitor = FrameBudgetMonitor()
        self.update_queue = queue.Queue()
        
        self._setup_ui()
        self._start_update_loop()
        
    def _setup_ui(self):
        """Setup main UI components"""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="WF-OPS-003 Backup & Recovery", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # Status section
        status_frame = ttk.LabelFrame(main_frame, text="System Status", padding="10")
        status_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        status_frame.columnconfigure(1, weight=1)
        
        ttk.Label(status_frame, text="Status:").grid(row=0, column=0, sticky=tk.W)
        self.status_label = ttk.Label(status_frame, text="Ready")
        self.status_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(status_frame, text="Energy Level:").grid(row=1, column=0, sticky=tk.W)
        self.energy_label = ttk.Label(status_frame, text="Optimal")
        self.energy_label.grid(row=1, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(status_frame, text="Frame Budget:").grid(row=2, column=0, sticky=tk.W)
        self.frame_budget_label = ttk.Label(status_frame, text="Within Budget")
        self.frame_budget_label.grid(row=2, column=1, sticky=tk.W, padx=(10, 0))
        
        # Operations section
        ops_frame = ttk.LabelFrame(main_frame, text="Operations", padding="10")
        ops_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Backup controls
        backup_frame = ttk.Frame(ops_frame)
        backup_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 10))
        
        ttk.Button(backup_frame, text="Create Backup", 
                  command=self._start_backup).grid(row=0, column=0, pady=2)
        ttk.Button(backup_frame, text="Schedule Backup", 
                  command=self._schedule_backup).grid(row=1, column=0, pady=2)
        ttk.Button(backup_frame, text="Verify Integrity", 
                  command=self._verify_integrity).grid(row=2, column=0, pady=2)
        
        # Recovery controls
        recovery_frame = ttk.Frame(ops_frame)
        recovery_frame.grid(row=0, column=1, sticky=(tk.W, tk.E))
        
        ttk.Button(recovery_frame, text="Browse Backups", 
                  command=self._browse_backups).grid(row=0, column=0, pady=2)
        ttk.Button(recovery_frame, text="Start Recovery", 
                  command=self._start_recovery).grid(row=1, column=0, pady=2)
        ttk.Button(recovery_frame, text="Emergency Recovery", 
                  command=self._emergency_recovery).grid(row=2, column=0, pady=2)
        
        # Progress section
        progress_frame = ttk.LabelFrame(main_frame, text="Progress", padding="10")
        progress_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        progress_frame.columnconfigure(0, weight=1)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, 
                                          maximum=100)
        self.progress_bar.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        # Progress details
        self.progress_details = ttk.Label(progress_frame, text="No operation in progress")
        self.progress_details.grid(row=1, column=0, sticky=tk.W)
        
        # Visualization canvas
        viz_frame = ttk.LabelFrame(main_frame, text="Energy-Aware Visualization", padding="10")
        viz_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        viz_frame.columnconfigure(0, weight=1)
        viz_frame.rowconfigure(0, weight=1)
        
        self.viz_canvas = tk.Canvas(viz_frame, height=150, bg="white")
        self.viz_canvas.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        self.visualizer = EnergyAwareVisualizer(self.viz_canvas)
        
        # Log section
        log_frame = ttk.LabelFrame(main_frame, text="Activity Log", padding="10")
        log_frame.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        # Log text with scrollbar
        log_text_frame = ttk.Frame(log_frame)
        log_text_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_text_frame.columnconfigure(0, weight=1)
        log_text_frame.rowconfigure(0, weight=1)
        
        self.log_text = tk.Text(log_text_frame, height=8, state=tk.DISABLED)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        log_scrollbar = ttk.Scrollbar(log_text_frame, orient=tk.VERTICAL, 
                                     command=self.log_text.yview)
        log_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.log_text.configure(yscrollcommand=log_scrollbar.set)
        
        # Configure main grid weights
        main_frame.rowconfigure(4, weight=1)
        main_frame.rowconfigure(5, weight=1)
        
    def _start_update_loop(self):
        """Start the UI update loop"""
        self._update_ui()
        self.root.after(16, self._start_update_loop)  # ~60 FPS
        
    def _update_ui(self):
        """Update UI with frame budget monitoring"""
        self.frame_monitor.start_frame()
        
        # Process queued updates
        try:
            while True:
                update = self.update_queue.get_nowait()
                self._process_update(update)
        except queue.Empty:
            pass
            
        # Update status labels
        self.status_label.config(text=self.ui_state.status_message)
        self.energy_label.config(text=self.ui_state.energy_level.title())
        
        # Update frame budget status
        frame_stats = self.frame_monitor.get_frame_stats()
        if frame_stats:
            budget_status = "Within Budget" if self.frame_monitor.is_within_budget() else "Over Budget"
            fps_text = f"{budget_status} ({frame_stats.get('current_fps', 0):.1f} FPS)"
            self.frame_budget_label.config(text=fps_text)
            
        # Update progress bar
        self.progress_var.set(self.ui_state.progress_percentage)
        
        # Update visualizations
        self.visualizer.update_energy_level(self.ui_state.energy_level)
        self.visualizer.draw_progress_ribbon(self.ui_state.progress_percentage)
        
        # Draw energy particles based on current operation
        particle_count = 5 if self.ui_state.current_operation != "idle" else 2
        self.visualizer.draw_energy_particles(particle_count)
        
        self.frame_monitor.end_frame()
        
    def _process_update(self, update: Dict[str, Any]):
        """Process UI update from background operations"""
        if update['type'] == 'progress':
            progress_data = update['data']
            self.ui_state.progress_percentage = progress_data.get('percentage', 0)
            self.ui_state.current_operation = progress_data.get('operation_type', 'unknown')
            
            details = f"Processing: {progress_data.get('current_item', 'N/A')} "
            details += f"({progress_data.get('items_processed', 0)}/{progress_data.get('total_items', 0)})"
            self.progress_details.config(text=details)
            
        elif update['type'] == 'status':
            self.ui_state.status_message = update['message']
            
        elif update['type'] == 'energy':
            self.ui_state.energy_level = update['level']
            
        elif update['type'] == 'log':
            self._add_log_entry(update['message'])
            
    def _add_log_entry(self, message: str):
        """Add entry to activity log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
        
    def _start_backup(self):
        """Start backup operation"""
        source_dir = filedialog.askdirectory(title="Select Directory to Backup")
        if source_dir:
            self._add_log_entry(f"Starting backup of {source_dir}")
            self.ui_state.current_operation = "backup"
            self.ui_state.status_message = "Backup in progress..."
            
            # Simulate backup progress
            threading.Thread(target=self._simulate_backup_progress, 
                           args=(source_dir,), daemon=True).start()
            
    def _schedule_backup(self):
        """Schedule backup operation"""
        self._add_log_entry("Opening backup scheduler...")
        messagebox.showinfo("Schedule Backup", 
                          "Backup scheduler would open here.\nIntegration with WF-OPS-002 monitoring.")
        
    def _verify_integrity(self):
        """Start integrity verification"""
        backup_dir = filedialog.askdirectory(title="Select Backup Directory to Verify")
        if backup_dir:
            self._add_log_entry(f"Starting integrity verification of {backup_dir}")
            self.ui_state.current_operation = "verify"
            self.ui_state.status_message = "Verifying integrity..."
            
            threading.Thread(target=self._simulate_verify_progress, 
                           args=(backup_dir,), daemon=True).start()
            
    def _browse_backups(self):
        """Browse available backups"""
        self._add_log_entry("Opening backup browser...")
        messagebox.showinfo("Browse Backups", 
                          "Backup browser would open here.\nShowing available backup manifests.")
        
    def _start_recovery(self):
        """Start recovery operation"""
        backup_file = filedialog.askopenfilename(
            title="Select Backup Manifest",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if backup_file:
            self._add_log_entry(f"Starting recovery from {backup_file}")
            self.ui_state.current_operation = "recovery"
            self.ui_state.status_message = "Recovery in progress..."
            
            threading.Thread(target=self._simulate_recovery_progress, 
                           args=(backup_file,), daemon=True).start()
            
    def _emergency_recovery(self):
        """Start emergency recovery"""
        result = messagebox.askyesno("Emergency Recovery", 
                                   "This will start emergency recovery mode.\n"
                                   "Continue?")
        if result:
            self._add_log_entry("Starting EMERGENCY RECOVERY mode")
            self.ui_state.current_operation = "emergency_recovery"
            self.ui_state.status_message = "EMERGENCY RECOVERY in progress..."
            self.ui_state.energy_level = "high"  # Override energy saving for emergency
            
    def _simulate_backup_progress(self, source_dir: str):
        """Simulate backup progress for demo"""
        total_steps = 100
        for i in range(total_steps + 1):
            progress_update = {
                'type': 'progress',
                'data': {
                    'percentage': i,
                    'operation_type': 'backup',
                    'current_item': f'file_{i:03d}.txt',
                    'items_processed': i,
                    'total_items': total_steps
                }
            }
            self.update_queue.put(progress_update)
            
            time.sleep(0.05)  # Simulate work
            
        self.update_queue.put({'type': 'status', 'message': 'Backup completed successfully'})
        self.update_queue.put({'type': 'log', 'message': f'Backup of {source_dir} completed'})
        self.ui_state.current_operation = "idle"
        
    def _simulate_verify_progress(self, backup_dir: str):
        """Simulate verification progress for demo"""
        total_steps = 50
        for i in range(total_steps + 1):
            progress_update = {
                'type': 'progress',
                'data': {
                    'percentage': i * 2,  # Scale to 100%
                    'operation_type': 'verify',
                    'current_item': f'verifying_file_{i:03d}.txt',
                    'items_processed': i,
                    'total_items': total_steps
                }
            }
            self.update_queue.put(progress_update)
            
            time.sleep(0.08)  # Simulate verification work
            
        self.update_queue.put({'type': 'status', 'message': 'Integrity verification completed'})
        self.update_queue.put({'type': 'log', 'message': f'Verification of {backup_dir} completed - all files verified'})
        self.ui_state.current_operation = "idle"
        
    def _simulate_recovery_progress(self, backup_file: str):
        """Simulate recovery progress for demo"""
        total_steps = 75
        for i in range(total_steps + 1):
            progress_update = {
                'type': 'progress',
                'data': {
                    'percentage': (i / total_steps) * 100,
                    'operation_type': 'recovery',
                    'current_item': f'restoring_file_{i:03d}.txt',
                    'items_processed': i,
                    'total_items': total_steps
                }
            }
            self.update_queue.put(progress_update)
            
            time.sleep(0.06)  # Simulate recovery work
            
        self.update_queue.put({'type': 'status', 'message': 'Recovery completed successfully'})
        self.update_queue.put({'type': 'log', 'message': f'Recovery from {backup_file} completed'})
        self.ui_state.current_operation = "idle"
        
    def run(self):
        """Start the UI application"""
        self._add_log_entry("WF-OPS-003 Backup & Recovery UI started")
        self._add_log_entry("Frame budget: 60 FPS (16.67ms per frame)")
        self._add_log_entry("Energy-aware visualizations enabled")
        self.root.mainloop()

def main():
    """Main entry point for UI module"""
    try:
        app = BackupRecoveryUI()
        app.run()
    except Exception as e:
        logger.error(f"UI application failed: {e}")
        print(f"Error starting UI: {e}")

if __name__ == "__main__":
    main()
