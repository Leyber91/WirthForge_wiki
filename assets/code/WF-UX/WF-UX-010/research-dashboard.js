/**
 * WF-UX-010 Research Dashboard Module
 * Real-time dashboard for monitoring research metrics and user feedback
 */

class ResearchDashboard {
    constructor(config = {}) {
        this.config = {
            refreshInterval: 5000, // 5 seconds
            maxDataPoints: 100,
            energyTheme: true,
            performanceBudget: 16.67, // 60Hz compliance
            ...config
        };
        
        this.dashboardContainer = null;
        this.widgets = new Map();
        this.dataStreams = new Map();
        this.isRendering = false;
        this.performanceMonitor = new DashboardPerformanceMonitor();
        
        this.initializeDashboard();
    }

    /**
     * Initialize the research dashboard
     */
    initializeDashboard() {
        this.createDashboardContainer();
        this.setupEventListeners();
        this.initializeWidgets();
        this.startDataStreaming();
        this.startRenderLoop();
    }

    /**
     * Create main dashboard container
     */
    createDashboardContainer() {
        this.dashboardContainer = document.createElement('div');
        this.dashboardContainer.id = 'wf-research-dashboard';
        this.dashboardContainer.className = 'research-dashboard energy-themed';
        
        // Apply energy-themed styling
        this.dashboardContainer.innerHTML = `
            <div class="dashboard-header">
                <h2 class="energy-title">
                    <span class="energy-icon">⚡</span>
                    Research Metrics Dashboard
                </h2>
                <div class="dashboard-controls">
                    <button id="refresh-dashboard" class="energy-button">Refresh</button>
                    <button id="export-data" class="energy-button">Export</button>
                    <button id="toggle-realtime" class="energy-button active">Real-time</button>
                </div>
            </div>
            <div class="dashboard-grid" id="dashboard-grid">
                <!-- Widgets will be inserted here -->
            </div>
            <div class="dashboard-footer">
                <div class="performance-indicator" id="performance-indicator">
                    <span class="fps-counter">60 FPS</span>
                    <span class="data-status">Live</span>
                </div>
            </div>
        `;
        
        // Append to document or specified container
        const targetContainer = document.getElementById('research-container') || document.body;
        targetContainer.appendChild(this.dashboardContainer);
    }

    /**
     * Setup event listeners for dashboard interactions
     */
    setupEventListeners() {
        // Dashboard controls
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.refreshAllWidgets();
        });

        document.getElementById('export-data')?.addEventListener('click', () => {
            this.exportDashboardData();
        });

        document.getElementById('toggle-realtime')?.addEventListener('click', (e) => {
            this.toggleRealTimeMode(e.target);
        });

        // Listen for analysis results
        document.addEventListener('analysis-complete', (event) => {
            this.updateWidgetsWithAnalysis(event.detail);
        });

        // Listen for feedback data
        document.addEventListener('feedback-batch-ready', (event) => {
            this.updateWidgetsWithFeedback(event.detail);
        });

        // Performance monitoring
        this.performanceMonitor.onPerformanceChange((metrics) => {
            this.updatePerformanceIndicator(metrics);
        });
    }

    /**
     * Initialize dashboard widgets
     */
    initializeWidgets() {
        const gridContainer = document.getElementById('dashboard-grid');
        
        // Energy Engagement Panel
        this.addWidget('energy-engagement', new EnergyEngagementWidget({
            title: 'Energy Engagement Metrics',
            position: { row: 1, col: 1, span: 2 }
        }), gridContainer);

        // Usability Metrics Panel
        this.addWidget('usability-metrics', new UsabilityMetricsWidget({
            title: 'Usability Insights',
            position: { row: 1, col: 3, span: 2 }
        }), gridContainer);

        // Performance Metrics Panel
        this.addWidget('performance-metrics', new PerformanceMetricsWidget({
            title: 'Performance Analysis',
            position: { row: 2, col: 1, span: 2 }
        }), gridContainer);

        // Research Participation Panel
        this.addWidget('research-participation', new ParticipationWidget({
            title: 'Research Participation',
            position: { row: 2, col: 3, span: 1 }
        }), gridContainer);

        // Privacy & Governance Panel
        this.addWidget('privacy-governance', new PrivacyGovernanceWidget({
            title: 'Privacy & Governance',
            position: { row: 2, col: 4, span: 1 }
        }), gridContainer);

        // Continuous Improvement Panel
        this.addWidget('improvements', new ImprovementWidget({
            title: 'Improvement Recommendations',
            position: { row: 3, col: 1, span: 4 }
        }), gridContainer);
    }

    /**
     * Add widget to dashboard
     */
    addWidget(id, widget, container) {
        const widgetElement = widget.createElement();
        widgetElement.style.gridRow = widget.config.position.row;
        widgetElement.style.gridColumn = `${widget.config.position.col} / span ${widget.config.position.span}`;
        
        container.appendChild(widgetElement);
        this.widgets.set(id, widget);
        
        // Initialize widget data stream
        this.dataStreams.set(id, {
            data: [],
            lastUpdate: Date.now(),
            updateCount: 0
        });
    }

    /**
     * Start data streaming for real-time updates
     */
    startDataStreaming() {
        this.dataStreamInterval = setInterval(() => {
            if (this.isRealTimeMode) {
                this.fetchLatestData();
            }
        }, this.config.refreshInterval);
    }

    /**
     * Start render loop with performance monitoring
     */
    startRenderLoop() {
        const render = (timestamp) => {
            if (this.isRendering) return;
            
            this.isRendering = true;
            const startTime = performance.now();
            
            try {
                this.updateAllWidgets();
                this.performanceMonitor.recordFrameTime(performance.now() - startTime);
            } catch (error) {
                console.error('Dashboard render error:', error);
            } finally {
                this.isRendering = false;
            }
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }

    /**
     * Fetch latest research data
     */
    async fetchLatestData() {
        try {
            const metricsAnalyzer = window.WirthForge?.metricsAnalyzer;
            if (!metricsAnalyzer) return;

            // Get recent analysis results
            const recentAnalysis = await metricsAnalyzer.getAnalysisResults({
                timeRange: {
                    start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
                    end: Date.now()
                }
            });

            // Update data streams
            this.updateDataStreams(recentAnalysis);
            
        } catch (error) {
            console.error('Failed to fetch latest data:', error);
        }
    }

    /**
     * Update data streams with new analysis
     */
    updateDataStreams(analysisResults) {
        analysisResults.forEach(result => {
            // Update energy engagement stream
            if (result.energyEngagement) {
                this.updateDataStream('energy-engagement', {
                    timestamp: result.timestamp,
                    data: result.energyEngagement
                });
            }

            // Update usability stream
            if (result.usabilityInsights) {
                this.updateDataStream('usability-metrics', {
                    timestamp: result.timestamp,
                    data: result.usabilityInsights
                });
            }

            // Update performance stream
            if (result.performanceImpact) {
                this.updateDataStream('performance-metrics', {
                    timestamp: result.timestamp,
                    data: result.performanceImpact
                });
            }
        });
    }

    /**
     * Update individual data stream
     */
    updateDataStream(streamId, dataPoint) {
        const stream = this.dataStreams.get(streamId);
        if (!stream) return;

        stream.data.push(dataPoint);
        stream.lastUpdate = Date.now();
        stream.updateCount++;

        // Maintain maximum data points
        if (stream.data.length > this.config.maxDataPoints) {
            stream.data.shift();
        }
    }

    /**
     * Update all widgets with current data
     */
    updateAllWidgets() {
        this.widgets.forEach((widget, id) => {
            const stream = this.dataStreams.get(id);
            if (stream && stream.data.length > 0) {
                widget.updateData(stream.data);
            }
        });
    }

    /**
     * Update widgets with new analysis results
     */
    updateWidgetsWithAnalysis(analysisDetail) {
        const { type, results } = analysisDetail;
        
        switch (type) {
            case 'feedback_batch':
                this.updateEnergyWidget(results.energyEngagement);
                this.updateUsabilityWidget(results.usabilityInsights);
                this.updatePerformanceWidget(results.performanceImpact);
                this.updateImprovementWidget(results.recommendations);
                break;
        }
    }

    /**
     * Update performance indicator
     */
    updatePerformanceIndicator(metrics) {
        const indicator = document.getElementById('performance-indicator');
        if (!indicator) return;

        const fpsCounter = indicator.querySelector('.fps-counter');
        const dataStatus = indicator.querySelector('.data-status');

        if (fpsCounter) {
            fpsCounter.textContent = `${Math.round(metrics.fps)} FPS`;
            fpsCounter.className = `fps-counter ${metrics.fps < 55 ? 'warning' : 'good'}`;
        }

        if (dataStatus) {
            dataStatus.textContent = this.isRealTimeMode ? 'Live' : 'Paused';
            dataStatus.className = `data-status ${this.isRealTimeMode ? 'active' : 'inactive'}`;
        }
    }

    /**
     * Toggle real-time mode
     */
    toggleRealTimeMode(button) {
        this.isRealTimeMode = !this.isRealTimeMode;
        button.classList.toggle('active', this.isRealTimeMode);
        button.textContent = this.isRealTimeMode ? 'Real-time' : 'Paused';
    }

    /**
     * Export dashboard data
     */
    async exportDashboardData() {
        try {
            const exportData = {
                timestamp: Date.now(),
                dashboardConfig: this.config,
                dataStreams: Object.fromEntries(this.dataStreams),
                widgets: Array.from(this.widgets.keys()),
                performanceMetrics: this.performanceMonitor.getMetrics()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wirthforge-research-data-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Failed to export dashboard data:', error);
        }
    }

    /**
     * Refresh all widgets
     */
    refreshAllWidgets() {
        this.fetchLatestData();
        this.widgets.forEach(widget => widget.refresh());
    }

    // Public API
    show() {
        if (this.dashboardContainer) {
            this.dashboardContainer.style.display = 'block';
        }
    }

    hide() {
        if (this.dashboardContainer) {
            this.dashboardContainer.style.display = 'none';
        }
    }

    destroy() {
        if (this.dataStreamInterval) {
            clearInterval(this.dataStreamInterval);
        }
        
        this.widgets.forEach(widget => widget.destroy());
        this.widgets.clear();
        this.dataStreams.clear();
        
        if (this.dashboardContainer) {
            this.dashboardContainer.remove();
        }
    }

    getDashboardStats() {
        return {
            widgetCount: this.widgets.size,
            dataStreamCount: this.dataStreams.size,
            isRealTime: this.isRealTimeMode,
            performanceMetrics: this.performanceMonitor.getMetrics()
        };
    }
}

/**
 * Base Widget Class
 */
class DashboardWidget {
    constructor(config) {
        this.config = {
            title: 'Widget',
            position: { row: 1, col: 1, span: 1 },
            refreshRate: 1000,
            ...config
        };
        
        this.element = null;
        this.data = [];
        this.lastUpdate = 0;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'dashboard-widget energy-widget';
        this.element.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${this.config.title}</h3>
                <div class="widget-controls">
                    <button class="widget-refresh">↻</button>
                </div>
            </div>
            <div class="widget-content" id="widget-content-${this.config.title.replace(/\s+/g, '-').toLowerCase()}">
                <!-- Widget content will be rendered here -->
            </div>
        `;

        this.setupWidgetEvents();
        return this.element;
    }

    setupWidgetEvents() {
        const refreshBtn = this.element.querySelector('.widget-refresh');
        refreshBtn?.addEventListener('click', () => this.refresh());
    }

    updateData(newData) {
        this.data = newData;
        this.lastUpdate = Date.now();
        this.render();
    }

    render() {
        // Override in subclasses
        const content = this.element.querySelector('.widget-content');
        if (content) {
            content.innerHTML = '<p>No data available</p>';
        }
    }

    refresh() {
        this.render();
    }

    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}

/**
 * Energy Engagement Widget
 */
class EnergyEngagementWidget extends DashboardWidget {
    render() {
        const content = this.element.querySelector('.widget-content');
        if (!content || this.data.length === 0) return;

        const latest = this.data[this.data.length - 1]?.data;
        if (!latest) return;

        content.innerHTML = `
            <div class="energy-metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${latest.totalInteractions || 0}</div>
                    <div class="metric-label">Total Interactions</div>
                    <div class="energy-spark">⚡</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(latest.averageEngagementScore * 100).toFixed(1)}%</div>
                    <div class="metric-label">Engagement Score</div>
                    <div class="energy-spark">🔥</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(latest.patternRecognitionRate * 100).toFixed(1)}%</div>
                    <div class="metric-label">Pattern Recognition</div>
                    <div class="energy-spark">🧠</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(latest.comprehensionScore * 100).toFixed(1)}%</div>
                    <div class="metric-label">Energy Truth Comprehension</div>
                    <div class="energy-spark">✨</div>
                </div>
            </div>
            <div class="preferred-visualizations">
                <h4>Preferred Visualizations</h4>
                <div class="visualization-list">
                    ${latest.preferredVisualizations?.map(pref => 
                        `<span class="viz-tag">${pref.preference} (${pref.count})</span>`
                    ).join('') || '<span class="no-data">No preferences recorded</span>'}
                </div>
            </div>
        `;
    }
}

/**
 * Performance Monitor for Dashboard
 */
class DashboardPerformanceMonitor {
    constructor() {
        this.frameTimes = [];
        this.fps = 60;
        this.callbacks = [];
    }

    recordFrameTime(time) {
        this.frameTimes.push(time);
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // Calculate FPS
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.fps = 1000 / (avgFrameTime || 16.67);
        
        // Notify callbacks
        this.callbacks.forEach(callback => callback({
            fps: this.fps,
            avgFrameTime: avgFrameTime
        }));
    }

    onPerformanceChange(callback) {
        this.callbacks.push(callback);
    }

    getMetrics() {
        return {
            fps: this.fps,
            avgFrameTime: this.frameTimes.length > 0 
                ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length 
                : 0
        };
    }
}

// Additional widget classes would be implemented similarly...
class UsabilityMetricsWidget extends DashboardWidget {
    render() {
        // Implementation for usability metrics visualization
    }
}

class PerformanceMetricsWidget extends DashboardWidget {
    render() {
        // Implementation for performance metrics visualization
    }
}

class ParticipationWidget extends DashboardWidget {
    render() {
        // Implementation for participation metrics
    }
}

class PrivacyGovernanceWidget extends DashboardWidget {
    render() {
        // Implementation for privacy and governance status
    }
}

class ImprovementWidget extends DashboardWidget {
    render() {
        // Implementation for improvement recommendations
    }
}

// Export for use in WIRTHFORGE system
export { 
    ResearchDashboard, 
    DashboardWidget, 
    EnergyEngagementWidget,
    DashboardPerformanceMonitor 
};
