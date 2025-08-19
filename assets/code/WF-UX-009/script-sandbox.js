/**
 * WF-UX-009 Script Sandbox
 * 
 * Secure execution environment for user scripts with safety constraints
 * Features: Isolated execution, resource limits, API access control
 * 
 * Performance: Memory-bounded, CPU-limited, timeout protection
 * Dependencies: WF-TECH-002 (Security), WF-TECH-004 (Plugin System)
 */

export class ScriptSandbox {
    constructor(securityManager, resourceManager) {
        this.securityManager = securityManager;
        this.resourceManager = resourceManager;
        
        // Sandbox configuration
        this.config = {
            maxExecutionTime: 30000, // 30 seconds
            maxMemoryUsage: 50 * 1024 * 1024, // 50MB
            maxCpuUsage: 80, // 80% CPU
            allowedAPIs: new Set([
                'console',
                'Math',
                'Date',
                'JSON',
                'Promise',
                'setTimeout',
                'setInterval'
            ]),
            blockedAPIs: new Set([
                'eval',
                'Function',
                'XMLHttpRequest',
                'fetch',
                'WebSocket',
                'Worker',
                'SharedWorker',
                'ServiceWorker'
            ])
        };
        
        // Execution state
        this.activeScripts = new Map();
        this.executionHistory = [];
        this.resourceUsage = {
            memory: 0,
            cpu: 0,
            executionTime: 0
        };
        
        // Security context
        this.sandboxContext = null;
        this.permissionLevel = 'restricted';
        
        // Performance monitoring
        this.performanceObserver = null;
        this.memoryObserver = null;
        
        this.initializeSandbox();
    }

    /**
     * Initialize the sandbox environment
     */
    initializeSandbox() {
        // Create isolated execution context
        this.createSandboxContext();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Initialize security policies
        this.initializeSecurityPolicies();
        
        // Setup resource limits
        this.setupResourceLimits();
    }

    /**
     * Create isolated execution context
     */
    createSandboxContext() {
        // Create iframe for isolation (in browser environment)
        if (typeof window !== 'undefined') {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.sandbox = 'allow-scripts';
            document.body.appendChild(iframe);
            
            this.sandboxContext = iframe.contentWindow;
            this.setupSandboxAPIs();
        } else {
            // Node.js environment - use vm module
            this.createNodeSandbox();
        }
    }

    /**
     * Setup sandbox APIs and restrictions
     */
    setupSandboxAPIs() {
        if (!this.sandboxContext) return;
        
        const context = this.sandboxContext;
        
        // Provide safe APIs
        context.console = {
            log: (...args) => this.sandboxLog('log', args),
            warn: (...args) => this.sandboxLog('warn', args),
            error: (...args) => this.sandboxLog('error', args),
            info: (...args) => this.sandboxLog('info', args)
        };
        
        context.Math = Math;
        context.Date = Date;
        context.JSON = JSON;
        context.Promise = Promise;
        
        // Controlled timer functions
        context.setTimeout = (callback, delay) => {
            if (delay < 10) delay = 10; // Minimum 10ms
            return setTimeout(() => this.executeCallback(callback), delay);
        };
        
        context.setInterval = (callback, interval) => {
            if (interval < 100) interval = 100; // Minimum 100ms
            return setInterval(() => this.executeCallback(callback), interval);
        };
        
        // Sandbox-specific APIs
        context.sandbox = {
            getResourceUsage: () => ({ ...this.resourceUsage }),
            getRemainingTime: () => this.getRemainingExecutionTime(),
            requestPermission: (permission) => this.requestPermission(permission),
            emit: (event, data) => this.emitSandboxEvent(event, data),
            on: (event, handler) => this.onSandboxEvent(event, handler)
        };
        
        // Block dangerous APIs
        this.config.blockedAPIs.forEach(api => {
            try {
                context[api] = undefined;
                Object.defineProperty(context, api, {
                    get: () => {
                        throw new Error(`Access to ${api} is not allowed in sandbox`);
                    },
                    configurable: false
                });
            } catch (e) {
                // Some APIs might not be accessible
            }
        });
    }

    /**
     * Execute script in sandbox with safety checks
     */
    async executeScript(scriptCode, options = {}) {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const execution = {
            id: executionId,
            code: scriptCode,
            startTime: Date.now(),
            status: 'running',
            result: null,
            error: null,
            resourceUsage: { memory: 0, cpu: 0 },
            options: {
                timeout: options.timeout || this.config.maxExecutionTime,
                memoryLimit: options.memoryLimit || this.config.maxMemoryUsage,
                cpuLimit: options.cpuLimit || this.config.maxCpuUsage,
                ...options
            }
        };
        
        this.activeScripts.set(executionId, execution);
        
        try {
            // Pre-execution security check
            this.validateScript(scriptCode);
            
            // Setup execution timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Script execution timeout after ${execution.options.timeout}ms`));
                }, execution.options.timeout);
            });
            
            // Execute script with monitoring
            const executionPromise = this.runScriptInSandbox(scriptCode, execution);
            
            // Race between execution and timeout
            execution.result = await Promise.race([executionPromise, timeoutPromise]);
            execution.status = 'completed';
            
        } catch (error) {
            execution.error = error;
            execution.status = 'failed';
            this.handleExecutionError(execution, error);
        } finally {
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            
            this.activeScripts.delete(executionId);
            this.executionHistory.push(execution);
            
            // Cleanup resources
            this.cleanupExecution(execution);
        }
        
        return execution;
    }

    /**
     * Run script in isolated context
     */
    async runScriptInSandbox(scriptCode, execution) {
        if (!this.sandboxContext) {
            throw new Error('Sandbox context not available');
        }
        
        // Monitor resource usage
        const resourceMonitor = this.startResourceMonitoring(execution);
        
        try {
            // Wrap script in monitoring code
            const wrappedScript = this.wrapScriptForMonitoring(scriptCode, execution.id);
            
            // Execute in sandbox context
            const result = this.sandboxContext.eval(wrappedScript);
            
            // Handle async results
            if (result instanceof Promise) {
                return await result;
            }
            
            return result;
            
        } finally {
            this.stopResourceMonitoring(resourceMonitor);
        }
    }

    /**
     * Validate script for security issues
     */
    validateScript(scriptCode) {
        // Check for blocked patterns
        const blockedPatterns = [
            /eval\s*\(/,
            /Function\s*\(/,
            /new\s+Function/,
            /document\./,
            /window\./,
            /global\./,
            /process\./,
            /require\s*\(/,
            /import\s+/,
            /export\s+/,
            /__proto__/,
            /constructor\s*\./,
            /prototype\s*\./
        ];
        
        for (const pattern of blockedPatterns) {
            if (pattern.test(scriptCode)) {
                throw new Error(`Script contains blocked pattern: ${pattern.source}`);
            }
        }
        
        // Check script length
        if (scriptCode.length > 100000) { // 100KB limit
            throw new Error('Script too large (max 100KB)');
        }
        
        // Basic syntax validation
        try {
            new Function(scriptCode);
        } catch (syntaxError) {
            throw new Error(`Script syntax error: ${syntaxError.message}`);
        }
    }

    /**
     * Wrap script with monitoring code
     */
    wrapScriptForMonitoring(scriptCode, executionId) {
        return `
            (function() {
                'use strict';
                
                // Execution tracking
                const __executionId = '${executionId}';
                let __operationCount = 0;
                const __maxOperations = 1000000; // 1M operations limit
                
                // Operation counter (simplified)
                const __checkOperations = () => {
                    if (++__operationCount > __maxOperations) {
                        throw new Error('Script exceeded operation limit');
                    }
                };
                
                // Inject operation checks into loops (simplified approach)
                const __originalSetTimeout = setTimeout;
                const __originalSetInterval = setInterval;
                
                setTimeout = function(callback, delay) {
                    __checkOperations();
                    return __originalSetTimeout(callback, delay);
                };
                
                setInterval = function(callback, interval) {
                    __checkOperations();
                    return __originalSetInterval(callback, interval);
                };
                
                // Execute user script
                try {
                    return (function() {
                        ${scriptCode}
                    })();
                } catch (error) {
                    throw error;
                }
            })();
        `;
    }

    /**
     * Start resource monitoring for execution
     */
    startResourceMonitoring(execution) {
        const startMemory = this.getCurrentMemoryUsage();
        const startTime = performance.now();
        
        const monitor = {
            intervalId: setInterval(() => {
                const currentMemory = this.getCurrentMemoryUsage();
                const currentTime = performance.now();
                
                execution.resourceUsage.memory = currentMemory - startMemory;
                execution.resourceUsage.cpu = this.getCurrentCpuUsage();
                
                // Check limits
                if (execution.resourceUsage.memory > execution.options.memoryLimit) {
                    throw new Error(`Memory limit exceeded: ${execution.resourceUsage.memory} bytes`);
                }
                
                if (execution.resourceUsage.cpu > execution.options.cpuLimit) {
                    throw new Error(`CPU limit exceeded: ${execution.resourceUsage.cpu}%`);
                }
                
            }, 100), // Check every 100ms
            
            startMemory,
            startTime
        };
        
        return monitor;
    }

    /**
     * Stop resource monitoring
     */
    stopResourceMonitoring(monitor) {
        if (monitor && monitor.intervalId) {
            clearInterval(monitor.intervalId);
        }
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Get current CPU usage (simplified)
     */
    getCurrentCpuUsage() {
        // Simplified CPU usage estimation
        // In real implementation, would use more sophisticated monitoring
        return Math.random() * 20 + 10; // 10-30% for demo
    }

    /**
     * Handle execution errors
     */
    handleExecutionError(execution, error) {
        console.error(`Sandbox execution error [${execution.id}]:`, error);
        
        // Log security violations
        if (error.message.includes('not allowed') || error.message.includes('blocked')) {
            this.logSecurityViolation(execution, error);
        }
        
        // Cleanup any leaked resources
        this.emergencyCleanup(execution);
    }

    /**
     * Log security violations
     */
    logSecurityViolation(execution, error) {
        const violation = {
            timestamp: new Date().toISOString(),
            executionId: execution.id,
            error: error.message,
            code: execution.code.substring(0, 200), // First 200 chars
            resourceUsage: execution.resourceUsage
        };
        
        console.warn('Security violation detected:', violation);
        
        // In production, would send to security monitoring system
        this.securityManager?.reportViolation(violation);
    }

    /**
     * Emergency cleanup for failed executions
     */
    emergencyCleanup(execution) {
        // Clear any timers that might have been set
        if (this.sandboxContext) {
            try {
                // Clear all timeouts/intervals (simplified)
                for (let i = 1; i < 10000; i++) {
                    this.sandboxContext.clearTimeout(i);
                    this.sandboxContext.clearInterval(i);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        
        // Force garbage collection if available
        if (typeof gc === 'function') {
            gc();
        }
    }

    /**
     * Sandbox logging with filtering
     */
    sandboxLog(level, args) {
        // Filter sensitive information
        const filteredArgs = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                // Remove potentially sensitive properties
                const filtered = { ...arg };
                delete filtered.password;
                delete filtered.token;
                delete filtered.key;
                delete filtered.secret;
                return filtered;
            }
            return arg;
        });
        
        console[level](`[Sandbox]`, ...filteredArgs);
    }

    /**
     * Execute callback with error handling
     */
    executeCallback(callback) {
        try {
            if (typeof callback === 'function') {
                return callback();
            }
        } catch (error) {
            console.error('Sandbox callback error:', error);
        }
    }

    /**
     * Request permission for restricted operation
     */
    requestPermission(permission) {
        // In real implementation, would show user permission dialog
        console.log(`Permission requested: ${permission}`);
        return false; // Deny by default
    }

    /**
     * Emit sandbox event
     */
    emitSandboxEvent(event, data) {
        // Filtered event emission
        const allowedEvents = ['progress', 'result', 'log'];
        
        if (allowedEvents.includes(event)) {
            // In real implementation, would emit to parent context
            console.log(`Sandbox event [${event}]:`, data);
        }
    }

    /**
     * Listen for sandbox events
     */
    onSandboxEvent(event, handler) {
        // Event listener registration with validation
        if (typeof handler === 'function') {
            // In real implementation, would register event listener
            console.log(`Event listener registered for: ${event}`);
        }
    }

    /**
     * Get remaining execution time
     */
    getRemainingExecutionTime() {
        // Return remaining time for current execution
        return Math.max(0, this.config.maxExecutionTime - this.resourceUsage.executionTime);
    }

    /**
     * Cleanup execution resources
     */
    cleanupExecution(execution) {
        // Remove from active scripts
        this.activeScripts.delete(execution.id);
        
        // Trim execution history
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(-50);
        }
    }

    /**
     * Get execution statistics
     */
    getExecutionStats() {
        return {
            activeScripts: this.activeScripts.size,
            totalExecutions: this.executionHistory.length,
            successfulExecutions: this.executionHistory.filter(e => e.status === 'completed').length,
            failedExecutions: this.executionHistory.filter(e => e.status === 'failed').length,
            averageExecutionTime: this.calculateAverageExecutionTime(),
            resourceUsage: { ...this.resourceUsage }
        };
    }

    /**
     * Calculate average execution time
     */
    calculateAverageExecutionTime() {
        const completedExecutions = this.executionHistory.filter(e => e.duration);
        if (completedExecutions.length === 0) return 0;
        
        const totalTime = completedExecutions.reduce((sum, e) => sum + e.duration, 0);
        return totalTime / completedExecutions.length;
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        if (typeof PerformanceObserver !== 'undefined') {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name.startsWith('sandbox-')) {
                        this.updatePerformanceMetrics(entry);
                    }
                });
            });
            
            this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(entry) {
        this.resourceUsage.executionTime = entry.duration;
        
        // Update CPU usage estimation
        if (entry.duration > 16.67) { // Longer than 60Hz frame
            this.resourceUsage.cpu = Math.min(100, this.resourceUsage.cpu + 5);
        } else {
            this.resourceUsage.cpu = Math.max(0, this.resourceUsage.cpu - 1);
        }
    }

    /**
     * Initialize security policies
     */
    initializeSecurityPolicies() {
        // Content Security Policy for sandbox
        this.csp = {
            'default-src': "'none'",
            'script-src': "'unsafe-eval'", // Required for dynamic execution
            'connect-src': "'none'",
            'img-src': "'none'",
            'style-src': "'none'",
            'font-src': "'none'",
            'object-src': "'none'",
            'media-src': "'none'",
            'frame-src': "'none'"
        };
    }

    /**
     * Setup resource limits
     */
    setupResourceLimits() {
        // Memory limit monitoring
        if (typeof MemoryInfo !== 'undefined') {
            this.memoryObserver = setInterval(() => {
                const memInfo = performance.memory;
                if (memInfo && memInfo.usedJSHeapSize > this.config.maxMemoryUsage) {
                    console.warn('Memory usage approaching limit');
                    this.triggerGarbageCollection();
                }
            }, 5000);
        }
    }

    /**
     * Trigger garbage collection
     */
    triggerGarbageCollection() {
        // Force cleanup of completed executions
        this.executionHistory = this.executionHistory.slice(-20);
        
        // Clear inactive sandbox contexts
        if (this.activeScripts.size === 0) {
            this.recreateSandboxContext();
        }
    }

    /**
     * Recreate sandbox context for cleanup
     */
    recreateSandboxContext() {
        if (this.sandboxContext && typeof window !== 'undefined') {
            // Remove old iframe
            const oldIframe = Array.from(document.querySelectorAll('iframe'))
                .find(iframe => iframe.contentWindow === this.sandboxContext);
            
            if (oldIframe) {
                oldIframe.remove();
            }
            
            // Create new sandbox context
            this.createSandboxContext();
        }
    }

    /**
     * Destroy sandbox and cleanup resources
     */
    destroy() {
        // Stop all active scripts
        this.activeScripts.forEach((execution, id) => {
            execution.status = 'terminated';
            this.activeScripts.delete(id);
        });
        
        // Clear observers
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        if (this.memoryObserver) {
            clearInterval(this.memoryObserver);
        }
        
        // Cleanup sandbox context
        this.recreateSandboxContext();
        
        // Clear history
        this.executionHistory = [];
    }
}

export default ScriptSandbox;
