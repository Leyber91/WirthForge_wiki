/**
 * WIRTHFORGE Alert Engine
 * 
 * Evaluates alert rules against incoming metrics and triggers local notifications.
 * Supports complex rule conditions, debouncing, escalation, and user-controlled actions.
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class AlertEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            maxRules: options.maxRules || 1000,
            evaluationBudgetMs: options.evaluationBudgetMs || 2.0,
            maxAlertsPerSecond: options.maxAlertsPerSecond || 10,
            defaultCooldownMs: options.defaultCooldownMs || 30000,
            ...options
        };
        
        this.isRunning = false;
        this.rules = new Map(); // Rule ID -> Rule instance
        this.alertStates = new Map(); // Rule ID -> Alert state
        this.recentAlerts = []; // Recent alerts for rate limiting
        this.statistics = {
            rulesEvaluated: 0,
            alertsTriggered: 0,
            alertsSuppressed: 0,
            avgEvaluationTime: 0
        };
        
        // Initialize rule evaluator
        this.evaluator = new RuleEvaluator();
        this.stateManager = new AlertStateManager();
        this.rateLimiter = new AlertRateLimiter(this.config.maxAlertsPerSecond);
    }
    
    /**
     * Start the alert engine
     */
    async start() {
        if (this.isRunning) {
            throw new Error('AlertEngine is already running');
        }
        
        this.isRunning = true;
        this.emit('started');
    }
    
    /**
     * Stop the alert engine
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        this.emit('stopped');
    }
    
    /**
     * Load alert rules from configuration
     */
    async loadRules(rulesConfig) {
        const loadedRules = [];
        
        for (const ruleConfig of rulesConfig) {
            try {
                const rule = await this.createRule(ruleConfig);
                this.addRule(rule);
                loadedRules.push(rule.id);
            } catch (error) {
                this.emit('ruleLoadError', { ruleConfig, error });
            }
        }
        
        this.emit('rulesLoaded', { count: loadedRules.length, rules: loadedRules });
        return loadedRules;
    }
    
    /**
     * Create a rule instance from configuration
     */
    async createRule(config) {
        // Validate rule configuration
        this.validateRuleConfig(config);
        
        const rule = new AlertRule(config);
        await rule.initialize();
        
        return rule;
    }
    
    /**
     * Validate rule configuration
     */
    validateRuleConfig(config) {
        const required = ['id', 'name', 'enabled', 'severity', 'conditions', 'actions'];
        
        for (const field of required) {
            if (!(field in config)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        if (this.rules.has(config.id)) {
            throw new Error(`Rule with ID ${config.id} already exists`);
        }
        
        if (this.rules.size >= this.config.maxRules) {
            throw new Error(`Maximum number of rules (${this.config.maxRules}) reached`);
        }
    }
    
    /**
     * Add a rule to the engine
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
        this.alertStates.set(rule.id, this.stateManager.createState(rule));
        this.emit('ruleAdded', rule.id);
    }
    
    /**
     * Remove a rule from the engine
     */
    removeRule(ruleId) {
        if (this.rules.has(ruleId)) {
            this.rules.delete(ruleId);
            this.alertStates.delete(ruleId);
            this.emit('ruleRemoved', ruleId);
        }
    }
    
    /**
     * Update an existing rule
     */
    updateRule(ruleId, newConfig) {
        if (!this.rules.has(ruleId)) {
            throw new Error(`Rule ${ruleId} not found`);
        }
        
        const newRule = new AlertRule(newConfig);
        this.rules.set(ruleId, newRule);
        
        // Reset alert state for updated rule
        this.alertStates.set(ruleId, this.stateManager.createState(newRule));
        
        this.emit('ruleUpdated', ruleId);
    }
    
    /**
     * Evaluate metrics against all rules
     */
    async evaluateMetrics(metrics) {
        if (!this.isRunning) {
            return;
        }
        
        const startTime = performance.now();
        const triggeredAlerts = [];
        
        try {
            for (const [ruleId, rule] of this.rules) {
                if (!rule.enabled) {
                    continue;
                }
                
                try {
                    const alertState = this.alertStates.get(ruleId);
                    const evaluation = await this.evaluateRule(rule, metrics, alertState);
                    
                    if (evaluation.triggered) {
                        const alert = await this.processTriggeredAlert(rule, evaluation, alertState);
                        if (alert) {
                            triggeredAlerts.push(alert);
                        }
                    } else if (evaluation.resolved && alertState.isActive()) {
                        await this.processResolvedAlert(rule, alertState);
                    }
                    
                    this.statistics.rulesEvaluated++;
                    
                } catch (error) {
                    this.emit('ruleEvaluationError', { ruleId, error });
                }
            }
            
            // Update statistics
            const evaluationTime = performance.now() - startTime;
            this.updateEvaluationStatistics(evaluationTime);
            
            // Check evaluation budget
            if (evaluationTime > this.config.evaluationBudgetMs) {
                console.warn(`AlertEngine evaluation exceeded budget: ${evaluationTime.toFixed(2)}ms`);
            }
            
            // Emit batch of triggered alerts
            if (triggeredAlerts.length > 0) {
                this.emit('alertsTriggered', triggeredAlerts);
            }
            
        } catch (error) {
            this.emit('error', error);
        }
    }
    
    /**
     * Evaluate a single rule against metrics
     */
    async evaluateRule(rule, metrics, alertState) {
        const relevantMetrics = this.filterRelevantMetrics(rule, metrics);
        
        if (relevantMetrics.length === 0) {
            return { triggered: false, resolved: false };
        }
        
        const conditionResult = await this.evaluator.evaluate(rule.conditions, relevantMetrics);
        
        return {
            triggered: conditionResult.result && !alertState.isActive(),
            resolved: !conditionResult.result && alertState.isActive(),
            conditionResult,
            evaluatedMetrics: relevantMetrics
        };
    }
    
    /**
     * Filter metrics relevant to a rule
     */
    filterRelevantMetrics(rule, metrics) {
        const relevantSources = this.extractRelevantSources(rule.conditions);
        
        return metrics.filter(metric => {
            return relevantSources.some(source => {
                if (source === '*') return true;
                if (source.endsWith('*')) {
                    return metric.source.startsWith(source.slice(0, -1));
                }
                return metric.source === source;
            });
        });
    }
    
    /**
     * Extract relevant sources from rule conditions
     */
    extractRelevantSources(conditions) {
        const sources = new Set();
        
        const extractFromConditionArray = (condArray) => {
            for (const condition of condArray) {
                if (condition.metric) {
                    const parts = condition.metric.split('.');
                    if (parts.length > 0) {
                        sources.add(parts[0]);
                    }
                }
            }
        };
        
        if (conditions.when_all) extractFromConditionArray(conditions.when_all);
        if (conditions.when_any) extractFromConditionArray(conditions.when_any);
        if (conditions.when_not) extractFromConditionArray(conditions.when_not);
        
        return Array.from(sources);
    }
    
    /**
     * Process a triggered alert
     */
    async processTriggeredAlert(rule, evaluation, alertState) {
        // Check debouncing
        if (this.stateManager.isDebounced(alertState)) {
            this.statistics.alertsSuppressed++;
            return null;
        }
        
        // Check rate limiting
        if (!this.rateLimiter.allowAlert()) {
            this.statistics.alertsSuppressed++;
            return null;
        }
        
        // Create alert
        const alert = {
            id: this.generateAlertId(),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            category: rule.category,
            message: this.generateAlertMessage(rule, evaluation),
            timestamp: Date.now(),
            conditions: evaluation.conditionResult,
            actions: rule.actions,
            metadata: {
                evaluatedMetrics: evaluation.evaluatedMetrics.length,
                triggerTime: performance.now()
            }
        };
        
        // Update alert state
        this.stateManager.activate(alertState, alert);
        
        // Execute actions
        await this.executeAlertActions(alert, rule.actions);
        
        this.statistics.alertsTriggered++;
        this.recentAlerts.push({
            timestamp: Date.now(),
            ruleId: rule.id,
            severity: rule.severity
        });
        
        return alert;
    }
    
    /**
     * Process a resolved alert
     */
    async processResolvedAlert(rule, alertState) {
        const resolvedAlert = {
            id: this.generateAlertId(),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: 'info',
            category: rule.category,
            message: `${rule.name} has been resolved`,
            timestamp: Date.now(),
            resolved: true,
            originalAlert: alertState.getActiveAlert()
        };
        
        // Update alert state
        this.stateManager.resolve(alertState);
        
        // Execute resolution actions if defined
        const resolutionActions = rule.actions.filter(action => 
            action.type.startsWith('resolve.') || action.on_resolution
        );
        
        if (resolutionActions.length > 0) {
            await this.executeAlertActions(resolvedAlert, resolutionActions);
        }
        
        this.emit('alertResolved', resolvedAlert);
    }
    
    /**
     * Execute alert actions
     */
    async executeAlertActions(alert, actions) {
        for (const action of actions) {
            try {
                await this.executeAction(alert, action);
            } catch (error) {
                this.emit('actionExecutionError', { alert, action, error });
            }
        }
    }
    
    /**
     * Execute a single alert action
     */
    async executeAction(alert, action) {
        switch (action.type) {
            case 'notify.toast':
                this.emit('notification', {
                    type: 'toast',
                    level: action.level || alert.severity,
                    message: action.message,
                    duration: action.duration_ms || 5000,
                    alert
                });
                break;
                
            case 'notify.sound':
                this.emit('notification', {
                    type: 'sound',
                    sound: action.sound,
                    volume: action.volume || 0.5,
                    alert
                });
                break;
                
            case 'notify.dashboard':
                this.emit('notification', {
                    type: 'dashboard',
                    panel: action.panel,
                    highlight: action.highlight,
                    message: action.message,
                    alert
                });
                break;
                
            case 'log.audit':
                this.emit('log', {
                    level: 'audit',
                    category: action.category,
                    message: action.message || alert.message,
                    details: action.details,
                    alert
                });
                break;
                
            case 'log.debug':
                this.emit('log', {
                    level: 'debug',
                    category: action.category,
                    message: action.message || alert.message,
                    details: action.details,
                    alert
                });
                break;
                
            case 'suggest.mitigation':
                this.emit('suggestion', {
                    type: 'mitigation',
                    target: action.target,
                    message: action.message,
                    actions: action.actions,
                    alert
                });
                break;
                
            case 'suggest.diagnostic':
                this.emit('suggestion', {
                    type: 'diagnostic',
                    target: action.target,
                    message: action.message,
                    alert
                });
                break;
                
            case 'signal.backup':
                this.emit('signal', {
                    target: 'backup',
                    message: action.message,
                    duration: action.duration_ms,
                    alert
                });
                break;
                
            case 'signal.performance':
                this.emit('signal', {
                    target: 'performance',
                    message: action.message,
                    alert
                });
                break;
                
            case 'webhook.local':
                await this.executeLocalWebhook(alert, action);
                break;
                
            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }
    
    /**
     * Execute local webhook action
     */
    async executeLocalWebhook(alert, action) {
        if (!action.url || !action.url.startsWith('http://127.0.0.1:')) {
            throw new Error('Local webhooks must use localhost (127.0.0.1)');
        }
        
        const payload = {
            alert,
            action,
            timestamp: Date.now(),
            ...action.body
        };
        
        // This would need to be implemented with actual HTTP client
        this.emit('webhook', {
            url: action.url,
            method: action.method || 'POST',
            headers: action.headers || {},
            body: payload
        });
    }
    
    /**
     * Generate alert message from rule and evaluation
     */
    generateAlertMessage(rule, evaluation) {
        let message = rule.name;
        
        if (evaluation.conditionResult.details) {
            const details = evaluation.conditionResult.details
                .map(d => `${d.metric}: ${d.value} ${d.operator} ${d.threshold}`)
                .join(', ');
            message += ` (${details})`;
        }
        
        return message;
    }
    
    /**
     * Generate unique alert ID
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Update evaluation statistics
     */
    updateEvaluationStatistics(evaluationTime) {
        const alpha = 0.1; // Exponential moving average factor
        this.statistics.avgEvaluationTime = 
            (1 - alpha) * this.statistics.avgEvaluationTime + alpha * evaluationTime;
    }
    
    /**
     * Get current statistics
     */
    getStatistics() {
        const activeRules = Array.from(this.rules.values()).filter(rule => rule.enabled).length;
        const activeAlerts = Array.from(this.alertStates.values()).filter(state => state.isActive()).length;
        
        // Clean up old recent alerts
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        this.recentAlerts = this.recentAlerts.filter(alert => alert.timestamp > fiveMinutesAgo);
        
        return {
            ...this.statistics,
            isRunning: this.isRunning,
            totalRules: this.rules.size,
            activeRules,
            activeAlerts,
            recentAlertsCount: this.recentAlerts.length,
            rateLimitStatus: this.rateLimiter.getStatus()
        };
    }
    
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        const activeAlerts = [];
        
        for (const [ruleId, alertState] of this.alertStates) {
            if (alertState.isActive()) {
                const rule = this.rules.get(ruleId);
                activeAlerts.push({
                    ruleId,
                    ruleName: rule ? rule.name : 'Unknown',
                    severity: rule ? rule.severity : 'unknown',
                    alert: alertState.getActiveAlert(),
                    duration: Date.now() - alertState.getActivationTime()
                });
            }
        }
        
        return activeAlerts.sort((a, b) => b.alert.timestamp - a.alert.timestamp);
    }
}

/**
 * Alert rule class
 */
class AlertRule {
    constructor(config) {
        this.id = config.id;
        this.version = config.version || '1.0';
        this.name = config.name;
        this.description = config.description;
        this.enabled = config.enabled !== false;
        this.severity = config.severity;
        this.category = config.category;
        this.conditions = config.conditions;
        this.actions = config.actions || [];
        this.debounce = config.debounce || {};
        this.privacy = config.privacy || 'local_only';
        this.userConfigurable = config.user_configurable !== false;
        this.tags = config.tags || [];
        this.createdAt = config.created_at || new Date().toISOString();
        this.updatedAt = config.updated_at || new Date().toISOString();
    }
    
    async initialize() {
        // Validate conditions
        this.validateConditions();
        
        // Validate actions
        this.validateActions();
    }
    
    validateConditions() {
        if (!this.conditions) {
            throw new Error('Rule conditions are required');
        }
        
        const hasConditions = 
            this.conditions.when_all || 
            this.conditions.when_any || 
            this.conditions.when_not;
        
        if (!hasConditions) {
            throw new Error('Rule must have at least one condition type');
        }
    }
    
    validateActions() {
        if (!this.actions || this.actions.length === 0) {
            throw new Error('Rule must have at least one action');
        }
        
        for (const action of this.actions) {
            if (!action.type) {
                throw new Error('Action must have a type');
            }
        }
    }
}

/**
 * Rule evaluator for condition logic
 */
class RuleEvaluator {
    async evaluate(conditions, metrics) {
        const results = {
            result: false,
            details: []
        };
        
        if (conditions.when_all) {
            results.result = await this.evaluateAll(conditions.when_all, metrics, results.details);
        } else if (conditions.when_any) {
            results.result = await this.evaluateAny(conditions.when_any, metrics, results.details);
        } else if (conditions.when_not) {
            results.result = !(await this.evaluateAny(conditions.when_not, metrics, results.details));
        }
        
        return results;
    }
    
    async evaluateAll(conditions, metrics, details) {
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, metrics);
            details.push(result);
            
            if (!result.result) {
                return false;
            }
        }
        return true;
    }
    
    async evaluateAny(conditions, metrics, details) {
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, metrics);
            details.push(result);
            
            if (result.result) {
                return true;
            }
        }
        return false;
    }
    
    async evaluateCondition(condition, metrics) {
        const { metric, operator, value, window, aggregation, baseline, threshold_type } = condition;
        
        // Find relevant metrics
        const relevantMetrics = this.findRelevantMetrics(metric, metrics, window);
        
        if (relevantMetrics.length === 0) {
            return {
                result: false,
                metric,
                operator,
                value,
                actualValue: null,
                reason: 'No relevant metrics found'
            };
        }
        
        // Extract values and aggregate
        const values = this.extractValues(metric, relevantMetrics);
        const aggregatedValue = this.aggregate(values, aggregation || 'avg');
        
        // Apply baseline comparison if specified
        let comparisonValue = aggregatedValue;
        if (baseline) {
            const baselineValue = await this.getBaselineValue(metric, baseline);
            comparisonValue = this.applyThresholdType(aggregatedValue, baselineValue, threshold_type || 'absolute', value);
        }
        
        // Evaluate condition
        const result = this.compareValues(comparisonValue, operator, value);
        
        return {
            result,
            metric,
            operator,
            value,
            actualValue: comparisonValue,
            aggregatedValue,
            sampleCount: values.length
        };
    }
    
    findRelevantMetrics(metricPath, metrics, window) {
        const windowMs = this.parseWindow(window);
        const cutoffTime = Date.now() - windowMs;
        
        return metrics.filter(metric => {
            return metric.timestamp >= cutoffTime && this.hasMetricPath(metric, metricPath);
        });
    }
    
    hasMetricPath(metric, path) {
        const parts = path.split('.');
        let current = metric;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return false;
            }
        }
        
        return true;
    }
    
    extractValues(metricPath, metrics) {
        const values = [];
        
        for (const metric of metrics) {
            const value = this.getNestedValue(metric, metricPath);
            if (typeof value === 'number' && !isNaN(value)) {
                values.push(value);
            }
        }
        
        return values;
    }
    
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    }
    
    aggregate(values, aggregation) {
        if (values.length === 0) return 0;
        
        switch (aggregation) {
            case 'min': return Math.min(...values);
            case 'max': return Math.max(...values);
            case 'avg': return values.reduce((a, b) => a + b) / values.length;
            case 'sum': return values.reduce((a, b) => a + b, 0);
            case 'count': return values.length;
            case 'p50': return this.percentile(values, 0.5);
            case 'p95': return this.percentile(values, 0.95);
            case 'p99': return this.percentile(values, 0.99);
            case 'last': return values[values.length - 1];
            default: return values.reduce((a, b) => a + b) / values.length;
        }
    }
    
    percentile(values, p) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
    
    parseWindow(window) {
        if (!window || window === 'instant') return 0;
        
        const match = window.match(/^(\d+)(s|m|h)$/);
        if (!match) return 0;
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            default: return 0;
        }
    }
    
    async getBaselineValue(metric, baseline) {
        // This would need to query historical data
        // For now, return a placeholder
        return 0;
    }
    
    applyThresholdType(current, baseline, thresholdType, threshold) {
        switch (thresholdType) {
            case 'absolute':
                return current;
            case 'percentage_change':
                return baseline !== 0 ? ((current - baseline) / baseline) * 100 : 0;
            case 'standard_deviation':
                // Would need historical data to calculate std dev
                return current;
            default:
                return current;
        }
    }
    
    compareValues(actual, operator, expected) {
        switch (operator) {
            case '>': return actual > expected;
            case '>=': return actual >= expected;
            case '<': return actual < expected;
            case '<=': return actual <= expected;
            case '==': return actual === expected;
            case '!=': return actual !== expected;
            case 'contains': return String(actual).includes(String(expected));
            case 'not_contains': return !String(actual).includes(String(expected));
            case 'regex': return new RegExp(expected).test(String(actual));
            default: return false;
        }
    }
}

/**
 * Alert state manager
 */
class AlertStateManager {
    createState(rule) {
        return new AlertState(rule);
    }
    
    isDebounced(alertState) {
        return alertState.isDebounced();
    }
    
    activate(alertState, alert) {
        alertState.activate(alert);
    }
    
    resolve(alertState) {
        alertState.resolve();
    }
}

/**
 * Alert state tracking
 */
class AlertState {
    constructor(rule) {
        this.rule = rule;
        this.state = 'inactive'; // inactive, active, resolved
        this.activeAlert = null;
        this.activationTime = null;
        this.lastTriggerTime = null;
        this.triggerCount = 0;
        this.escalationLevel = 0;
    }
    
    isActive() {
        return this.state === 'active';
    }
    
    isDebounced() {
        if (!this.lastTriggerTime || !this.rule.debounce.cooldown_ms) {
            return false;
        }
        
        const timeSinceLastTrigger = Date.now() - this.lastTriggerTime;
        return timeSinceLastTrigger < this.rule.debounce.cooldown_ms;
    }
    
    activate(alert) {
        this.state = 'active';
        this.activeAlert = alert;
        this.activationTime = Date.now();
        this.lastTriggerTime = Date.now();
        this.triggerCount++;
        
        // Check for escalation
        this.checkEscalation();
    }
    
    resolve() {
        this.state = 'resolved';
        this.activeAlert = null;
        this.activationTime = null;
        this.escalationLevel = 0;
    }
    
    checkEscalation() {
        const escalation = this.rule.debounce.escalation;
        if (!escalation) return;
        
        let shouldEscalate = false;
        
        if (escalation.after_count && this.triggerCount >= escalation.after_count) {
            shouldEscalate = true;
        }
        
        if (escalation.after_duration_ms && this.activationTime) {
            const activeDuration = Date.now() - this.activationTime;
            if (activeDuration >= escalation.after_duration_ms) {
                shouldEscalate = true;
            }
        }
        
        if (shouldEscalate && escalation.upgrade_to) {
            this.escalationLevel++;
            // Update rule severity temporarily
            this.rule.severity = escalation.upgrade_to;
        }
    }
    
    getActiveAlert() {
        return this.activeAlert;
    }
    
    getActivationTime() {
        return this.activationTime;
    }
}

/**
 * Alert rate limiter
 */
class AlertRateLimiter {
    constructor(maxAlertsPerSecond) {
        this.maxAlertsPerSecond = maxAlertsPerSecond;
        this.alertTimes = [];
    }
    
    allowAlert() {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        
        // Clean up old alert times
        this.alertTimes = this.alertTimes.filter(time => time > oneSecondAgo);
        
        // Check rate limit
        if (this.alertTimes.length >= this.maxAlertsPerSecond) {
            return false;
        }
        
        // Record this alert
        this.alertTimes.push(now);
        return true;
    }
    
    getStatus() {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        const recentAlerts = this.alertTimes.filter(time => time > oneSecondAgo).length;
        
        return {
            maxAlertsPerSecond: this.maxAlertsPerSecond,
            recentAlerts,
            remaining: Math.max(0, this.maxAlertsPerSecond - recentAlerts)
        };
    }
}

module.exports = { 
    AlertEngine, 
    AlertRule, 
    RuleEvaluator, 
    AlertStateManager, 
    AlertState, 
    AlertRateLimiter 
};
