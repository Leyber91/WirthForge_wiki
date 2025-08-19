/**
 * WF-UX-009 Hotkey Manager
 * 
 * Advanced keyboard shortcut system with context awareness and customization
 * Features: Global hotkeys, context-sensitive bindings, conflict resolution
 * 
 * Performance: Event delegation, efficient key matching, minimal overhead
 * Dependencies: WF-UX-001 (UI Architecture), WF-UX-002 (Progressive Levels)
 */

export class HotkeyManager {
    constructor(userLevel = 1) {
        this.userLevel = userLevel;
        
        // Hotkey storage
        this.globalHotkeys = new Map();
        this.contextualHotkeys = new Map();
        this.sequences = new Map();
        this.customBindings = new Map();
        
        // State management
        this.activeContexts = new Set(['global']);
        this.pressedKeys = new Set();
        this.sequenceBuffer = [];
        this.sequenceTimeout = null;
        this.sequenceTimeoutDuration = 2000; // 2 seconds
        
        // Conflict resolution
        this.conflictResolver = new Map();
        this.priorityOrder = ['sequence', 'contextual', 'custom', 'global'];
        
        // Performance tracking
        this.eventCount = 0;
        this.lastEventTime = 0;
        this.averageEventTime = 0;
        
        // Configuration
        this.config = {
            enableGlobalCapture: true,
            enableSequences: userLevel >= 3,
            enableCustomization: userLevel >= 4,
            maxSequenceLength: 5,
            caseSensitive: false,
            preventDefaults: true
        };
        
        // Platform detection
        this.platform = this.detectPlatform();
        this.modifierKeys = this.getModifierKeys();
        
        // Initialize default hotkeys
        this.initializeDefaultHotkeys();
        this.setupEventListeners();
    }

    /**
     * Initialize default hotkey bindings based on user level
     */
    initializeDefaultHotkeys() {
        // Level 1: Basic hotkeys
        this.register('Ctrl+S', 'save', { description: 'Save current work' });
        this.register('Ctrl+Z', 'undo', { description: 'Undo last action' });
        this.register('Ctrl+Y', 'redo', { description: 'Redo last action' });
        this.register('F1', 'help', { description: 'Show help' });
        
        // Level 2: Enhanced productivity
        if (this.userLevel >= 2) {
            this.register('Ctrl+Shift+P', 'command-palette', { description: 'Open command palette' });
            this.register('Ctrl+/', 'toggle-sidebar', { description: 'Toggle sidebar' });
            this.register('Alt+Tab', 'switch-panel', { description: 'Switch between panels' });
        }
        
        // Level 3: Advanced workflows
        if (this.userLevel >= 3) {
            this.register('Ctrl+Shift+W', 'workflow-canvas', { description: 'Open workflow canvas' });
            this.register('Ctrl+Shift+E', 'energy-patterns', { description: 'Open energy pattern editor' });
            this.register('Ctrl+Shift+A', 'automation-rules', { description: 'Open automation rules' });
            
            // Sequences for power users
            this.registerSequence(['g', 'w'], 'goto-workflows', { description: 'Go to workflows' });
            this.registerSequence(['g', 'e'], 'goto-energy', { description: 'Go to energy dashboard' });
            this.registerSequence(['g', 'p'], 'goto-plugins', { description: 'Go to plugins' });
        }
        
        // Level 4: Expert customization
        if (this.userLevel >= 4) {
            this.register('Ctrl+Shift+K', 'hotkey-editor', { description: 'Open hotkey editor' });
            this.register('Ctrl+Shift+D', 'debug-console', { description: 'Toggle debug console' });
            this.register('Ctrl+Shift+M', 'macro-recorder', { description: 'Start macro recording' });
            
            // Advanced sequences
            this.registerSequence(['Ctrl+K', 'Ctrl+S'], 'save-all', { description: 'Save all open items' });
            this.registerSequence(['Ctrl+K', 'Ctrl+R'], 'reload-plugins', { description: 'Reload all plugins' });
        }
        
        // Level 5: System integration
        if (this.userLevel >= 5) {
            this.register('Ctrl+Shift+I', 'system-inspector', { description: 'Open system inspector' });
            this.register('Ctrl+Shift+L', 'log-viewer', { description: 'Open log viewer' });
            this.register('Ctrl+Alt+R', 'restart-system', { description: 'Restart system' });
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e), true);
        document.addEventListener('keyup', (e) => this.handleKeyUp(e), true);
        
        // Focus events for context management
        document.addEventListener('focusin', (e) => this.handleFocusChange(e));
        document.addEventListener('focusout', (e) => this.handleFocusChange(e));
        
        // Window events
        window.addEventListener('blur', () => this.handleWindowBlur());
        window.addEventListener('focus', () => this.handleWindowFocus());
        
        // Prevent browser shortcuts in certain contexts
        if (this.config.preventDefaults) {
            document.addEventListener('keydown', (e) => this.preventBrowserShortcuts(e));
        }
    }

    /**
     * Register a hotkey binding
     */
    register(keyCombo, action, options = {}) {
        const binding = this.parseKeyCombo(keyCombo);
        if (!binding) {
            console.warn(`Invalid key combination: ${keyCombo}`);
            return false;
        }
        
        const hotkeyData = {
            keyCombo,
            normalizedCombo: binding.normalized,
            action,
            context: options.context || 'global',
            description: options.description || '',
            enabled: options.enabled !== false,
            priority: options.priority || 0,
            preventDefault: options.preventDefault !== false,
            stopPropagation: options.stopPropagation !== false,
            handler: options.handler || null,
            metadata: options.metadata || {}
        };
        
        // Store in appropriate map
        if (hotkeyData.context === 'global') {
            this.globalHotkeys.set(binding.normalized, hotkeyData);
        } else {
            if (!this.contextualHotkeys.has(hotkeyData.context)) {
                this.contextualHotkeys.set(hotkeyData.context, new Map());
            }
            this.contextualHotkeys.get(hotkeyData.context).set(binding.normalized, hotkeyData);
        }
        
        // Check for conflicts
        this.checkForConflicts(binding.normalized, hotkeyData);
        
        return true;
    }

    /**
     * Register a key sequence
     */
    registerSequence(sequence, action, options = {}) {
        if (!this.config.enableSequences) {
            console.warn('Key sequences are disabled for this user level');
            return false;
        }
        
        if (sequence.length > this.config.maxSequenceLength) {
            console.warn(`Sequence too long (max ${this.config.maxSequenceLength})`);
            return false;
        }
        
        const normalizedSequence = sequence.map(key => this.normalizeKey(key));
        const sequenceKey = normalizedSequence.join(' → ');
        
        const sequenceData = {
            sequence: normalizedSequence,
            action,
            description: options.description || '',
            enabled: options.enabled !== false,
            context: options.context || 'global',
            handler: options.handler || null,
            metadata: options.metadata || {}
        };
        
        this.sequences.set(sequenceKey, sequenceData);
        return true;
    }

    /**
     * Unregister a hotkey
     */
    unregister(keyCombo, context = 'global') {
        const binding = this.parseKeyCombo(keyCombo);
        if (!binding) return false;
        
        if (context === 'global') {
            return this.globalHotkeys.delete(binding.normalized);
        } else {
            const contextMap = this.contextualHotkeys.get(context);
            return contextMap ? contextMap.delete(binding.normalized) : false;
        }
    }

    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        const startTime = performance.now();
        
        try {
            const key = event.key;
            const code = event.code;
            
            // Track pressed keys
            this.pressedKeys.add(code);
            
            // Build current key combination
            const currentCombo = this.buildCurrentCombo(event);
            
            // Check for sequence continuation
            if (this.config.enableSequences) {
                this.handleSequenceInput(key, currentCombo);
            }
            
            // Find matching hotkey
            const matchedHotkey = this.findMatchingHotkey(currentCombo);
            
            if (matchedHotkey) {
                this.executeHotkey(matchedHotkey, event);
            }
            
        } finally {
            // Performance tracking
            const eventTime = performance.now() - startTime;
            this.updatePerformanceMetrics(eventTime);
        }
    }

    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        this.pressedKeys.delete(event.code);
    }

    /**
     * Handle sequence input
     */
    handleSequenceInput(key, currentCombo) {
        // Clear existing timeout
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
        }
        
        // Add to sequence buffer
        this.sequenceBuffer.push(this.normalizeKey(key));
        
        // Check for sequence matches
        const matchedSequence = this.findMatchingSequence();
        
        if (matchedSequence) {
            this.executeSequence(matchedSequence);
            this.sequenceBuffer = [];
        } else {
            // Set timeout to clear buffer
            this.sequenceTimeout = setTimeout(() => {
                this.sequenceBuffer = [];
            }, this.sequenceTimeoutDuration);
        }
    }

    /**
     * Find matching hotkey for current combination
     */
    findMatchingHotkey(currentCombo) {
        // Search in priority order
        for (const type of this.priorityOrder) {
            let match = null;
            
            switch (type) {
                case 'contextual':
                    match = this.findContextualMatch(currentCombo);
                    break;
                case 'custom':
                    match = this.findCustomMatch(currentCombo);
                    break;
                case 'global':
                    match = this.globalHotkeys.get(currentCombo);
                    break;
            }
            
            if (match && match.enabled) {
                return match;
            }
        }
        
        return null;
    }

    /**
     * Find contextual hotkey match
     */
    findContextualMatch(currentCombo) {
        for (const context of this.activeContexts) {
            const contextMap = this.contextualHotkeys.get(context);
            if (contextMap) {
                const match = contextMap.get(currentCombo);
                if (match && match.enabled) {
                    return match;
                }
            }
        }
        return null;
    }

    /**
     * Find custom binding match
     */
    findCustomMatch(currentCombo) {
        return this.customBindings.get(currentCombo);
    }

    /**
     * Find matching sequence
     */
    findMatchingSequence() {
        const currentSequence = this.sequenceBuffer.join(' → ');
        
        // Check for exact match
        const exactMatch = this.sequences.get(currentSequence);
        if (exactMatch && exactMatch.enabled) {
            return exactMatch;
        }
        
        // Check for partial matches (for multi-step sequences)
        for (const [sequenceKey, sequenceData] of this.sequences) {
            if (sequenceKey.startsWith(currentSequence + ' → ') && sequenceData.enabled) {
                // Partial match - continue sequence
                return null;
            }
        }
        
        return null;
    }

    /**
     * Execute matched hotkey
     */
    executeHotkey(hotkey, event) {
        try {
            // Prevent default behavior if configured
            if (hotkey.preventDefault) {
                event.preventDefault();
            }
            
            if (hotkey.stopPropagation) {
                event.stopPropagation();
            }
            
            // Execute custom handler if provided
            if (hotkey.handler && typeof hotkey.handler === 'function') {
                hotkey.handler(event, hotkey);
            } else {
                // Emit action event
                this.emitAction(hotkey.action, {
                    hotkey,
                    event,
                    context: Array.from(this.activeContexts)
                });
            }
            
            // Log execution
            this.logHotkeyExecution(hotkey);
            
        } catch (error) {
            console.error('Error executing hotkey:', error);
        }
    }

    /**
     * Execute matched sequence
     */
    executeSequence(sequence) {
        try {
            if (sequence.handler && typeof sequence.handler === 'function') {
                sequence.handler(sequence);
            } else {
                this.emitAction(sequence.action, {
                    sequence,
                    context: Array.from(this.activeContexts)
                });
            }
            
            this.logSequenceExecution(sequence);
            
        } catch (error) {
            console.error('Error executing sequence:', error);
        }
    }

    /**
     * Parse key combination string
     */
    parseKeyCombo(keyCombo) {
        const parts = keyCombo.split('+').map(part => part.trim());
        const modifiers = [];
        let mainKey = '';
        
        for (const part of parts) {
            if (this.modifierKeys.includes(part.toLowerCase())) {
                modifiers.push(part.toLowerCase());
            } else {
                mainKey = part;
            }
        }
        
        if (!mainKey) {
            return null;
        }
        
        // Normalize and sort modifiers
        const normalizedModifiers = modifiers.sort();
        const normalized = normalizedModifiers.length > 0 
            ? normalizedModifiers.join('+') + '+' + mainKey.toLowerCase()
            : mainKey.toLowerCase();
        
        return {
            modifiers: normalizedModifiers,
            mainKey: mainKey.toLowerCase(),
            normalized
        };
    }

    /**
     * Build current key combination from event
     */
    buildCurrentCombo(event) {
        const modifiers = [];
        
        if (event.ctrlKey) modifiers.push('ctrl');
        if (event.altKey) modifiers.push('alt');
        if (event.shiftKey) modifiers.push('shift');
        if (event.metaKey) modifiers.push('meta');
        
        const mainKey = event.key.toLowerCase();
        
        return modifiers.length > 0 
            ? modifiers.sort().join('+') + '+' + mainKey
            : mainKey;
    }

    /**
     * Normalize key for consistent comparison
     */
    normalizeKey(key) {
        const keyMap = {
            ' ': 'space',
            'Enter': 'enter',
            'Escape': 'escape',
            'Tab': 'tab',
            'Backspace': 'backspace',
            'Delete': 'delete',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };
        
        return keyMap[key] || key.toLowerCase();
    }

    /**
     * Add context to active contexts
     */
    addContext(context) {
        this.activeContexts.add(context);
        this.emitContextChange();
    }

    /**
     * Remove context from active contexts
     */
    removeContext(context) {
        this.activeContexts.delete(context);
        this.emitContextChange();
    }

    /**
     * Set active contexts (replaces all)
     */
    setContexts(contexts) {
        this.activeContexts.clear();
        contexts.forEach(context => this.activeContexts.add(context));
        this.emitContextChange();
    }

    /**
     * Handle focus changes for context management
     */
    handleFocusChange(event) {
        const element = event.target;
        const context = this.getElementContext(element);
        
        if (event.type === 'focusin') {
            if (context) {
                this.addContext(context);
            }
        } else if (event.type === 'focusout') {
            if (context) {
                this.removeContext(context);
            }
        }
    }

    /**
     * Get context from DOM element
     */
    getElementContext(element) {
        // Check for explicit context attribute
        const explicitContext = element.getAttribute('data-hotkey-context');
        if (explicitContext) {
            return explicitContext;
        }
        
        // Infer context from element properties
        if (element.matches('input, textarea')) {
            return 'input';
        }
        
        if (element.matches('.workflow-canvas')) {
            return 'workflow';
        }
        
        if (element.matches('.energy-pattern-editor')) {
            return 'energy-editor';
        }
        
        if (element.matches('.code-editor')) {
            return 'code-editor';
        }
        
        return null;
    }

    /**
     * Check for hotkey conflicts
     */
    checkForConflicts(normalizedCombo, newHotkey) {
        const conflicts = [];
        
        // Check global conflicts
        if (this.globalHotkeys.has(normalizedCombo)) {
            conflicts.push({
                type: 'global',
                existing: this.globalHotkeys.get(normalizedCombo)
            });
        }
        
        // Check contextual conflicts
        for (const [context, contextMap] of this.contextualHotkeys) {
            if (contextMap.has(normalizedCombo)) {
                conflicts.push({
                    type: 'contextual',
                    context,
                    existing: contextMap.get(normalizedCombo)
                });
            }
        }
        
        if (conflicts.length > 0) {
            this.resolveConflicts(normalizedCombo, newHotkey, conflicts);
        }
    }

    /**
     * Resolve hotkey conflicts
     */
    resolveConflicts(normalizedCombo, newHotkey, conflicts) {
        console.warn(`Hotkey conflict detected for ${normalizedCombo}:`, conflicts);
        
        // Store conflict information for user resolution
        this.conflictResolver.set(normalizedCombo, {
            newHotkey,
            conflicts,
            timestamp: Date.now()
        });
        
        // Emit conflict event for UI handling
        this.emitConflict(normalizedCombo, newHotkey, conflicts);
    }

    /**
     * Prevent browser shortcuts in certain contexts
     */
    preventBrowserShortcuts(event) {
        const combo = this.buildCurrentCombo(event);
        
        // Common browser shortcuts to prevent
        const browserShortcuts = [
            'ctrl+t', 'ctrl+w', 'ctrl+n', 'ctrl+shift+t',
            'ctrl+r', 'ctrl+f5', 'f5', 'ctrl+l',
            'ctrl+d', 'ctrl+h', 'ctrl+j', 'ctrl+shift+delete'
        ];
        
        if (browserShortcuts.includes(combo)) {
            // Only prevent if we have a matching hotkey or in certain contexts
            if (this.findMatchingHotkey(combo) || this.activeContexts.has('workflow')) {
                event.preventDefault();
            }
        }
    }

    /**
     * Emit action event
     */
    emitAction(action, data) {
        const event = new CustomEvent('hotkey-action', {
            detail: { action, ...data }
        });
        document.dispatchEvent(event);
    }

    /**
     * Emit context change event
     */
    emitContextChange() {
        const event = new CustomEvent('hotkey-context-change', {
            detail: { contexts: Array.from(this.activeContexts) }
        });
        document.dispatchEvent(event);
    }

    /**
     * Emit conflict event
     */
    emitConflict(combo, newHotkey, conflicts) {
        const event = new CustomEvent('hotkey-conflict', {
            detail: { combo, newHotkey, conflicts }
        });
        document.dispatchEvent(event);
    }

    /**
     * Log hotkey execution
     */
    logHotkeyExecution(hotkey) {
        if (this.config.enableLogging) {
            console.log(`Hotkey executed: ${hotkey.keyCombo} → ${hotkey.action}`);
        }
    }

    /**
     * Log sequence execution
     */
    logSequenceExecution(sequence) {
        if (this.config.enableLogging) {
            console.log(`Sequence executed: ${sequence.sequence.join(' → ')} → ${sequence.action}`);
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(eventTime) {
        this.eventCount++;
        this.lastEventTime = eventTime;
        
        // Exponential moving average
        const alpha = 0.1;
        this.averageEventTime = (1 - alpha) * this.averageEventTime + alpha * eventTime;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            eventCount: this.eventCount,
            lastEventTime: this.lastEventTime,
            averageEventTime: this.averageEventTime,
            activeContexts: Array.from(this.activeContexts),
            registeredHotkeys: this.globalHotkeys.size,
            registeredSequences: this.sequences.size
        };
    }

    /**
     * Detect platform for platform-specific shortcuts
     */
    detectPlatform() {
        if (typeof navigator !== 'undefined') {
            const platform = navigator.platform.toLowerCase();
            if (platform.includes('mac')) return 'mac';
            if (platform.includes('win')) return 'windows';
            if (platform.includes('linux')) return 'linux';
        }
        return 'unknown';
    }

    /**
     * Get platform-specific modifier keys
     */
    getModifierKeys() {
        const base = ['ctrl', 'alt', 'shift'];
        if (this.platform === 'mac') {
            base.push('meta', 'cmd');
        }
        return base;
    }

    /**
     * Export hotkey configuration
     */
    exportConfiguration() {
        return {
            globalHotkeys: Array.from(this.globalHotkeys.entries()),
            contextualHotkeys: Array.from(this.contextualHotkeys.entries()).map(([context, map]) => [
                context,
                Array.from(map.entries())
            ]),
            sequences: Array.from(this.sequences.entries()),
            customBindings: Array.from(this.customBindings.entries()),
            config: this.config
        };
    }

    /**
     * Import hotkey configuration
     */
    importConfiguration(configData) {
        try {
            // Clear existing
            this.globalHotkeys.clear();
            this.contextualHotkeys.clear();
            this.sequences.clear();
            this.customBindings.clear();
            
            // Import data
            configData.globalHotkeys.forEach(([key, value]) => {
                this.globalHotkeys.set(key, value);
            });
            
            configData.contextualHotkeys.forEach(([context, entries]) => {
                const contextMap = new Map(entries);
                this.contextualHotkeys.set(context, contextMap);
            });
            
            configData.sequences.forEach(([key, value]) => {
                this.sequences.set(key, value);
            });
            
            configData.customBindings.forEach(([key, value]) => {
                this.customBindings.set(key, value);
            });
            
            // Update config
            this.config = { ...this.config, ...configData.config };
            
            return true;
        } catch (error) {
            console.error('Error importing hotkey configuration:', error);
            return false;
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('focusin', this.handleFocusChange);
        document.removeEventListener('focusout', this.handleFocusChange);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        
        // Clear timeouts
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
        }
        
        // Clear data
        this.globalHotkeys.clear();
        this.contextualHotkeys.clear();
        this.sequences.clear();
        this.customBindings.clear();
        this.activeContexts.clear();
        this.pressedKeys.clear();
        this.sequenceBuffer = [];
    }
}

export default HotkeyManager;
