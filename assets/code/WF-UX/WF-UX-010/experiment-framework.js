/**
 * WF-UX-010 Experiment Framework Module
 * Manages A/B testing, feature experiments, and controlled research studies
 */

class ExperimentFramework {
    constructor(config = {}) {
        this.config = {
            maxConcurrentExperiments: 5,
            defaultDuration: 7, // days
            minSampleSize: 100,
            confidenceLevel: 0.95,
            maxProcessingTime: 10, // milliseconds
            localOnly: true,
            ...config
        };
        
        this.experiments = new Map();
        this.participantGroups = new Map();
        this.results = new Map();
        this.statisticalEngine = new StatisticalEngine();
        this.auditLogger = new ExperimentAuditLogger();
        
        this.initializeFramework();
    }

    /**
     * Initialize experiment framework
     */
    initializeFramework() {
        this.loadExperiments();
        this.setupEventListeners();
        this.startExperimentMonitoring();
    }

    /**
     * Create new experiment
     */
    async createExperiment(experimentConfig) {
        const startTime = performance.now();
        
        try {
            const validation = this.validateExperimentConfig(experimentConfig);
            if (!validation.valid) {
                throw new ExperimentError(`Invalid experiment config: ${validation.reason}`);
            }

            const activeCount = Array.from(this.experiments.values())
                .filter(exp => exp.status === 'running').length;
            
            if (activeCount >= this.config.maxConcurrentExperiments) {
                throw new ExperimentError('Maximum concurrent experiments limit reached');
            }

            const experimentId = this.generateExperimentId();
            const experiment = {
                id: experimentId,
                name: experimentConfig.name,
                description: experimentConfig.description,
                type: experimentConfig.type || 'ab_test',
                hypothesis: experimentConfig.hypothesis,
                variants: experimentConfig.variants,
                metrics: experimentConfig.metrics,
                targetAudience: experimentConfig.targetAudience,
                duration: experimentConfig.duration || this.config.defaultDuration,
                sampleSize: experimentConfig.sampleSize || this.config.minSampleSize,
                confidenceLevel: experimentConfig.confidenceLevel || this.config.confidenceLevel,
                status: 'draft',
                createdAt: Date.now(),
                createdBy: experimentConfig.createdBy || 'system',
                version: '1.0.0',
                governance: {
                    approved: false,
                    approvedBy: null,
                    approvedAt: null,
                    ethicsReview: experimentConfig.ethicsReview || false
                },
                privacy: {
                    consentRequired: true,
                    dataMinimization: true,
                    anonymization: 'automatic',
                    retention: experimentConfig.retention || { period: 30, unit: 'days' }
                },
                allocation: {
                    method: experimentConfig.allocation?.method || 'random',
                    stratification: experimentConfig.allocation?.stratification || null,
                    balancing: experimentConfig.allocation?.balancing || 'equal'
                }
            };

            this.experiments.set(experimentId, experiment);
            await this.saveExperiments();

            await this.auditLogger.log({
                action: 'experiment_created',
                experimentId,
                name: experiment.name,
                type: experiment.type,
                timestamp: Date.now()
            });

            const processingTime = performance.now() - startTime;
            if (processingTime > this.config.maxProcessingTime) {
                console.warn(`Experiment creation exceeded time budget: ${processingTime}ms`);
            }

            return experiment;

        } catch (error) {
            await this.auditLogger.log({
                action: 'experiment_creation_error',
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Start experiment
     */
    async startExperiment(experimentId, approvalDetails = null) {
        try {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                throw new ExperimentError(`Experiment not found: ${experimentId}`);
            }

            if (experiment.status !== 'draft' && experiment.status !== 'approved') {
                throw new ExperimentError(`Cannot start experiment in status: ${experiment.status}`);
            }

            if (!experiment.governance.approved && !approvalDetails) {
                throw new ExperimentError('Experiment requires governance approval before starting');
            }

            if (approvalDetails) {
                experiment.governance.approved = true;
                experiment.governance.approvedBy = approvalDetails.approvedBy;
                experiment.governance.approvedAt = Date.now();
            }

            await this.initializeParticipantAllocation(experiment);

            experiment.status = 'running';
            experiment.startedAt = Date.now();
            experiment.endAt = Date.now() + (experiment.duration * 24 * 60 * 60 * 1000);

            await this.saveExperiments();

            await this.auditLogger.log({
                action: 'experiment_started',
                experimentId,
                startedAt: experiment.startedAt,
                endAt: experiment.endAt,
                timestamp: Date.now()
            });

            document.dispatchEvent(new CustomEvent('experiment-started', {
                detail: { experimentId, experiment }
            }));

            return experiment;

        } catch (error) {
            await this.auditLogger.log({
                action: 'experiment_start_error',
                experimentId,
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Assign participant to experiment variant
     */
    async assignParticipant(experimentId, participantId, context = {}) {
        const startTime = performance.now();
        
        try {
            const experiment = this.experiments.get(experimentId);
            if (!experiment || experiment.status !== 'running') {
                return null;
            }

            const existingAssignment = this.getParticipantAssignment(experimentId, participantId);
            if (existingAssignment) {
                return existingAssignment;
            }

            const eligible = await this.checkParticipantEligibility(experiment, participantId, context);
            if (!eligible.eligible) {
                await this.auditLogger.log({
                    action: 'participant_ineligible',
                    experimentId,
                    participantId,
                    reason: eligible.reason,
                    timestamp: Date.now()
                });
                return null;
            }

            const variant = await this.allocateToVariant(experiment, participantId, context);
            
            const assignment = {
                experimentId,
                participantId,
                variant: variant.id,
                assignedAt: Date.now(),
                context: this.sanitizeContext(context),
                status: 'active'
            };

            const groupKey = `${experimentId}:${variant.id}`;
            if (!this.participantGroups.has(groupKey)) {
                this.participantGroups.set(groupKey, []);
            }
            this.participantGroups.get(groupKey).push(assignment);

            await this.auditLogger.log({
                action: 'participant_assigned',
                experimentId,
                participantId,
                variant: variant.id,
                timestamp: Date.now()
            });

            const processingTime = performance.now() - startTime;
            if (processingTime > this.config.maxProcessingTime) {
                console.warn(`Participant assignment exceeded time budget: ${processingTime}ms`);
            }

            return assignment;

        } catch (error) {
            await this.auditLogger.log({
                action: 'assignment_error',
                experimentId,
                participantId,
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Record experiment event
     */
    async recordEvent(experimentId, participantId, eventType, eventData = {}) {
        try {
            const assignment = this.getParticipantAssignment(experimentId, participantId);
            if (!assignment) {
                return;
            }

            const event = {
                experimentId,
                participantId,
                variant: assignment.variant,
                eventType,
                eventData: this.sanitizeEventData(eventData),
                timestamp: Date.now(),
                sessionId: eventData.sessionId || null
            };

            await this.storeExperimentEvent(event);
            await this.updateRealTimeMetrics(experimentId, event);

            await this.auditLogger.log({
                action: 'event_recorded',
                experimentId,
                participantId,
                eventType,
                timestamp: Date.now()
            });

        } catch (error) {
            await this.auditLogger.log({
                action: 'event_recording_error',
                experimentId,
                participantId,
                eventType,
                error: error.message,
                timestamp: Date.now()
            });
            console.error('Failed to record experiment event:', error);
        }
    }

    /**
     * Analyze experiment results
     */
    async analyzeExperiment(experimentId, analysisType = 'interim') {
        const startTime = performance.now();
        
        try {
            const experiment = this.experiments.get(experimentId);
            if (!experiment) {
                throw new ExperimentError(`Experiment not found: ${experimentId}`);
            }

            const data = await this.collectExperimentData(experimentId);
            const analysis = await this.performStatisticalAnalysis(experiment, data);
            const insights = this.generateInsights(experiment, analysis);
            
            const results = {
                experimentId,
                analysisType,
                analyzedAt: Date.now(),
                sampleSizes: data.sampleSizes,
                metrics: analysis.metrics,
                significance: analysis.significance,
                effect: analysis.effect,
                confidence: analysis.confidence,
                insights: insights,
                recommendations: this.generateRecommendations(experiment, analysis),
                processingTime: performance.now() - startTime
            };

            this.results.set(`${experimentId}:${analysisType}:${Date.now()}`, results);

            await this.auditLogger.log({
                action: 'experiment_analyzed',
                experimentId,
                analysisType,
                significant: analysis.significance.significant,
                timestamp: Date.now()
            });

            document.dispatchEvent(new CustomEvent('experiment-analyzed', {
                detail: { experimentId, results }
            }));

            return results;

        } catch (error) {
            await this.auditLogger.log({
                action: 'analysis_error',
                experimentId,
                analysisType,
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Allocate participant to variant
     */
    async allocateToVariant(experiment, participantId, context) {
        switch (experiment.allocation.method) {
            case 'random':
                return this.randomAllocation(experiment);
            case 'deterministic':
                return this.deterministicAllocation(experiment, participantId);
            case 'stratified':
                return this.stratifiedAllocation(experiment, participantId, context);
            default:
                return this.randomAllocation(experiment);
        }
    }

    /**
     * Random variant allocation
     */
    randomAllocation(experiment) {
        const variants = experiment.variants;
        const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
        const random = Math.random() * totalWeight;
        
        let cumulative = 0;
        for (const variant of variants) {
            cumulative += (variant.weight || 1);
            if (random <= cumulative) {
                return variant;
            }
        }
        
        return variants[0];
    }

    /**
     * Deterministic variant allocation based on participant ID
     */
    deterministicAllocation(experiment, participantId) {
        let hash = 0;
        for (let i = 0; i < participantId.length; i++) {
            const char = participantId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const index = Math.abs(hash) % experiment.variants.length;
        return experiment.variants[index];
    }

    /**
     * Perform statistical analysis
     */
    async performStatisticalAnalysis(experiment, data) {
        const analysis = {
            metrics: {},
            significance: {},
            effect: {},
            confidence: {}
        };

        for (const metric of experiment.metrics) {
            const metricData = data.metrics[metric.name];
            if (!metricData) continue;

            const variantStats = {};
            for (const variant of experiment.variants) {
                const variantData = metricData[variant.id] || [];
                variantStats[variant.id] = this.statisticalEngine.calculateStats(variantData);
            }

            analysis.metrics[metric.name] = variantStats;

            if (experiment.variants.length === 2) {
                const controlData = metricData[experiment.variants[0].id] || [];
                const treatmentData = metricData[experiment.variants[1].id] || [];
                
                const testResult = this.statisticalEngine.twoSampleTest(
                    controlData, 
                    treatmentData, 
                    experiment.confidenceLevel
                );
                
                analysis.significance[metric.name] = testResult;
                analysis.effect[metric.name] = testResult.effectSize;
                analysis.confidence[metric.name] = testResult.confidenceInterval;
            } else {
                const allVariantData = experiment.variants.map(v => metricData[v.id] || []);
                const anovaResult = this.statisticalEngine.anova(allVariantData, experiment.confidenceLevel);
                
                analysis.significance[metric.name] = anovaResult;
            }
        }

        return analysis;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('user-interaction', (event) => {
            this.handleUserInteraction(event.detail);
        });

        document.addEventListener('performance-metric', (event) => {
            this.handlePerformanceMetric(event.detail);
        });

        document.addEventListener('experiment-control', (event) => {
            this.handleExperimentControl(event.detail);
        });
    }

    /**
     * Start experiment monitoring
     */
    startExperimentMonitoring() {
        setInterval(() => {
            this.monitorActiveExperiments();
        }, 60000);
    }

    /**
     * Monitor active experiments
     */
    async monitorActiveExperiments() {
        const activeExperiments = Array.from(this.experiments.values())
            .filter(exp => exp.status === 'running');

        for (const experiment of activeExperiments) {
            if (Date.now() >= experiment.endAt) {
                await this.stopExperiment(experiment.id, 'duration_reached');
            }

            const earlyStopCheck = await this.checkEarlyStoppingConditions(experiment);
            if (earlyStopCheck.shouldStop) {
                await this.stopExperiment(experiment.id, earlyStopCheck.reason);
            }
        }
    }

    // Utility methods
    generateExperimentId() {
        return `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    }

    validateExperimentConfig(config) {
        if (!config.name) return { valid: false, reason: 'Name is required' };
        if (!config.variants || config.variants.length < 2) {
            return { valid: false, reason: 'At least 2 variants required' };
        }
        if (!config.metrics || config.metrics.length === 0) {
            return { valid: false, reason: 'At least 1 metric required' };
        }
        return { valid: true };
    }

    sanitizeContext(context) {
        const sanitized = { ...context };
        delete sanitized.userId;
        delete sanitized.email;
        delete sanitized.personalInfo;
        return sanitized;
    }

    sanitizeEventData(eventData) {
        const sanitized = { ...eventData };
        delete sanitized.userId;
        delete sanitized.personalInfo;
        return sanitized;
    }

    async saveExperiments() {
        try {
            const experimentsObj = Object.fromEntries(this.experiments);
            localStorage.setItem('wirthforge_experiments', JSON.stringify(experimentsObj));
        } catch (error) {
            console.error('Failed to save experiments:', error);
        }
    }

    // Public API
    getExperiment(experimentId) {
        return this.experiments.get(experimentId);
    }

    getActiveExperiments() {
        return Array.from(this.experiments.values())
            .filter(exp => exp.status === 'running');
    }

    getParticipantAssignment(experimentId, participantId) {
        for (const [groupKey, assignments] of this.participantGroups) {
            if (groupKey.startsWith(experimentId)) {
                const assignment = assignments.find(a => a.participantId === participantId);
                if (assignment) return assignment;
            }
        }
        return null;
    }

    async exportExperimentData(experimentId, format = 'json') {
        const experiment = this.experiments.get(experimentId);
        const results = this.getExperimentResults(experimentId);
        const data = await this.collectExperimentData(experimentId);

        return {
            experiment,
            results,
            data,
            exportedAt: Date.now(),
            format
        };
    }
}

/**
 * Statistical Engine for experiment analysis
 */
class StatisticalEngine {
    calculateStats(data) {
        if (!data || data.length === 0) {
            return { mean: 0, std: 0, count: 0, min: 0, max: 0 };
        }

        const count = data.length;
        const mean = data.reduce((sum, val) => sum + val, 0) / count;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
        const std = Math.sqrt(variance);
        const min = Math.min(...data);
        const max = Math.max(...data);

        return { mean, std, count, min, max, variance };
    }

    twoSampleTest(control, treatment, confidenceLevel = 0.95) {
        const controlStats = this.calculateStats(control);
        const treatmentStats = this.calculateStats(treatment);

        const pooledStd = Math.sqrt(
            (controlStats.variance / controlStats.count) +
            (treatmentStats.variance / treatmentStats.count)
        );

        const tStat = (treatmentStats.mean - controlStats.mean) / pooledStd;
        const pValue = this.calculatePValue(Math.abs(tStat));
        const alpha = 1 - confidenceLevel;
        const significant = pValue < alpha;

        const pooledVariance = ((controlStats.count - 1) * controlStats.variance + 
                               (treatmentStats.count - 1) * treatmentStats.variance) /
                              (controlStats.count + treatmentStats.count - 2);
        const effectSize = (treatmentStats.mean - controlStats.mean) / Math.sqrt(pooledVariance);

        const meanDifference = treatmentStats.mean - controlStats.mean;
        const marginOfError = 1.96 * pooledStd; // Approximate
        const confidenceInterval = [
            meanDifference - marginOfError,
            meanDifference + marginOfError
        ];

        return {
            tStatistic: tStat,
            pValue,
            significant,
            effectSize,
            confidenceInterval,
            controlStats,
            treatmentStats
        };
    }

    anova(groups, confidenceLevel = 0.95) {
        const k = groups.length;
        const n = groups.reduce((sum, group) => sum + group.length, 0);

        if (k < 2 || n < k + 1) {
            return { significant: false, reason: 'Insufficient data for ANOVA' };
        }

        const groupMeans = groups.map(group => this.calculateStats(group).mean);
        const overallMean = groups.flat().reduce((sum, val) => sum + val, 0) / n;

        let ssBetween = 0;
        let ssWithin = 0;

        groups.forEach((group, i) => {
            const groupMean = groupMeans[i];
            ssBetween += group.length * Math.pow(groupMean - overallMean, 2);
            
            group.forEach(val => {
                ssWithin += Math.pow(val - groupMean, 2);
            });
        });

        const dfBetween = k - 1;
        const dfWithin = n - k;
        const msBetween = ssBetween / dfBetween;
        const msWithin = ssWithin / dfWithin;
        const fStat = msBetween / msWithin;

        const pValue = this.calculateFPValue(fStat);
        const alpha = 1 - confidenceLevel;
        const significant = pValue < alpha;

        return {
            fStatistic: fStat,
            pValue,
            significant,
            dfBetween,
            dfWithin,
            ssBetween,
            ssWithin,
            groupMeans
        };
    }

    calculatePValue(tStat) {
        return Math.max(0.001, 2 * (1 - this.normalCDF(Math.abs(tStat))));
    }

    calculateFPValue(fStat) {
        return Math.max(0.001, 1 - this.normalCDF(fStat));
    }

    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }
}

/**
 * Experiment Audit Logger
 */
class ExperimentAuditLogger {
    constructor() {
        this.logs = [];
    }

    async log(entry) {
        const logEntry = {
            id: `EXP-LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...entry,
            loggedAt: Date.now()
        };

        this.logs.push(logEntry);
        
        try {
            const stored = localStorage.getItem('wirthforge_experiment_logs') || '[]';
            const logs = JSON.parse(stored);
            logs.push(logEntry);
            localStorage.setItem('wirthforge_experiment_logs', JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to store experiment log:', error);
        }

        return logEntry.id;
    }

    getLogs(experimentId = null, timeRange = null) {
        let filtered = [...this.logs];
        
        if (experimentId) {
            filtered = filtered.filter(log => log.experimentId === experimentId);
        }
        
        if (timeRange) {
            filtered = filtered.filter(log => 
                log.timestamp >= timeRange.start && 
                log.timestamp <= timeRange.end
            );
        }
        
        return filtered;
    }
}

/**
 * Custom error class for experiment operations
 */
class ExperimentError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ExperimentError';
        this.details = details;
    }
}

// Export for use in WIRTHFORGE system
export { ExperimentFramework, StatisticalEngine, ExperimentAuditLogger, ExperimentError };
