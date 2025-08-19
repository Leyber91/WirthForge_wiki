/**
 * WIRTHFORGE Model Performance Collector
 * 
 * Collects AI model performance metrics (TPS, TTFT, energy, entropy) at 60Hz
 * for the WIRTHFORGE monitoring system. Integrates with local AI model runtime.
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class ModelCollector extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            sampleRate: options.sampleRate || 60, // Hz
            frameBudgetMs: options.frameBudgetMs || 16.67,
            maxModels: options.maxModels || 10,
            energyBaseline: options.energyBaseline || 1000, // tokens/joule baseline
            ...options
        };
        
        this.isRunning = false;
        this.intervalId = null;
        this.models = new Map(); // Active model instances
        this.performanceStartTime = null;
        this.lastMetrics = new Map();
        
        // Energy calculation parameters
        this.energyCalculator = new EnergyCalculator(this.config.energyBaseline);
    }
    
    /**
     * Start collecting model metrics
     */
    async start() {
        if (this.isRunning) {
            throw new Error('ModelCollector is already running');
        }
        
        this.isRunning = true;
        this.performanceStartTime = process.hrtime.bigint();
        
        // Start collection interval at 60Hz
        const intervalMs = 1000 / this.config.sampleRate;
        this.intervalId = setInterval(async () => {
            try {
                await this.collectMetrics();
            } catch (error) {
                this.emit('error', error);
            }
        }, intervalMs);
        
        this.emit('started');
    }
    
    /**
     * Stop collecting model metrics
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.emit('stopped');
    }
    
    /**
     * Register a model instance for monitoring
     */
    registerModel(modelId, modelInstance) {
        if (this.models.size >= this.config.maxModels) {
            throw new Error(`Maximum number of models (${this.config.maxModels}) already registered`);
        }
        
        const modelInfo = {
            id: modelId,
            instance: modelInstance,
            registeredAt: Date.now(),
            totalTokens: 0,
            totalRequests: 0,
            totalLatency: 0,
            lastActivity: Date.now()
        };
        
        this.models.set(modelId, modelInfo);
        this.lastMetrics.set(modelId, {});
        
        // Hook into model events if available
        this.hookModelEvents(modelInfo);
        
        this.emit('modelRegistered', modelId);
    }
    
    /**
     * Unregister a model instance
     */
    unregisterModel(modelId) {
        if (this.models.has(modelId)) {
            this.models.delete(modelId);
            this.lastMetrics.delete(modelId);
            this.emit('modelUnregistered', modelId);
        }
    }
    
    /**
     * Hook into model events for real-time metrics
     */
    hookModelEvents(modelInfo) {
        const { instance } = modelInfo;
        
        // Hook token generation events
        if (instance.on && typeof instance.on === 'function') {
            instance.on('tokenGenerated', (data) => {
                this.handleTokenGenerated(modelInfo.id, data);
            });
            
            instance.on('requestStarted', (data) => {
                this.handleRequestStarted(modelInfo.id, data);
            });
            
            instance.on('requestCompleted', (data) => {
                this.handleRequestCompleted(modelInfo.id, data);
            });
            
            instance.on('error', (error) => {
                this.handleModelError(modelInfo.id, error);
            });
        }
    }
    
    /**
     * Handle token generation event
     */
    handleTokenGenerated(modelId, data) {
        const modelInfo = this.models.get(modelId);
        if (modelInfo) {
            modelInfo.totalTokens++;
            modelInfo.lastActivity = Date.now();
            
            // Update real-time metrics
            const lastMetric = this.lastMetrics.get(modelId);
            lastMetric.lastTokenTime = performance.now();
            lastMetric.tokenData = data;
        }
    }
    
    /**
     * Handle request started event
     */
    handleRequestStarted(modelId, data) {
        const modelInfo = this.models.get(modelId);
        if (modelInfo) {
            const lastMetric = this.lastMetrics.get(modelId);
            lastMetric.requestStartTime = performance.now();
            lastMetric.requestId = data.requestId;
        }
    }
    
    /**
     * Handle request completed event
     */
    handleRequestCompleted(modelId, data) {
        const modelInfo = this.models.get(modelId);
        if (modelInfo) {
            modelInfo.totalRequests++;
            
            const lastMetric = this.lastMetrics.get(modelId);
            if (lastMetric.requestStartTime) {
                const latency = performance.now() - lastMetric.requestStartTime;
                modelInfo.totalLatency += latency;
                lastMetric.lastRequestLatency = latency;
            }
            
            lastMetric.completedTokens = data.tokenCount || 0;
            lastMetric.requestCompleted = true;
        }
    }
    
    /**
     * Handle model error event
     */
    handleModelError(modelId, error) {
        const lastMetric = this.lastMetrics.get(modelId);
        if (lastMetric) {
            lastMetric.error = error.message;
            lastMetric.errorTime = performance.now();
        }
    }
    
    /**
     * Collect metrics from all registered models
     */
    async collectMetrics() {
        const startTime = process.hrtime.bigint();
        
        for (const [modelId, modelInfo] of this.models) {
            try {
                const metrics = await this.collectModelMetrics(modelId, modelInfo);
                
                const event = {
                    timestamp: Date.now(),
                    source: `model:${modelId}`,
                    type: 'performance',
                    data: metrics,
                    version: '1.0',
                    window: '1s',
                    energy_visual: this.calculateEnergyVisuals(metrics),
                    frame_budget_used_ms: 0, // Will be calculated below
                    privacy_level: 'internal',
                    retention_policy: 'high_frequency'
                };
                
                this.emit('metrics', event);
                
            } catch (error) {
                this.emit('error', error);
            }
        }
        
        // Calculate total frame budget usage
        const endTime = process.hrtime.bigint();
        const processingTimeMs = Number(endTime - startTime) / 1000000;
        
        // Warn if we exceed frame budget
        if (processingTimeMs > this.config.frameBudgetMs * 0.1) {
            console.warn(`ModelCollector exceeded 10% of frame budget: ${processingTimeMs.toFixed(2)}ms`);
        }
    }
    
    /**
     * Collect metrics for a specific model
     */
    async collectModelMetrics(modelId, modelInfo) {
        const lastMetric = this.lastMetrics.get(modelId);
        const now = performance.now();
        const currentTime = Date.now();
        
        // Calculate tokens per second
        const timeDelta = lastMetric.lastCollectionTime ? 
            (now - lastMetric.lastCollectionTime) / 1000 : 1;
        const tokensDelta = modelInfo.totalTokens - (lastMetric.lastTotalTokens || 0);
        const tokensPerSecond = tokensDelta / timeDelta;
        
        // Calculate time to first token (TTFT)
        let ttftMs = 0;
        if (lastMetric.requestStartTime && lastMetric.lastTokenTime) {
            ttftMs = lastMetric.lastTokenTime - lastMetric.requestStartTime;
        }
        
        // Calculate queue wait time
        const queueWaitMs = this.calculateQueueWait(modelInfo);
        
        // Calculate cache hit rate
        const cacheHitRate = this.calculateCacheHitRate(modelInfo);
        
        // Calculate batch size
        const batchSize = this.calculateBatchSize(modelInfo);
        
        // Calculate energy metrics
        const energyMetrics = this.energyCalculator.calculate({
            tokensPerSecond,
            totalTokens: modelInfo.totalTokens,
            requestLatency: lastMetric.lastRequestLatency || 0,
            modelSize: this.getModelSize(modelInfo),
            gpuUtilization: this.getGPUUtilization(modelInfo)
        });
        
        // Calculate entropy
        const entropyBits = this.calculateEntropy(lastMetric.tokenData);
        
        // Calculate accuracy proxy
        const accuracyProxy = this.calculateAccuracyProxy(modelInfo);
        
        // Update last metrics for next calculation
        lastMetric.lastCollectionTime = now;
        lastMetric.lastTotalTokens = modelInfo.totalTokens;
        lastMetric.requestCompleted = false;
        
        return {
            tokens_per_second: Math.max(0, tokensPerSecond),
            ttft_ms: Math.max(0, ttftMs),
            queue_wait_ms: Math.max(0, queueWaitMs),
            cache_hit_rate: Math.max(0, Math.min(1, cacheHitRate)),
            batch_size: Math.max(1, batchSize),
            energy_normalized: Math.max(0, Math.min(1, energyMetrics.normalized)),
            entropy_bits: Math.max(0, entropyBits),
            gpu_utilization: Math.max(0, Math.min(100, this.getGPUUtilization(modelInfo))),
            vram_used_mb: Math.max(0, this.getVRAMUsage(modelInfo)),
            accuracy_proxy: Math.max(0, Math.min(1, accuracyProxy)),
            total_tokens: modelInfo.totalTokens,
            total_requests: modelInfo.totalRequests,
            avg_latency_ms: modelInfo.totalRequests > 0 ? 
                modelInfo.totalLatency / modelInfo.totalRequests : 0,
            model_active: currentTime - modelInfo.lastActivity < 5000, // Active within 5s
            error_count: lastMetric.error ? 1 : 0
        };
    }
    
    /**
     * Calculate queue wait time
     */
    calculateQueueWait(modelInfo) {
        // Estimate based on pending requests and processing rate
        const pendingRequests = this.getPendingRequests(modelInfo);
        const avgProcessingTime = modelInfo.totalRequests > 0 ? 
            modelInfo.totalLatency / modelInfo.totalRequests : 100;
        
        return pendingRequests * avgProcessingTime;
    }
    
    /**
     * Calculate cache hit rate
     */
    calculateCacheHitRate(modelInfo) {
        // This would need to be implemented based on the specific model's caching mechanism
        // For now, return a reasonable estimate
        return 0.75; // 75% cache hit rate estimate
    }
    
    /**
     * Calculate current batch size
     */
    calculateBatchSize(modelInfo) {
        // This would need to be queried from the model instance
        // For now, return a default value
        return 1;
    }
    
    /**
     * Calculate entropy of generated tokens
     */
    calculateEntropy(tokenData) {
        if (!tokenData || !tokenData.probabilities) {
            return 0;
        }
        
        const probs = tokenData.probabilities;
        let entropy = 0;
        
        for (const prob of probs) {
            if (prob > 0) {
                entropy -= prob * Math.log2(prob);
            }
        }
        
        return entropy;
    }
    
    /**
     * Calculate accuracy proxy based on confidence scores
     */
    calculateAccuracyProxy(modelInfo) {
        // This would need to be implemented based on task-specific metrics
        // For now, return a reasonable estimate based on recent performance
        const recentErrors = this.getRecentErrors(modelInfo);
        return Math.max(0, 1 - (recentErrors / 100));
    }
    
    /**
     * Calculate energy visualization parameters
     */
    calculateEnergyVisuals(metrics) {
        const maxTPS = 100; // Maximum expected tokens per second
        const maxEnergy = 1; // Maximum energy value
        
        return {
            ribbon_width: Math.min(1, metrics.tokens_per_second / maxTPS),
            particle_density: Math.min(1, metrics.entropy_bits / 8), // Max 8 bits entropy
            animation_speed: Math.min(1, metrics.energy_normalized),
            lightning_intensity: Math.min(1, metrics.tokens_per_second / (maxTPS * 0.5))
        };
    }
    
    /**
     * Get model size in parameters (if available)
     */
    getModelSize(modelInfo) {
        // This would need to be queried from the model instance
        return modelInfo.instance.parameterCount || 7000000000; // Default 7B parameters
    }
    
    /**
     * Get GPU utilization for this model
     */
    getGPUUtilization(modelInfo) {
        // This would need to be queried from the model instance or system
        return 0; // Placeholder
    }
    
    /**
     * Get VRAM usage for this model
     */
    getVRAMUsage(modelInfo) {
        // This would need to be queried from the model instance or system
        return 0; // Placeholder
    }
    
    /**
     * Get number of pending requests
     */
    getPendingRequests(modelInfo) {
        // This would need to be queried from the model instance
        return 0; // Placeholder
    }
    
    /**
     * Get recent error count
     */
    getRecentErrors(modelInfo) {
        // This would need to track errors over time
        return 0; // Placeholder
    }
    
    /**
     * Get current health status
     */
    getHealthStatus() {
        const modelStats = Array.from(this.models.entries()).map(([id, info]) => ({
            id,
            active: Date.now() - info.lastActivity < 5000,
            totalTokens: info.totalTokens,
            totalRequests: info.totalRequests,
            avgLatency: info.totalRequests > 0 ? info.totalLatency / info.totalRequests : 0
        }));
        
        return {
            isRunning: this.isRunning,
            sampleRate: this.config.sampleRate,
            registeredModels: this.models.size,
            maxModels: this.config.maxModels,
            models: modelStats,
            uptime: this.performanceStartTime ? 
                Number(process.hrtime.bigint() - this.performanceStartTime) / 1000000000 : 0
        };
    }
}

/**
 * Energy calculation helper class
 */
class EnergyCalculator {
    constructor(baseline = 1000) {
        this.baseline = baseline; // tokens per joule baseline
        this.history = [];
        this.maxHistorySize = 100;
    }
    
    /**
     * Calculate energy metrics
     */
    calculate(params) {
        const {
            tokensPerSecond,
            totalTokens,
            requestLatency,
            modelSize,
            gpuUtilization
        } = params;
        
        // Estimate energy consumption based on various factors
        const computeEnergy = this.calculateComputeEnergy(tokensPerSecond, modelSize);
        const memoryEnergy = this.calculateMemoryEnergy(modelSize);
        const communicationEnergy = this.calculateCommunicationEnergy(requestLatency);
        
        const totalEnergy = computeEnergy + memoryEnergy + communicationEnergy;
        
        // Normalize to 0-1 scale
        const normalized = Math.min(1, totalEnergy / this.baseline);
        
        // Update history for trend analysis
        this.updateHistory({
            timestamp: Date.now(),
            energy: totalEnergy,
            normalized,
            tokensPerSecond,
            efficiency: tokensPerSecond / totalEnergy
        });
        
        return {
            total: totalEnergy,
            normalized,
            compute: computeEnergy,
            memory: memoryEnergy,
            communication: communicationEnergy,
            efficiency: tokensPerSecond / Math.max(1, totalEnergy)
        };
    }
    
    /**
     * Calculate compute energy consumption
     */
    calculateComputeEnergy(tokensPerSecond, modelSize) {
        // Simplified model: energy scales with tokens/sec and model size
        const baseCompute = tokensPerSecond * 0.1; // Base compute cost
        const sizeMultiplier = Math.log10(modelSize / 1000000000); // Scale by model size
        return baseCompute * (1 + sizeMultiplier);
    }
    
    /**
     * Calculate memory energy consumption
     */
    calculateMemoryEnergy(modelSize) {
        // Memory energy scales with model size
        return (modelSize / 1000000000) * 0.05; // 0.05 units per billion parameters
    }
    
    /**
     * Calculate communication energy consumption
     */
    calculateCommunicationEnergy(requestLatency) {
        // Communication energy scales with latency
        return requestLatency * 0.001; // 0.001 units per ms
    }
    
    /**
     * Update energy history
     */
    updateHistory(entry) {
        this.history.push(entry);
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * Get energy trend
     */
    getTrend(windowSize = 10) {
        if (this.history.length < windowSize) {
            return { trend: 'stable', change: 0 };
        }
        
        const recent = this.history.slice(-windowSize);
        const older = this.history.slice(-windowSize * 2, -windowSize);
        
        const recentAvg = recent.reduce((sum, entry) => sum + entry.normalized, 0) / recent.length;
        const olderAvg = older.reduce((sum, entry) => sum + entry.normalized, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        let trend = 'stable';
        if (Math.abs(change) > 0.1) {
            trend = change > 0 ? 'increasing' : 'decreasing';
        }
        
        return { trend, change };
    }
}

module.exports = { ModelCollector, EnergyCalculator };
