/**
 * WIRTHFORGE Analytics Engine
 * 
 * Privacy-preserving analytics with statistical aggregation, trend analysis,
 * export controls, and user consent management for monitoring data.
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class WirthForgeAnalytics extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            retentionDays: options.retentionDays || 30,
            aggregationIntervals: options.aggregationIntervals || ['1m', '5m', '1h', '1d'],
            maxRawDataPoints: options.maxRawDataPoints || 100000,
            privacyLevel: options.privacyLevel || 'strict',
            consentRequired: options.consentRequired !== false,
            exportFormats: options.exportFormats || ['json', 'csv'],
            ...options
        };
        
        this.isRunning = false;
        this.rawData = new Map(); // Metric source -> time series data
        this.aggregatedData = new Map(); // Interval -> aggregated data
        this.consentRecords = new Map(); // User consent tracking
        this.exportJobs = new Map(); // Active export jobs
        this.statistics = {
            dataPointsProcessed: 0,
            aggregationsComputed: 0,
            exportsGenerated: 0,
            privacyViolationsPrevented: 0
        };
        
        // Initialize components
        this.dataStore = new PrivacyAwareDataStore(this.config);
        this.aggregator = new StatisticalAggregator(this.config);
        this.trendAnalyzer = new TrendAnalyzer(this.config);
        this.exportManager = new ExportManager(this.config);
        this.consentManager = new ConsentManager(this.config);
        this.privacyFilter = new PrivacyFilter(this.config);
    }
    
    /**
     * Start the analytics engine
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Analytics engine is already running');
        }
        
        try {
            await this.dataStore.initialize();
            await this.consentManager.initialize();
            
            this.isRunning = true;
            this.startAggregationTimer();
            this.startCleanupTimer();
            
            this.emit('started');
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Stop the analytics engine
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        // Cancel any running export jobs
        for (const [jobId, job] of this.exportJobs) {
            if (job.cancel) {
                job.cancel();
            }
        }
        this.exportJobs.clear();
        
        this.emit('stopped');
    }
    
    /**
     * Process incoming metrics data
     */
    async processMetrics(metrics) {
        if (!this.isRunning) {
            return;
        }
        
        const startTime = performance.now();
        
        try {
            for (const metric of metrics) {
                // Apply privacy filtering
                const filteredMetric = await this.privacyFilter.filter(metric);
                if (!filteredMetric) {
                    this.statistics.privacyViolationsPrevented++;
                    continue;
                }
                
                // Store raw data
                await this.storeRawData(filteredMetric);
                
                // Update real-time aggregations
                await this.updateRealTimeAggregations(filteredMetric);
                
                this.statistics.dataPointsProcessed++;
            }
            
            const processingTime = performance.now() - startTime;
            this.emit('metricsProcessed', {
                count: metrics.length,
                processingTime,
                filtered: this.statistics.privacyViolationsPrevented
            });
            
        } catch (error) {
            this.emit('error', error);
        }
    }
    
    /**
     * Store raw metric data with privacy controls
     */
    async storeRawData(metric) {
        const source = metric.source;
        
        if (!this.rawData.has(source)) {
            this.rawData.set(source, []);
        }
        
        const sourceData = this.rawData.get(source);
        
        // Add data point
        sourceData.push({
            timestamp: metric.timestamp,
            data: metric.data,
            privacyLevel: metric.privacy_level || 'local_only',
            retention: metric.retention_policy || 'default'
        });
        
        // Enforce size limits
        if (sourceData.length > this.config.maxRawDataPoints) {
            sourceData.shift(); // Remove oldest
        }
        
        // Store in persistent storage if configured
        await this.dataStore.store(source, metric);
    }
    
    /**
     * Update real-time aggregations
     */
    async updateRealTimeAggregations(metric) {
        const now = Date.now();
        const intervals = ['1m', '5m', '15m'];
        
        for (const interval of intervals) {
            const windowMs = this.parseInterval(interval);
            const windowStart = Math.floor(now / windowMs) * windowMs;
            
            const key = `${metric.source}:${interval}:${windowStart}`;
            
            if (!this.aggregatedData.has(key)) {
                this.aggregatedData.set(key, {
                    source: metric.source,
                    interval,
                    windowStart,
                    windowEnd: windowStart + windowMs,
                    dataPoints: [],
                    computed: false
                });
            }
            
            const aggregation = this.aggregatedData.get(key);
            aggregation.dataPoints.push(metric);
            aggregation.computed = false;
        }
    }
    
    /**
     * Run periodic aggregation
     */
    async runAggregation() {
        if (!this.isRunning) {
            return;
        }
        
        const startTime = performance.now();
        let aggregationsComputed = 0;
        
        try {
            // Process pending aggregations
            for (const [key, aggregation] of this.aggregatedData) {
                if (!aggregation.computed && aggregation.dataPoints.length > 0) {
                    const stats = await this.aggregator.compute(aggregation.dataPoints);
                    
                    aggregation.statistics = stats;
                    aggregation.computed = true;
                    aggregation.computedAt = Date.now();
                    
                    aggregationsComputed++;
                    this.statistics.aggregationsComputed++;
                    
                    this.emit('aggregationComputed', {
                        source: aggregation.source,
                        interval: aggregation.interval,
                        statistics: stats,
                        dataPoints: aggregation.dataPoints.length
                    });
                }
            }
            
            // Clean up old aggregations
            await this.cleanupOldAggregations();
            
            const processingTime = performance.now() - startTime;
            
            this.emit('aggregationCycle', {
                aggregationsComputed,
                processingTime,
                totalAggregations: this.aggregatedData.size
            });
            
        } catch (error) {
            this.emit('error', error);
        }
    }
    
    /**
     * Generate trend analysis
     */
    async generateTrendAnalysis(source, timeRange, options = {}) {
        try {
            const data = await this.getTimeSeriesData(source, timeRange);
            
            if (data.length === 0) {
                return { trends: [], insights: [], confidence: 0 };
            }
            
            const analysis = await this.trendAnalyzer.analyze(data, options);
            
            // Apply privacy filtering to results
            const filteredAnalysis = await this.privacyFilter.filterAnalysis(analysis);
            
            this.emit('trendAnalysisGenerated', {
                source,
                timeRange,
                trendsFound: filteredAnalysis.trends.length,
                confidence: filteredAnalysis.confidence
            });
            
            return filteredAnalysis;
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Create export job with privacy controls
     */
    async createExport(exportConfig) {
        try {
            // Validate export configuration
            await this.validateExportConfig(exportConfig);
            
            // Check consent requirements
            if (this.config.consentRequired) {
                const hasConsent = await this.consentManager.checkConsent(
                    exportConfig.user_id,
                    exportConfig.data_scope
                );
                
                if (!hasConsent) {
                    throw new Error('User consent required for data export');
                }
            }
            
            // Create export job
            const jobId = this.generateJobId();
            const job = await this.exportManager.createJob(jobId, exportConfig);
            
            this.exportJobs.set(jobId, job);
            
            // Start export processing
            this.processExportJob(jobId);
            
            this.emit('exportCreated', { jobId, config: exportConfig });
            
            return { jobId, status: 'created' };
            
        } catch (error) {
            this.emit('exportError', { config: exportConfig, error });
            throw error;
        }
    }
    
    /**
     * Process export job
     */
    async processExportJob(jobId) {
        const job = this.exportJobs.get(jobId);
        if (!job) {
            return;
        }
        
        try {
            job.status = 'processing';
            job.startedAt = Date.now();
            
            // Gather data based on scope
            const data = await this.gatherExportData(job.config);
            
            // Apply privacy transformations
            const processedData = await this.privacyFilter.processForExport(
                data,
                job.config.privacy
            );
            
            // Generate output in requested format
            const output = await this.exportManager.generateOutput(
                processedData,
                job.config.output
            );
            
            // Store output
            job.output = output;
            job.status = 'completed';
            job.completedAt = Date.now();
            
            this.statistics.exportsGenerated++;
            
            this.emit('exportCompleted', {
                jobId,
                dataPoints: processedData.length,
                outputSize: output.length,
                processingTime: job.completedAt - job.startedAt
            });
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = Date.now();
            
            this.emit('exportFailed', { jobId, error });
        }
    }
    
    /**
     * Get analytics statistics
     */
    getStatistics() {
        const rawDataPoints = Array.from(this.rawData.values())
            .reduce((sum, data) => sum + data.length, 0);
        
        const aggregationCount = this.aggregatedData.size;
        const activeExports = Array.from(this.exportJobs.values())
            .filter(job => job.status === 'processing').length;
        
        return {
            ...this.statistics,
            isRunning: this.isRunning,
            rawDataPoints,
            aggregationCount,
            activeExports,
            consentRecords: this.consentRecords.size
        };
    }
    
    // Utility methods
    parseInterval(interval) {
        const match = interval.match(/^(\d+)([smhd])$/);
        if (!match) return 60000; // Default 1 minute
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 60000;
        }
    }
    
    generateJobId() {
        return `export_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
    
    async validateExportConfig(config) {
        const required = ['data_scope', 'output', 'privacy'];
        
        for (const field of required) {
            if (!(field in config)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }
    
    async getTimeSeriesData(source, timeRange) {
        const sourceData = this.rawData.get(source);
        if (!sourceData) return [];
        
        const start = timeRange?.start || 0;
        const end = timeRange?.end || Date.now();
        
        return sourceData.filter(point => 
            point.timestamp >= start && point.timestamp <= end
        );
    }
    
    // Component initialization methods
    startAggregationTimer() {
        const interval = 60000; // 1 minute
        
        const runAggregationCycle = () => {
            if (!this.isRunning) return;
            
            this.runAggregation().finally(() => {
                setTimeout(runAggregationCycle, interval);
            });
        };
        
        setTimeout(runAggregationCycle, interval);
    }
    
    startCleanupTimer() {
        const interval = 3600000; // 1 hour
        
        const runCleanup = () => {
            if (!this.isRunning) return;
            
            this.cleanupExpiredData().finally(() => {
                setTimeout(runCleanup, interval);
            });
        };
        
        setTimeout(runCleanup, interval);
    }
    
    async cleanupExpiredData() {
        const now = Date.now();
        const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
        const cutoffTime = now - retentionMs;
        
        // Clean up raw data
        for (const [source, data] of this.rawData) {
            const filteredData = data.filter(point => point.timestamp > cutoffTime);
            this.rawData.set(source, filteredData);
        }
        
        // Clean up aggregated data
        await this.cleanupOldAggregations();
        
        this.emit('dataCleanup', {
            rawDataSources: this.rawData.size,
            aggregations: this.aggregatedData.size,
            activeExports: this.exportJobs.size
        });
    }
    
    async cleanupOldAggregations() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [key, aggregation] of this.aggregatedData) {
            const age = now - aggregation.windowEnd;
            if (age > maxAge) {
                this.aggregatedData.delete(key);
            }
        }
    }
}

/**
 * Privacy-aware data store
 */
class PrivacyAwareDataStore {
    constructor(config) {
        this.config = config;
        this.storage = new Map();
    }
    
    async initialize() {
        // Initialize storage backend
    }
    
    async store(source, metric) {
        // Store with privacy controls
        if (metric.privacy_level === 'local_only') {
            return; // Only store in memory
        }
        
        // Apply data minimization
        const minimizedData = this.minimizeData(metric);
        this.storage.set(`${source}:${metric.timestamp}`, minimizedData);
    }
    
    minimizeData(metric) {
        const minimized = { ...metric };
        
        // Remove user identifiers
        delete minimized.user_id;
        delete minimized.session_id;
        
        // Quantize timestamps to reduce precision
        minimized.timestamp = Math.floor(minimized.timestamp / 60000) * 60000;
        
        return minimized;
    }
}

/**
 * Statistical aggregator
 */
class StatisticalAggregator {
    constructor(config) {
        this.config = config;
    }
    
    async compute(dataPoints) {
        if (dataPoints.length === 0) {
            return null;
        }
        
        const values = this.extractNumericValues(dataPoints);
        
        if (values.length === 0) {
            return null;
        }
        
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        
        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            mean,
            median: this.median(sorted),
            p95: this.percentile(sorted, 0.95),
            p99: this.percentile(sorted, 0.99),
            stddev: this.standardDeviation(values, mean)
        };
    }
    
    extractNumericValues(dataPoints) {
        const values = [];
        
        for (const point of dataPoints) {
            if (typeof point.data === 'number') {
                values.push(point.data);
            } else if (typeof point.data === 'object') {
                for (const value of Object.values(point.data)) {
                    if (typeof value === 'number') {
                        values.push(value);
                    }
                }
            }
        }
        
        return values;
    }
    
    median(sortedValues) {
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0 
            ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
            : sortedValues[mid];
    }
    
    percentile(sortedValues, p) {
        const index = Math.ceil(sortedValues.length * p) - 1;
        return sortedValues[Math.max(0, index)];
    }
    
    standardDeviation(values, mean) {
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}

/**
 * Trend analyzer
 */
class TrendAnalyzer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data, options = {}) {
        const trends = [];
        const insights = [];
        
        // Simple linear trend detection
        const linearTrend = this.detectLinearTrend(data);
        if (linearTrend.significance > 0.7) {
            trends.push(linearTrend);
        }
        
        // Anomaly detection
        const anomalies = this.detectAnomalies(data);
        if (anomalies.length > 0) {
            insights.push({
                type: 'anomalies',
                count: anomalies.length,
                anomalies: anomalies.slice(0, 10)
            });
        }
        
        return {
            trends,
            insights,
            confidence: trends.length > 0 ? 0.8 : 0.3
        };
    }
    
    detectLinearTrend(data) {
        const n = data.length;
        const sumX = data.reduce((sum, point, i) => sum + i, 0);
        const sumY = data.reduce((sum, point) => sum + this.extractValue(point), 0);
        const sumXY = data.reduce((sum, point, i) => sum + i * this.extractValue(point), 0);
        const sumXX = data.reduce((sum, point, i) => sum + i * i, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return {
            type: 'linear',
            slope,
            intercept,
            direction: slope > 0 ? 'increasing' : 'decreasing',
            significance: Math.abs(slope) / (sumY / n)
        };
    }
    
    detectAnomalies(data) {
        const values = data.map(point => this.extractValue(point));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stddev = Math.sqrt(
            values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
        );
        
        const threshold = 2.5 * stddev;
        
        return data.filter((point, i) => {
            const value = values[i];
            return Math.abs(value - mean) > threshold;
        }).map(point => ({
            timestamp: point.timestamp,
            value: this.extractValue(point),
            deviation: Math.abs(this.extractValue(point) - mean) / stddev
        }));
    }
    
    extractValue(dataPoint) {
        if (typeof dataPoint.data === 'number') {
            return dataPoint.data;
        } else if (typeof dataPoint.data === 'object') {
            const values = Object.values(dataPoint.data).filter(v => typeof v === 'number');
            return values.length > 0 ? values[0] : 0;
        }
        return 0;
    }
}

/**
 * Export manager
 */
class ExportManager {
    constructor(config) {
        this.config = config;
    }
    
    async createJob(jobId, config) {
        return {
            id: jobId,
            config,
            status: 'created',
            createdAt: Date.now(),
            output: null,
            error: null
        };
    }
    
    async generateOutput(data, outputConfig) {
        switch (outputConfig.format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.generateCSV(data);
            default:
                throw new Error(`Unsupported format: ${outputConfig.format}`);
        }
    }
    
    generateCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
            headers.map(header => JSON.stringify(item[header] || '')).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    }
}

/**
 * Consent manager
 */
class ConsentManager {
    constructor(config) {
        this.config = config;
        this.consents = new Map();
    }
    
    async initialize() {
        // Initialize consent storage
    }
    
    async checkConsent(userId, dataScope) {
        const consent = this.consents.get(userId);
        if (!consent) return false;
        
        // Check if consent covers the requested scope
        return consent.scopes.some(scope => this.scopeMatches(scope, dataScope));
    }
    
    scopeMatches(consentScope, requestedScope) {
        // Simple scope matching logic
        return consentScope === requestedScope || consentScope === '*';
    }
}

/**
 * Privacy filter
 */
class PrivacyFilter {
    constructor(config) {
        this.config = config;
    }
    
    async filter(metric) {
        // Apply privacy level filtering
        if (this.config.privacyLevel === 'strict' && metric.privacy_level === 'public') {
            return null; // Block public data in strict mode
        }
        
        return metric;
    }
    
    async filterAnalysis(analysis) {
        // Remove sensitive information from analysis results
        return {
            ...analysis,
            insights: analysis.insights.map(insight => ({
                ...insight,
                // Remove detailed anomaly data if privacy level is high
                anomalies: this.config.privacyLevel === 'strict' ? [] : insight.anomalies
            }))
        };
    }
    
    async processForExport(data, privacyConfig) {
        // Apply privacy transformations for export
        return data.map(item => {
            const processed = { ...item };
            
            // Remove or anonymize sensitive fields based on privacy config
            if (privacyConfig.anonymize_timestamps) {
                processed.timestamp = Math.floor(processed.timestamp / 3600000) * 3600000;
            }
            
            if (privacyConfig.remove_identifiers) {
                delete processed.user_id;
                delete processed.session_id;
            }
            
            return processed;
        });
    }
}

module.exports = {
    WirthForgeAnalytics,
    PrivacyAwareDataStore,
    StatisticalAggregator,
    TrendAnalyzer,
    ExportManager,
    ConsentManager,
    PrivacyFilter
};
