/**
 * WF-UX-004 Accessibility Utilities
 * Core utilities for managing accessibility preferences, media queries, and adaptive features
 * Ensures WCAG 2.2 AA compliance and seamless integration with OS accessibility settings
 */

class AccessibilityUtilities {
    constructor() {
        this.preferences = new Map();
        this.mediaQueries = new Map();
        this.observers = new Set();
        this.initialized = false;
        
        // Default accessibility preferences
        this.defaults = {
            reducedMotion: false,
            highContrast: false,
            largeText: false,
            screenReader: false,
            keyboardOnly: false,
            colorVisionProfile: 'normal',
            focusIndicators: 'enhanced',
            announcements: true,
            soundEnabled: true,
            vibrationEnabled: true
        };
        
        this.init();
    }
    
    /**
     * Initialize accessibility utilities and detect OS preferences
     */
    init() {
        if (this.initialized) return;
        
        this.detectOSPreferences();
        this.setupMediaQueryListeners();
        this.loadUserPreferences();
        this.initialized = true;
        
        // Announce initialization for screen readers
        this.announceToScreenReader('Accessibility features initialized', 'polite');
    }
    
    /**
     * Detect OS-level accessibility preferences
     */
    detectOSPreferences() {
        const queries = {
            reducedMotion: '(prefers-reduced-motion: reduce)',
            highContrast: '(prefers-contrast: high)',
            largeText: '(prefers-reduced-data: reduce)',
            darkMode: '(prefers-color-scheme: dark)',
            forcedColors: '(forced-colors: active)',
            transparencyReduction: '(prefers-reduced-transparency: reduce)'
        };
        
        Object.entries(queries).forEach(([key, query]) => {
            if (window.matchMedia) {
                const mq = window.matchMedia(query);
                this.mediaQueries.set(key, mq);
                this.preferences.set(key, mq.matches);
            }
        });
        
        // Detect screen reader usage
        this.detectScreenReader();
    }
    
    /**
     * Detect screen reader usage through various heuristics
     */
    detectScreenReader() {
        let screenReaderDetected = false;
        
        // Check for common screen reader indicators
        if (navigator.userAgent.includes('NVDA') || 
            navigator.userAgent.includes('JAWS') || 
            navigator.userAgent.includes('VoiceOver')) {
            screenReaderDetected = true;
        }
        
        // Check for high contrast mode (often indicates screen reader)
        if (this.preferences.get('highContrast') || this.preferences.get('forcedColors')) {
            screenReaderDetected = true;
        }
        
        // Test for screen reader by creating invisible element
        const testElement = document.createElement('div');
        testElement.setAttribute('aria-hidden', 'true');
        testElement.style.position = 'absolute';
        testElement.style.left = '-10000px';
        testElement.textContent = 'Screen reader test';
        document.body.appendChild(testElement);
        
        setTimeout(() => {
            if (testElement.offsetHeight > 0) {
                screenReaderDetected = true;
                this.preferences.set('screenReader', true);
            }
            document.body.removeChild(testElement);
        }, 100);
        
        this.preferences.set('screenReader', screenReaderDetected);
    }
    
    /**
     * Setup media query listeners for dynamic preference changes
     */
    setupMediaQueryListeners() {
        this.mediaQueries.forEach((mq, key) => {
            const handler = (e) => {
                this.preferences.set(key, e.matches);
                this.notifyObservers(key, e.matches);
                this.saveUserPreferences();
            };
            
            mq.addEventListener('change', handler);
        });
    }
    
    /**
     * Load user-specific accessibility preferences from storage
     */
    loadUserPreferences() {
        try {
            const stored = localStorage.getItem('wf-accessibility-preferences');
            if (stored) {
                const userPrefs = JSON.parse(stored);
                Object.entries(userPrefs).forEach(([key, value]) => {
                    this.preferences.set(key, value);
                });
            }
        } catch (error) {
            console.warn('Failed to load accessibility preferences:', error);
        }
    }
    
    /**
     * Save user preferences to storage
     */
    saveUserPreferences() {
        try {
            const prefs = Object.fromEntries(this.preferences);
            localStorage.setItem('wf-accessibility-preferences', JSON.stringify(prefs));
        } catch (error) {
            console.warn('Failed to save accessibility preferences:', error);
        }
    }
    
    /**
     * Get accessibility preference value
     */
    getPreference(key) {
        return this.preferences.get(key) ?? this.defaults[key] ?? false;
    }
    
    /**
     * Set accessibility preference
     */
    setPreference(key, value) {
        const oldValue = this.preferences.get(key);
        this.preferences.set(key, value);
        
        if (oldValue !== value) {
            this.notifyObservers(key, value);
            this.saveUserPreferences();
            this.announcePreferenceChange(key, value);
        }
    }
    
    /**
     * Subscribe to preference changes
     */
    subscribe(callback) {
        this.observers.add(callback);
        return () => this.observers.delete(callback);
    }
    
    /**
     * Notify observers of preference changes
     */
    notifyObservers(key, value) {
        this.observers.forEach(callback => {
            try {
                callback(key, value, this.preferences);
            } catch (error) {
                console.error('Error in accessibility observer:', error);
            }
        });
    }
    
    /**
     * Announce preference changes to screen readers
     */
    announcePreferenceChange(key, value) {
        if (!this.getPreference('announcements')) return;
        
        const messages = {
            reducedMotion: value ? 'Motion reduced' : 'Motion enabled',
            highContrast: value ? 'High contrast enabled' : 'High contrast disabled',
            largeText: value ? 'Large text enabled' : 'Large text disabled',
            screenReader: value ? 'Screen reader detected' : 'Screen reader not detected',
            keyboardOnly: value ? 'Keyboard navigation mode' : 'Mouse navigation enabled'
        };
        
        const message = messages[key];
        if (message) {
            this.announceToScreenReader(message, 'polite');
        }
    }
    
    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message, priority = 'polite') {
        if (!this.getPreference('screenReader') && !this.getPreference('announcements')) {
            return;
        }
        
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.cssText = `
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        `;
        
        document.body.appendChild(announcement);
        
        // Delay to ensure screen reader picks up the announcement
        setTimeout(() => {
            announcement.textContent = message;
            
            // Remove after announcement
            setTimeout(() => {
                if (announcement.parentNode) {
                    announcement.parentNode.removeChild(announcement);
                }
            }, 1000);
        }, 100);
    }
    
    /**
     * Get color vision adaptation settings
     */
    getColorVisionProfile() {
        return this.getPreference('colorVisionProfile');
    }
    
    /**
     * Apply color vision adaptations to element
     */
    applyColorVisionFilter(element, profile = null) {
        const activeProfile = profile || this.getColorVisionProfile();
        
        const filters = {
            protanopia: 'url(#protanopia-filter)',
            deuteranopia: 'url(#deuteranopia-filter)',
            tritanopia: 'url(#tritanopia-filter)',
            monochromacy: 'grayscale(100%)',
            normal: 'none'
        };
        
        if (element && filters[activeProfile]) {
            element.style.filter = filters[activeProfile];
        }
    }
    
    /**
     * Create SVG filters for color vision adaptations
     */
    createColorVisionFilters() {
        if (document.getElementById('wf-color-vision-filters')) return;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'wf-color-vision-filters';
        svg.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden;';
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Protanopia filter (red-blind)
        const protanopiaFilter = this.createColorMatrix('protanopia-filter', [
            0.567, 0.433, 0, 0, 0,
            0.558, 0.442, 0, 0, 0,
            0, 0.242, 0.758, 0, 0,
            0, 0, 0, 1, 0
        ]);
        
        // Deuteranopia filter (green-blind)
        const deuteranopiaFilter = this.createColorMatrix('deuteranopia-filter', [
            0.625, 0.375, 0, 0, 0,
            0.7, 0.3, 0, 0, 0,
            0, 0.3, 0.7, 0, 0,
            0, 0, 0, 1, 0
        ]);
        
        // Tritanopia filter (blue-blind)
        const tritanopiaFilter = this.createColorMatrix('tritanopia-filter', [
            0.95, 0.05, 0, 0, 0,
            0, 0.433, 0.567, 0, 0,
            0, 0.475, 0.525, 0, 0,
            0, 0, 0, 1, 0
        ]);
        
        defs.appendChild(protanopiaFilter);
        defs.appendChild(deuteranopiaFilter);
        defs.appendChild(tritanopiaFilter);
        svg.appendChild(defs);
        document.body.appendChild(svg);
    }
    
    /**
     * Create SVG color matrix filter
     */
    createColorMatrix(id, values) {
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.id = id;
        
        const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        colorMatrix.setAttribute('type', 'matrix');
        colorMatrix.setAttribute('values', values.join(' '));
        
        filter.appendChild(colorMatrix);
        return filter;
    }
    
    /**
     * Get accessibility summary for debugging
     */
    getAccessibilitySummary() {
        return {
            preferences: Object.fromEntries(this.preferences),
            mediaQueries: Array.from(this.mediaQueries.keys()),
            observerCount: this.observers.size,
            initialized: this.initialized
        };
    }
    
    /**
     * Reset all preferences to defaults
     */
    resetPreferences() {
        this.preferences.clear();
        Object.entries(this.defaults).forEach(([key, value]) => {
            this.preferences.set(key, value);
        });
        
        this.detectOSPreferences();
        this.saveUserPreferences();
        this.announceToScreenReader('Accessibility preferences reset to defaults', 'assertive');
    }
}

// Create global instance
window.WF_AccessibilityUtilities = new AccessibilityUtilities();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityUtilities;
}
