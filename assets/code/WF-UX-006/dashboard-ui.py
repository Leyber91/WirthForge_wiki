"""
WF-UX-006 Dashboard UI
Real-time performance monitoring dashboard for WIRTHFORGE
"""

import tkinter as tk
from tkinter import ttk, messagebox
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure
import threading
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import json
import logging
from collections import deque

@dataclass
class DashboardConfig:
    """Dashboard configuration settings"""
    update_interval_ms: int = 1000
    history_length: int = 60
    chart_colors: Dict[str, str] = None
    
    def __post_init__(self):
        if self.chart_colors is None:
            self.chart_colors = {
                "cpu": "#FF6B6B",
                "memory": "#4ECDC4", 
                "gpu": "#45B7D1",
                "battery": "#96CEB4",
                "frame_time": "#FFEAA7"
            }

class PerformanceDashboard:
    """Real-time performance monitoring dashboard"""
    
    def __init__(self, config: Optional[DashboardConfig] = None):
        self.config = config or DashboardConfig()
        
        # Performance components (injected)
        self.monitor = None
        self.adaptive_manager = None
        self.fallback_manager = None
        
        # UI components
        self.root = None
        self.notebook = None
        self.figure = None
        self.canvas = None
        self.axes = {}
        
        # Data storage
        self.metrics_history = deque(maxlen=self.config.history_length)
        self.time_history = deque(maxlen=self.config.history_length)
        
        # UI state
        self.is_running = False
        self.update_thread = None
        self.paused = False
        
        # Status variables
        self.status_vars = {}
        self.alert_listbox = None
        self.quality_var = None
        self.fallback_var = None
        
        self.logger = logging.getLogger(__name__)
    
    def initialize_components(self, monitor, adaptive_manager, fallback_manager):
        """Initialize performance monitoring components"""
        self.monitor = monitor
        self.adaptive_manager = adaptive_manager
        self.fallback_manager = fallback_manager
        
        # Set up callbacks
        if self.monitor:
            self.monitor.add_alert_callback(self._on_alert)
        if self.adaptive_manager:
            self.adaptive_manager.add_adaptation_callback(self._on_adaptation)
        if self.fallback_manager:
            self.fallback_manager.add_activation_callback(self._on_fallback_activation)
    
    def create_ui(self):
        """Create the dashboard UI"""
        self.root = tk.Tk()
        self.root.title("WIRTHFORGE Performance Dashboard")
        self.root.geometry("1200x800")
        self.root.configure(bg="#2C3E50")
        
        # Create main notebook
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Create tabs
        self._create_overview_tab()
        self._create_charts_tab()
        self._create_controls_tab()
        
        # Initialize status variables
        self._initialize_status_vars()
        
        self.root.protocol("WM_DELETE_WINDOW", self._on_closing)
    
    def _create_overview_tab(self):
        """Create overview tab with key metrics"""
        overview_frame = ttk.Frame(self.notebook)
        self.notebook.add(overview_frame, text="Overview")
        
        # System status section
        status_group = ttk.LabelFrame(overview_frame, text="System Status", padding=10)
        status_group.pack(fill=tk.X, padx=10, pady=5)
        
        # Create status grid
        status_grid = ttk.Frame(status_group)
        status_grid.pack(fill=tk.X)
        
        # Status labels and values
        labels = [
            ("CPU Usage:", "cpu", 0, 0),
            ("Memory Usage:", "memory", 0, 2),
            ("GPU Usage:", "gpu", 1, 0),
            ("Battery:", "battery", 1, 2),
            ("Frame Time:", "frame_time", 2, 0),
            ("FPS:", "fps", 2, 2)
        ]
        
        for label_text, var_key, row, col in labels:
            ttk.Label(status_grid, text=label_text, font=("Arial", 10, "bold")).grid(
                row=row, column=col, sticky=tk.W, padx=5)
            self.status_vars[var_key] = tk.StringVar(value="N/A")
            ttk.Label(status_grid, textvariable=self.status_vars[var_key]).grid(
                row=row, column=col+1, sticky=tk.W, padx=5)
        
        # Quality management section
        quality_group = ttk.LabelFrame(overview_frame, text="Quality Management", padding=10)
        quality_group.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(quality_group, text="Current Quality:", font=("Arial", 10, "bold")).pack(side=tk.LEFT, padx=5)
        self.quality_var = tk.StringVar(value="STANDARD")
        ttk.Label(quality_group, textvariable=self.quality_var).pack(side=tk.LEFT, padx=5)
        
        # Quality controls
        quality_controls = ttk.Frame(quality_group)
        quality_controls.pack(side=tk.RIGHT, padx=10)
        
        quality_buttons = ["Emergency", "Low", "Standard", "High"]
        for i, btn_text in enumerate(quality_buttons):
            ttk.Button(quality_controls, text=btn_text, 
                      command=lambda level=i: self._set_quality(level)).pack(side=tk.LEFT, padx=2)
        
        # Fallback status section
        fallback_group = ttk.LabelFrame(overview_frame, text="Fallback Status", padding=10)
        fallback_group.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(fallback_group, text="Active Scenarios:", font=("Arial", 10, "bold")).pack(side=tk.LEFT, padx=5)
        self.fallback_var = tk.StringVar(value="None")
        ttk.Label(fallback_group, textvariable=self.fallback_var).pack(side=tk.LEFT, padx=5)
        
        # Recent alerts section
        alerts_group = ttk.LabelFrame(overview_frame, text="Recent Alerts", padding=10)
        alerts_group.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        alert_frame = ttk.Frame(alerts_group)
        alert_frame.pack(fill=tk.BOTH, expand=True)
        
        self.alert_listbox = tk.Listbox(alert_frame, height=8, font=("Consolas", 9))
        scrollbar = ttk.Scrollbar(alert_frame, orient=tk.VERTICAL, command=self.alert_listbox.yview)
        self.alert_listbox.configure(yscrollcommand=scrollbar.set)
        
        self.alert_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
    
    def _create_charts_tab(self):
        """Create charts tab with performance graphs"""
        charts_frame = ttk.Frame(self.notebook)
        self.notebook.add(charts_frame, text="Performance Charts")
        
        # Create matplotlib figure
        self.figure = Figure(figsize=(12, 8), facecolor="#2C3E50")
        self.canvas = FigureCanvasTkAgg(self.figure, charts_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Create subplots
        self.axes["system"] = self.figure.add_subplot(2, 2, 1)
        self.axes["performance"] = self.figure.add_subplot(2, 2, 2)
        self.axes["quality"] = self.figure.add_subplot(2, 2, 3)
        self.axes["alerts"] = self.figure.add_subplot(2, 2, 4)
        
        # Configure subplot appearance
        for ax in self.axes.values():
            ax.set_facecolor("#34495E")
            ax.tick_params(colors="white")
            for spine in ax.spines.values():
                spine.set_color("white")
        
        self.figure.tight_layout()
    
    def _create_controls_tab(self):
        """Create controls tab"""
        controls_frame = ttk.Frame(self.notebook)
        self.notebook.add(controls_frame, text="Controls")
        
        # Monitoring controls
        monitor_group = ttk.LabelFrame(controls_frame, text="Monitoring Controls", padding=10)
        monitor_group.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(monitor_group, text="Start Monitoring", command=self._start_monitoring).pack(side=tk.LEFT, padx=5)
        ttk.Button(monitor_group, text="Stop Monitoring", command=self._stop_monitoring).pack(side=tk.LEFT, padx=5)
        ttk.Button(monitor_group, text="Pause/Resume", command=self._toggle_pause).pack(side=tk.LEFT, padx=5)
        
        # Export controls
        export_group = ttk.LabelFrame(controls_frame, text="Data Export", padding=10)
        export_group.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(export_group, text="Export Metrics", command=self._export_metrics).pack(side=tk.LEFT, padx=5)
        ttk.Button(export_group, text="Generate Report", command=self._generate_report).pack(side=tk.LEFT, padx=5)
    
    def _initialize_status_vars(self):
        """Initialize status variables"""
        for key in ["cpu", "memory", "gpu", "battery", "frame_time", "fps"]:
            if key not in self.status_vars:
                self.status_vars[key] = tk.StringVar(value="N/A")
    
    def start_dashboard(self):
        """Start the dashboard"""
        if not self.root:
            self.create_ui()
        
        self.is_running = True
        self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
        self.update_thread.start()
        
        if self.monitor:
            self.monitor.start_monitoring()
        
        self.logger.info("Performance dashboard started")
        self.root.mainloop()
    
    def stop_dashboard(self):
        """Stop the dashboard"""
        self.is_running = False
        if self.monitor:
            self.monitor.stop_monitoring()
        self.logger.info("Performance dashboard stopped")
    
    def _update_loop(self):
        """Main update loop"""
        while self.is_running:
            try:
                if not self.paused and self.monitor:
                    self._update_data()
                    self._schedule_ui_update()
                time.sleep(self.config.update_interval_ms / 1000.0)
            except Exception as e:
                self.logger.error(f"Update loop error: {e}")
                time.sleep(1.0)
    
    def _update_data(self):
        """Update dashboard data"""
        current_time = time.time()
        metrics = self.monitor.get_current_metrics()
        if metrics:
            self.metrics_history.append(metrics)
            self.time_history.append(current_time)
    
    def _schedule_ui_update(self):
        """Schedule UI update on main thread"""
        if self.root:
            self.root.after(0, self._update_ui)
    
    def _update_ui(self):
        """Update UI components"""
        try:
            if not self.metrics_history:
                return
            
            latest_metrics = self.metrics_history[-1]
            
            # Update status variables
            self.status_vars["cpu"].set(f"{latest_metrics.cpu_percent:.1f}%")
            self.status_vars["memory"].set(f"{latest_metrics.memory_percent:.1f}%")
            
            if latest_metrics.gpu_percent is not None:
                self.status_vars["gpu"].set(f"{latest_metrics.gpu_percent:.1f}%")
            
            if latest_metrics.battery_percent is not None:
                battery_status = f"{latest_metrics.battery_percent:.0f}%"
                if latest_metrics.battery_plugged:
                    battery_status += " (Plugged)"
                self.status_vars["battery"].set(battery_status)
            
            # Update quality status
            if self.adaptive_manager:
                current_quality = self.adaptive_manager.get_current_quality()
                self.quality_var.set(current_quality.name)
            
            # Update fallback status
            if self.fallback_manager:
                status = self.fallback_manager.get_status()
                active_scenarios = status.get("active_scenarios", [])
                if active_scenarios:
                    self.fallback_var.set(", ".join(active_scenarios))
                else:
                    self.fallback_var.set("None")
            
            self._update_charts()
            self._update_alert_list()
            
        except Exception as e:
            self.logger.error(f"UI update error: {e}")
    
    def _update_charts(self):
        """Update performance charts"""
        if not self.metrics_history or not self.figure:
            return
        
        try:
            times = list(self.time_history)
            cpu_data = [m.cpu_percent for m in self.metrics_history]
            memory_data = [m.memory_percent for m in self.metrics_history]
            
            # Update system metrics chart
            self.axes["system"].clear()
            self.axes["system"].plot(times, cpu_data, color=self.config.chart_colors["cpu"], 
                                   label="CPU", linewidth=2)
            self.axes["system"].plot(times, memory_data, color=self.config.chart_colors["memory"], 
                                   label="Memory", linewidth=2)
            self.axes["system"].set_title("System Metrics", color="white")
            self.axes["system"].set_ylabel("Usage (%)", color="white")
            self.axes["system"].legend()
            self.axes["system"].grid(True, alpha=0.3)
            
            self.canvas.draw()
            
        except Exception as e:
            self.logger.error(f"Chart update error: {e}")
    
    def _update_alert_list(self):
        """Update alert list"""
        if not self.alert_listbox or not self.monitor:
            return
        
        try:
            self.alert_listbox.delete(0, tk.END)
            recent_alerts = self.monitor.get_alert_history()[-10:]
            
            for alert in reversed(recent_alerts):
                alert_time = time.strftime("%H:%M:%S", time.localtime(alert.timestamp))
                alert_text = f"[{alert_time}] {alert.level.value.upper()}: {alert.message}"
                self.alert_listbox.insert(0, alert_text)
            
        except Exception as e:
            self.logger.error(f"Alert list update error: {e}")
    
    def _on_alert(self, alert):
        """Handle new performance alert"""
        self.logger.info(f"Alert: {alert.message}")
    
    def _on_adaptation(self, event):
        """Handle quality adaptation event"""
        self.logger.info(f"Quality adapted: {event.previous_level.name} → {event.new_level.name}")
    
    def _on_fallback_activation(self, scenario):
        """Handle fallback scenario activation"""
        self.logger.info(f"Fallback scenario activated: {scenario.name}")
    
    def _set_quality(self, level):
        """Set quality level"""
        if self.adaptive_manager:
            quality_levels = [0, 1, 2, 3]  # Emergency, Low, Standard, High
            # Would map to actual QualityLevel enum
            self.logger.info(f"Quality level set to: {level}")
    
    def _start_monitoring(self):
        """Start monitoring"""
        if self.monitor:
            self.monitor.start_monitoring()
            messagebox.showinfo("Monitoring", "Performance monitoring started")
    
    def _stop_monitoring(self):
        """Stop monitoring"""
        if self.monitor:
            self.monitor.stop_monitoring()
            messagebox.showinfo("Monitoring", "Performance monitoring stopped")
    
    def _toggle_pause(self):
        """Toggle pause state"""
        self.paused = not self.paused
        status = "paused" if self.paused else "resumed"
        messagebox.showinfo("Dashboard", f"Dashboard {status}")
    
    def _export_metrics(self):
        """Export metrics"""
        try:
            if self.monitor:
                filename = f"metrics_export_{int(time.time())}.json"
                export_data = self.monitor.export_metrics()
                with open(filename, 'w') as f:
                    f.write(export_data)
                messagebox.showinfo("Export", f"Metrics exported to {filename}")
        except Exception as e:
            messagebox.showerror("Export Error", f"Failed to export: {e}")
    
    def _generate_report(self):
        """Generate performance report"""
        try:
            report_data = {
                "timestamp": time.time(),
                "metrics_count": len(self.metrics_history),
                "current_quality": self.quality_var.get() if self.quality_var else "Unknown",
                "active_scenarios": self.fallback_var.get() if self.fallback_var else "None"
            }
            
            filename = f"performance_report_{int(time.time())}.json"
            with open(filename, 'w') as f:
                json.dump(report_data, f, indent=2)
            
            messagebox.showinfo("Report", f"Report generated: {filename}")
        except Exception as e:
            messagebox.showerror("Report Error", f"Failed to generate report: {e}")
    
    def _on_closing(self):
        """Handle window close"""
        self.stop_dashboard()
        if self.root:
            self.root.destroy()

# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Create dashboard
    dashboard = PerformanceDashboard()
    
    # Would normally inject actual monitoring components here
    print("Performance Dashboard - would need actual monitoring components to run")
    
    # dashboard.start_dashboard()
