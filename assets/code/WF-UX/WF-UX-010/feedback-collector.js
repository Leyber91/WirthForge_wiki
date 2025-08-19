/**
 * WF-UX-010 Feedback Collector
 * Collects user interactions, explicit feedback, and energy metrics
 * Maintains 60Hz performance budget and privacy-first design
 */

export class FeedbackCollector {
    constructor(options = {}) {
        this.config = {
            maxProcessingTime: 5, // 5ms budget per collection cycle
            batchSize: 50,
            throttleInterval: 16, // 60Hz throttling
            privacyMode: options.privacyMode || 'strict',
            storageQuota: options.storageQuota || 10 * 1024 * 1024, // 10MB
            ...options
        };

        this.eventQueue = [];
        this.feedbackBuffer = [];
        this.energyMetrics = new Map();
        this.lastProcessTime = 0;
        this.isProcessing = false;
        this.consentStatus = new Map();
        
        this.initializeStorage();
        this.setupEventListeners();
        this.startProcessingLoop();
    }

    async initializeStorage() {
        try {
            this.db = await this.openDatabase();
            this.storageManager = await this.initializeStorageManager();
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            this.fallbackToMemoryStorage();
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WF_UX_010_Feedback', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Event store
                if (!db.objectStoreNames.contains('events')) {
                    const eventStore = db.createObjectStore('events', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    eventStore.createIndex('timestamp', 'timestamp');
                    eventStore.createIndex('type', 'type');
                    eventStore.createIndex('userId', 'userId');
                }
                
                // Feedback store
                if (!db.objectStoreNames.contains('feedback')) {
                    const feedbackStore = db.createObjectStore('feedback', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    feedbackStore.createIndex('timestamp', 'timestamp');
                    feedbackStore.createIndex('category', 'category');
                }
                
                // Energy metrics store
                if (!db.objectStoreNames.contains('energyMetrics')) {
                    const metricsStore = db.createObjectStore('energyMetrics', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    metricsStore.createIndex('timestamp', 'timestamp');
                    metricsStore.createIndex('component', 'component');
                }
            };
        });
    }

    async initializeStorageManager() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                quota: estimate.quota,
                usage: estimate.usage,
                available: estimate.quota - estimate.usage
            };
        }
        return { quota: this.config.storageQuota, usage: 0, available: this.config.storageQuota };
    }

    fallbackToMemoryStorage() {
        this.memoryStorage = {
            events: [],
            feedback: [],
            energyMetrics: []
        };
        this.usingMemoryFallback = true;
    }

    setupEventListeners() {
        // User interaction events
        const interactionEvents = ['click', 'scroll', 'keypress', 'focus', 'blur'];
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, (event) => {
                this.collectInteractionEvent(eventType, event);
            }, { passive: true });
        });

        // Performance observation
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                this.collectPerformanceMetrics(list.getEntries());
            });
            this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
        }

        // Energy metrics from custom events
        document.addEventListener('wirthforge:energy-update', (event) => {
            this.collectEnergyMetric(event.detail);
        });

        // Explicit feedback events
        document.addEventListener('wirthforge:feedback-submit', (event) => {
            this.collectExplicitFeedback(event.detail);
        });
    }

    collectInteractionEvent(type, event) {
        if (!this.hasConsent('interaction-tracking')) return;

        const startTime = performance.now();
        
        const interactionData = {
            type: 'interaction',
            subType: type,
            timestamp: Date.now(),
            target: this.sanitizeTarget(event.target),
            coordinates: this.config.privacyMode === 'strict' ? null : {
                x: event.clientX,
                y: event.clientY
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            energyContext: this.getCurrentEnergyContext()
        };

        this.eventQueue.push(interactionData);
        
        const processingTime = performance.now() - startTime;
        if (processingTime > 1) { // Log if over 1ms
            console.warn(`Interaction collection took ${processingTime.toFixed(2)}ms`);
        }
    }

    collectExplicitFeedback(feedbackData) {
        if (!this.hasConsent('explicit-feedback')) return;

        const feedback = {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'explicit',
            category: feedbackData.category || 'general',
            rating: feedbackData.rating,
            text: this.sanitizeText(feedbackData.text),
            context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                energyState: this.getCurrentEnergyContext(),
                sessionId: this.getSessionId()
            },
            metadata: {
                source: feedbackData.source || 'unknown',
                version: feedbackData.version || '1.0.0'
            }
        };

        this.feedbackBuffer.push(feedback);
        this.dispatchEvent('feedback-collected', feedback);
    }

    collectEnergyMetric(metricData) {
        if (!this.hasConsent('energy-metrics')) return;

        const energyMetric = {
            timestamp: Date.now(),
            component: metricData.component,
            operation: metricData.operation,
            energyValue: metricData.energyValue,
            computationTime: metricData.computationTime,
            frameTime: metricData.frameTime,
            memoryUsage: metricData.memoryUsage,
            cpuUsage: metricData.cpuUsage
        };

        this.energyMetrics.set(metricData.component, energyMetric);
    }

    collectPerformanceMetrics(entries) {
        if (!this.hasConsent('performance-metrics')) return;

        entries.forEach(entry => {
            const performanceData = {
                type: 'performance',
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
                entryType: entry.entryType,
                timestamp: Date.now()
            };

            this.eventQueue.push(performanceData);
        });
    }

    startProcessingLoop() {
        const processLoop = () => {
            if (!this.isProcessing && this.shouldProcess()) {
                this.processBatch();
            }
            
            // Maintain 60Hz processing
            setTimeout(processLoop, this.config.throttleInterval);
        };
        
        processLoop();
    }

    shouldProcess() {
        const now = performance.now();
        const timeSinceLastProcess = now - this.lastProcessTime;
        
        return (
            this.eventQueue.length >= this.config.batchSize ||
            (this.eventQueue.length > 0 && timeSinceLastProcess > 1000) ||
            this.feedbackBuffer.length > 0
        );
    }

    async processBatch() {
        this.isProcessing = true;
        const startTime = performance.now();

        try {
            // Process events
            if (this.eventQueue.length > 0) {
                const batch = this.eventQueue.splice(0, this.config.batchSize);
                await this.storeEvents(batch);
            }

            // Process feedback
            if (this.feedbackBuffer.length > 0) {
                const feedbackBatch = this.feedbackBuffer.splice(0, 10);
                await this.storeFeedback(feedbackBatch);
            }

            // Process energy metrics
            if (this.energyMetrics.size > 0) {
                await this.storeEnergyMetrics();
            }

            this.lastProcessTime = performance.now();
            
        } catch (error) {
            console.error('Batch processing failed:', error);
            this.handleProcessingError(error);
        } finally {
            this.isProcessing = false;
            
            const processingTime = performance.now() - startTime;
            if (processingTime > this.config.maxProcessingTime) {
                console.warn(`Batch processing exceeded budget: ${processingTime.toFixed(2)}ms`);
            }
        }
    }

    async storeEvents(events) {
        if (this.usingMemoryFallback) {
            this.memoryStorage.events.push(...events);
            return;
        }

        const transaction = this.db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        
        for (const event of events) {
            await store.add(event);
        }
        
        await transaction.complete;
    }

    async storeFeedback(feedbackItems) {
        if (this.usingMemoryFallback) {
            this.memoryStorage.feedback.push(...feedbackItems);
            return;
        }

        const transaction = this.db.transaction(['feedback'], 'readwrite');
        const store = transaction.objectStore('feedback');
        
        for (const feedback of feedbackItems) {
            await store.add(feedback);
        }
        
        await transaction.complete;
    }

    async storeEnergyMetrics() {
        const metrics = Array.from(this.energyMetrics.values());
        
        if (this.usingMemoryFallback) {
            this.memoryStorage.energyMetrics.push(...metrics);
            this.energyMetrics.clear();
            return;
        }

        const transaction = this.db.transaction(['energyMetrics'], 'readwrite');
        const store = transaction.objectStore('energyMetrics');
        
        for (const metric of metrics) {
            await store.add(metric);
        }
        
        await transaction.complete;
        this.energyMetrics.clear();
    }

    // Privacy and consent management
    hasConsent(dataType) {
        return this.consentStatus.get(dataType) === true;
    }

    updateConsent(dataType, granted) {
        this.consentStatus.set(dataType, granted);
        this.dispatchEvent('consent-updated', { dataType, granted });
        
        if (!granted) {
            this.purgeDataType(dataType);
        }
    }

    async purgeDataType(dataType) {
        // Implementation would remove data based on type
        console.log(`Purging data for type: ${dataType}`);
    }

    // Utility methods
    sanitizeTarget(target) {
        if (!target) return null;
        
        return {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
            dataset: target.dataset
        };
    }

    sanitizeText(text) {
        if (!text) return '';
        
        // Remove potential PII and sanitize
        return text
            .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD]')
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
            .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
            .substring(0, 1000); // Limit length
    }

    getCurrentEnergyContext() {
        return {
            totalEnergy: this.getTotalEnergyUsage(),
            activeComponents: this.getActiveComponents(),
            frameRate: this.getCurrentFrameRate()
        };
    }

    getTotalEnergyUsage() {
        return Array.from(this.energyMetrics.values())
            .reduce((total, metric) => total + (metric.energyValue || 0), 0);
    }

    getActiveComponents() {
        return Array.from(this.energyMetrics.keys());
    }

    getCurrentFrameRate() {
        // Simplified frame rate calculation
        return 60; // Placeholder
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = this.generateId();
        }
        return this.sessionId;
    }

    dispatchEvent(type, detail) {
        document.dispatchEvent(new CustomEvent(`wirthforge:feedback-${type}`, { detail }));
    }

    handleProcessingError(error) {
        // Implement error recovery strategies
        console.error('Processing error:', error);
    }

    // Public API methods
    async exportData(options = {}) {
        if (!this.hasConsent('data-export')) {
            throw new Error('No consent for data export');
        }

        const data = {
            events: await this.getEvents(options),
            feedback: await this.getFeedback(options),
            energyMetrics: await this.getEnergyMetrics(options)
        };

        return data;
    }

    async getEvents(options = {}) {
        if (this.usingMemoryFallback) {
            return this.memoryStorage.events;
        }

        const transaction = this.db.transaction(['events'], 'readonly');
        const store = transaction.objectStore('events');
        return await store.getAll();
    }

    async getFeedback(options = {}) {
        if (this.usingMemoryFallback) {
            return this.memoryStorage.feedback;
        }

        const transaction = this.db.transaction(['feedback'], 'readonly');
        const store = transaction.objectStore('feedback');
        return await store.getAll();
    }

    async getEnergyMetrics(options = {}) {
        if (this.usingMemoryFallback) {
            return this.memoryStorage.energyMetrics;
        }

        const transaction = this.db.transaction(['energyMetrics'], 'readonly');
        const store = transaction.objectStore('energyMetrics');
        return await store.getAll();
    }

    destroy() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        if (this.db) {
            this.db.close();
        }
        
        this.eventQueue = [];
        this.feedbackBuffer = [];
        this.energyMetrics.clear();
    }
}
