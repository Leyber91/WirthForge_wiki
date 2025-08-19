/**
 * WIRTHFORGE Metrics Aggregator
 * 
 * Aggregates metrics from multiple collectors into time-windowed buckets
 * and streams processed data to dashboards and storage systems.
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class MetricsAggregator extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            windowSizes: options.windowSizes || ['1s', '10s', '1m', '5m'],
            maxBufferSize: options.maxBufferSize || 10000,
            flushInterval: options.flushInterval || 1000, // ms
            frameBudgetMs: options.frameBudgetMs || 16.67,
            retentionHours: options.retentionHours || 24,
            ...options
        };
        
        this.isRunning = false;
        this.flushIntervalId = null;
        this.collectors = new Map(); // Registered collectors
        this.windows = new Map(); // Time windows for aggregation
        this.buffer = []; // Raw metrics buffer
        this.statistics = {
            totalMetrics: 0,
            processedMetrics: 0,
            droppedMetrics: 0,
            avgProcessingTime: 0
        };
        
        this.initializeWindows();
    }
    
    /**
     * Initialize time windows for aggregation
     */
    initializeWindows() {
        for (const windowSize of this.config.windowSizes) {
            this.windows.set(windowSize, new TimeWindow(windowSize, {
                retentionHours: this.config.retentionHours
            }));
        }
    }
    
    /**
     * Start the aggregator
     */
    async start() {
        if (this.isRunning) {
            throw new Error('MetricsAggregator is already running');
        }
        
        this.isRunning = true;
        
        // Start flush interval
        this.flushIntervalId = setInterval(() => {
            this.flushBuffer();
        }, this.config.flushInterval);
        
        this.emit('started');
    }
    
    /**
     * Stop the aggregator
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        if (this.flushIntervalId) {
            clearInterval(this.flushIntervalId);
            this.flushIntervalId = null;
        }
        
        // Final flush
        this.flushBuffer();
        
        this.emit('stopped');
    }
    
    /**
     * Register a collector
     */
    registerCollector(collectorId, collector) {
        if (this.collectors.has(collectorId)) {
            throw new Error(`Collector ${collectorId} is already registered`);
        }
        
        this.collectors.set(collectorId, {
            id: collectorId,
            instance: collector,
            registeredAt: Date.now(),
            metricsReceived: 0,
            lastMetricTime: null
        });
        
        // Listen for metrics from this collector
        collector.on('metrics', (event) => {
            this.handleMetrics(collectorId, event);
        });
        
        collector.on('error', (error) => {
            this.emit('collectorError', { collectorId, error });
        });
        
        this.emit('collectorRegistered', collectorId);
    }
    
    /**
     * Unregister a collector
     */
    unregisterCollector(collectorId) {
        if (this.collectors.has(collectorId)) {
            const collectorInfo = this.collectors.get(collectorId);
            collectorInfo.instance.removeAllListeners('metrics');
            collectorInfo.instance.removeAllListeners('error');
            
            this.collectors.delete(collectorId);
            this.emit('collectorUnregistered', collectorId);
        }
    }
    
    /**
     * Handle incoming metrics from collectors
     */
    handleMetrics(collectorId, event) {
        const startTime = performance.now();
        
        try {
            // Validate event structure
            if (!this.validateMetricEvent(event)) {
                this.statistics.droppedMetrics++;
                return;
            }
            
            // Update collector statistics
            const collectorInfo = this.collectors.get(collectorId);
            if (collectorInfo) {
                collectorInfo.metricsReceived++;
                collectorInfo.lastMetricTime = Date.now();
            }
            
            // Add to buffer
            this.addToBuffer({
                ...event,
                collectorId,
                receivedAt: Date.now(),
                processingStartTime: startTime
            });
            
            this.statistics.totalMetrics++;
            
            // Check buffer size and flush if needed
            if (this.buffer.length >= this.config.maxBufferSize) {
                this.flushBuffer();
            }
            
        } catch (error) {
            this.emit('error', error);
            this.statistics.droppedMetrics++;
        }
    }
    
    /**
     * Validate metric event structure
     */
    validateMetricEvent(event) {
        return (
            event &&
            typeof event.timestamp === 'number' &&
            typeof event.source === 'string' &&
            typeof event.type === 'string' &&
            typeof event.data === 'object' &&
            event.data !== null
        );
    }
    
    /**
     * Add metric to buffer
     */
    addToBuffer(metric) {
        this.buffer.push(metric);
        
        // Emit real-time event for immediate processing
        this.emit('realtime', metric);
    }
    
    /**
     * Flush buffer and process metrics
     */
    flushBuffer() {
        if (this.buffer.length === 0) {
            return;
        }
        
        const startTime = performance.now();
        const metricsToProcess = this.buffer.splice(0);
        
        try {
            this.processMetrics(metricsToProcess);
            
            const processingTime = performance.now() - startTime;
            this.updateProcessingStatistics(processingTime);
            
            // Check frame budget
            if (processingTime > this.config.frameBudgetMs * 0.2) {
                console.warn(`MetricsAggregator flush exceeded 20% of frame budget: ${processingTime.toFixed(2)}ms`);
            }
            
        } catch (error) {
            this.emit('error', error);
            // Re-add metrics to buffer for retry
            this.buffer.unshift(...metricsToProcess);
        }
    }
    
    /**
     * Process metrics into time windows
     */
    processMetrics(metrics) {
        const processedByWindow = new Map();
        
        for (const metric of metrics) {
            try {
                // Process into each time window
                for (const [windowSize, window] of this.windows) {
                    const aggregated = window.addMetric(metric);
                    
                    if (aggregated) {
                        if (!processedByWindow.has(windowSize)) {
                            processedByWindow.set(windowSize, []);
                        }
                        processedByWindow.get(windowSize).push(aggregated);
                    }
                }
                
                this.statistics.processedMetrics++;
                
            } catch (error) {
                this.emit('error', error);
                this.statistics.droppedMetrics++;
            }
        }
        
        // Emit aggregated metrics for each window
        for (const [windowSize, aggregatedMetrics] of processedByWindow) {
            if (aggregatedMetrics.length > 0) {
                this.emit('aggregated', {
                    windowSize,
                    metrics: aggregatedMetrics,
                    timestamp: Date.now()
                });
            }
        }
    }
    
    /**
     * Update processing statistics
     */
    updateProcessingStatistics(processingTime) {
        const alpha = 0.1; // Exponential moving average factor
        this.statistics.avgProcessingTime = 
            (1 - alpha) * this.statistics.avgProcessingTime + alpha * processingTime;
    }
    
    /**
     * Get metrics for a specific time range and window
     */
    getMetrics(windowSize, startTime, endTime, filters = {}) {
        const window = this.windows.get(windowSize);
        if (!window) {
            throw new Error(`Unknown window size: ${windowSize}`);
        }
        
        return window.getMetrics(startTime, endTime, filters);
    }
    
    /**
     * Get current statistics
     */
    getStatistics() {
        const collectorStats = Array.from(this.collectors.entries()).map(([id, info]) => ({
            id,
            metricsReceived: info.metricsReceived,
            lastMetricTime: info.lastMetricTime,
            isActive: info.lastMetricTime && (Date.now() - info.lastMetricTime) < 5000
        }));
        
        const windowStats = Array.from(this.windows.entries()).map(([size, window]) => ({
            size,
            bucketCount: window.getBucketCount(),
            oldestBucket: window.getOldestBucketTime(),
            newestBucket: window.getNewestBucketTime()
        }));
        
        return {
            ...this.statistics,
            isRunning: this.isRunning,
            bufferSize: this.buffer.length,
            maxBufferSize: this.config.maxBufferSize,
            collectors: collectorStats,
            windows: windowStats,
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    /**
     * Get memory usage estimate
     */
    getMemoryUsage() {
        let totalMemory = 0;
        
        // Buffer memory
        totalMemory += this.buffer.length * 1000; // Rough estimate per metric
        
        // Window memory
        for (const window of this.windows.values()) {
            totalMemory += window.getMemoryUsage();
        }
        
        return {
            totalBytes: totalMemory,
            bufferBytes: this.buffer.length * 1000,
            windowBytes: totalMemory - (this.buffer.length * 1000)
        };
    }
    
    /**
     * Clean up old data
     */
    cleanup() {
        for (const window of this.windows.values()) {
            window.cleanup();
        }
    }
}

/**
 * Time window for metric aggregation
 */
class TimeWindow {
    constructor(windowSize, options = {}) {
        this.windowSize = windowSize;
        this.windowMs = this.parseWindowSize(windowSize);
        this.retentionMs = (options.retentionHours || 24) * 60 * 60 * 1000;
        
        this.buckets = new Map(); // timestamp -> bucket
        this.lastCleanup = Date.now();
    }
    
    /**
     * Parse window size string to milliseconds
     */
    parseWindowSize(windowSize) {
        const match = windowSize.match(/^(\d+)(s|m|h)$/);
        if (!match) {
            throw new Error(`Invalid window size: ${windowSize}`);
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            default: throw new Error(`Unknown time unit: ${unit}`);
        }
    }
    
    /**
     * Add metric to appropriate bucket
     */
    addMetric(metric) {
        const bucketTime = this.getBucketTime(metric.timestamp);
        
        if (!this.buckets.has(bucketTime)) {
            this.buckets.set(bucketTime, new MetricBucket(bucketTime, this.windowMs));
        }
        
        const bucket = this.buckets.get(bucketTime);
        bucket.addMetric(metric);
        
        // Check if bucket is ready for aggregation
        if (bucket.isComplete()) {
            const aggregated = bucket.getAggregated();
            
            // Clean up old buckets periodically
            if (Date.now() - this.lastCleanup > 60000) { // Every minute
                this.cleanup();
                this.lastCleanup = Date.now();
            }
            
            return aggregated;
        }
        
        return null;
    }
    
    /**
     * Get bucket time for a timestamp
     */
    getBucketTime(timestamp) {
        return Math.floor(timestamp / this.windowMs) * this.windowMs;
    }
    
    /**
     * Get metrics for time range
     */
    getMetrics(startTime, endTime, filters = {}) {
        const results = [];
        
        for (const [bucketTime, bucket] of this.buckets) {
            if (bucketTime >= startTime && bucketTime <= endTime) {
                const aggregated = bucket.getAggregated();
                
                // Apply filters
                if (this.matchesFilters(aggregated, filters)) {
                    results.push(aggregated);
                }
            }
        }
        
        return results.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    /**
     * Check if aggregated metric matches filters
     */
    matchesFilters(metric, filters) {
        for (const [key, value] of Object.entries(filters)) {
            if (metric[key] !== value) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Clean up old buckets
     */
    cleanup() {
        const cutoffTime = Date.now() - this.retentionMs;
        
        for (const [bucketTime, bucket] of this.buckets) {
            if (bucketTime < cutoffTime) {
                this.buckets.delete(bucketTime);
            }
        }
    }
    
    /**
     * Get bucket count
     */
    getBucketCount() {
        return this.buckets.size;
    }
    
    /**
     * Get oldest bucket time
     */
    getOldestBucketTime() {
        if (this.buckets.size === 0) return null;
        return Math.min(...this.buckets.keys());
    }
    
    /**
     * Get newest bucket time
     */
    getNewestBucketTime() {
        if (this.buckets.size === 0) return null;
        return Math.max(...this.buckets.keys());
    }
    
    /**
     * Get memory usage estimate
     */
    getMemoryUsage() {
        return this.buckets.size * 5000; // Rough estimate per bucket
    }
}

/**
 * Metric bucket for aggregation
 */
class MetricBucket {
    constructor(bucketTime, windowMs) {
        this.bucketTime = bucketTime;
        this.windowMs = windowMs;
        this.metrics = [];
        this.aggregated = null;
        this.isCompleteFlag = false;
    }
    
    /**
     * Add metric to bucket
     */
    addMetric(metric) {
        this.metrics.push(metric);
        this.aggregated = null; // Invalidate cached aggregation
    }
    
    /**
     * Check if bucket is complete (past the window end time)
     */
    isComplete() {
        if (this.isCompleteFlag) {
            return true;
        }
        
        const windowEndTime = this.bucketTime + this.windowMs;
        const now = Date.now();
        
        if (now >= windowEndTime) {
            this.isCompleteFlag = true;
            return true;
        }
        
        return false;
    }
    
    /**
     * Get aggregated metrics
     */
    getAggregated() {
        if (this.aggregated) {
            return this.aggregated;
        }
        
        if (this.metrics.length === 0) {
            return null;
        }
        
        // Group metrics by source
        const bySource = new Map();
        
        for (const metric of this.metrics) {
            if (!bySource.has(metric.source)) {
                bySource.set(metric.source, []);
            }
            bySource.get(metric.source).push(metric);
        }
        
        // Aggregate each source
        const aggregatedSources = [];
        
        for (const [source, sourceMetrics] of bySource) {
            const aggregated = this.aggregateSourceMetrics(source, sourceMetrics);
            if (aggregated) {
                aggregatedSources.push(aggregated);
            }
        }
        
        this.aggregated = {
            timestamp: this.bucketTime,
            windowSize: this.getWindowSizeString(),
            sources: aggregatedSources,
            metricCount: this.metrics.length,
            timeRange: {
                start: this.bucketTime,
                end: this.bucketTime + this.windowMs
            }
        };
        
        return this.aggregated;
    }
    
    /**
     * Aggregate metrics from a single source
     */
    aggregateSourceMetrics(source, metrics) {
        if (metrics.length === 0) {
            return null;
        }
        
        const aggregated = {
            source,
            type: metrics[0].type,
            count: metrics.length,
            data: {}
        };
        
        // Aggregate numeric fields
        const numericFields = this.getNumericFields(metrics);
        
        for (const field of numericFields) {
            const values = metrics
                .map(m => m.data[field])
                .filter(v => typeof v === 'number' && !isNaN(v));
            
            if (values.length > 0) {
                aggregated.data[field] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((a, b) => a + b) / values.length,
                    sum: values.reduce((a, b) => a + b, 0),
                    count: values.length,
                    p50: this.percentile(values, 0.5),
                    p95: this.percentile(values, 0.95),
                    p99: this.percentile(values, 0.99)
                };
            }
        }
        
        // Handle special fields
        this.aggregateSpecialFields(aggregated, metrics);
        
        return aggregated;
    }
    
    /**
     * Get numeric fields from metrics
     */
    getNumericFields(metrics) {
        const fields = new Set();
        
        for (const metric of metrics) {
            for (const [key, value] of Object.entries(metric.data)) {
                if (typeof value === 'number' && !isNaN(value)) {
                    fields.add(key);
                }
            }
        }
        
        return Array.from(fields);
    }
    
    /**
     * Aggregate special fields that need custom handling
     */
    aggregateSpecialFields(aggregated, metrics) {
        // Energy visual aggregation
        const energyVisuals = metrics
            .map(m => m.energy_visual)
            .filter(ev => ev);
        
        if (energyVisuals.length > 0) {
            aggregated.energy_visual = {
                ribbon_width: this.average(energyVisuals.map(ev => ev.ribbon_width)),
                particle_density: this.average(energyVisuals.map(ev => ev.particle_density)),
                animation_speed: this.average(energyVisuals.map(ev => ev.animation_speed)),
                lightning_intensity: this.average(energyVisuals.map(ev => ev.lightning_intensity))
            };
        }
        
        // Frame budget aggregation
        const frameBudgets = metrics
            .map(m => m.frame_budget_used_ms)
            .filter(fb => typeof fb === 'number');
        
        if (frameBudgets.length > 0) {
            aggregated.frame_budget_used_ms = {
                avg: this.average(frameBudgets),
                max: Math.max(...frameBudgets),
                total: frameBudgets.reduce((a, b) => a + b, 0)
            };
        }
    }
    
    /**
     * Calculate percentile
     */
    percentile(values, p) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
    
    /**
     * Calculate average
     */
    average(values) {
        const filtered = values.filter(v => typeof v === 'number' && !isNaN(v));
        return filtered.length > 0 ? 
            filtered.reduce((a, b) => a + b) / filtered.length : 0;
    }
    
    /**
     * Get window size string
     */
    getWindowSizeString() {
        if (this.windowMs < 60000) {
            return `${this.windowMs / 1000}s`;
        } else if (this.windowMs < 3600000) {
            return `${this.windowMs / 60000}m`;
        } else {
            return `${this.windowMs / 3600000}h`;
        }
    }
}

module.exports = { MetricsAggregator, TimeWindow, MetricBucket };
