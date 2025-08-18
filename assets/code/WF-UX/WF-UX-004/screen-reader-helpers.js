/**
 * WF-UX-004 Screen Reader Helpers
 * Components and utilities for optimizing screen reader experience
 * Manages live regions, announcements, and accessible content updates
 */

class ScreenReaderHelpers {
    constructor() {
        this.liveRegions = new Map();
        this.announcementQueue = [];
        this.isProcessingQueue = false;
        this.skipLinks = new Set();
        this.landmarks = new Map();
        this.initialized = false;
        
        this.init();
    }
    
    /**
     * Initialize screen reader helpers
     */
    init() {
        if (this.initialized) return;
        
        this.createLiveRegions();
        this.setupSkipLinks();
        this.setupLandmarks();
        this.setupAriaDescriptions();
        this.initialized = true;
    }
    
    /**
     * Create ARIA live regions for different announcement types
     */
    createLiveRegions() {
        const regions = [
            { id: 'wf-announcements-polite', priority: 'polite', atomic: true },
            { id: 'wf-announcements-assertive', priority: 'assertive', atomic: true },
            { id: 'wf-status-updates', priority: 'polite', atomic: false },
            { id: 'wf-error-messages', priority: 'assertive', atomic: true },
            { id: 'wf-progress-updates', priority: 'polite', atomic: false }
        ];
        
        regions.forEach(region => {
            const element = this.createLiveRegion(region.id, region.priority, region.atomic);
            this.liveRegions.set(region.id, element);
        });
    }
    
    /**
     * Create individual live region element
     */
    createLiveRegion(id, priority, atomic) {
        let element = document.getElementById(id);
        
        if (!element) {
            element = document.createElement('div');
            element.id = id;
            element.setAttribute('aria-live', priority);
            element.setAttribute('aria-atomic', atomic.toString());
            element.setAttribute('aria-relevant', 'additions text');
            element.className = 'sr-only';
            element.style.cssText = `
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
            
            document.body.appendChild(element);
        }
        
        return element;
    }
    
    /**
     * Announce message to screen readers with priority
     */
    announce(message, priority = 'polite', options = {}) {
        if (!message || typeof message !== 'string') return;
        
        const announcement = {
            message: message.trim(),
            priority,
            timestamp: Date.now(),
            delay: options.delay || 0,
            clear: options.clear || false,
            id: options.id || null
        };
        
        // If ID provided, remove existing announcement with same ID
        if (announcement.id) {
            this.announcementQueue = this.announcementQueue.filter(a => a.id !== announcement.id);
        }
        
        this.announcementQueue.push(announcement);
        this.processAnnouncementQueue();
    }
    
    /**
     * Process queued announcements
     */
    async processAnnouncementQueue() {
        if (this.isProcessingQueue || this.announcementQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.announcementQueue.length > 0) {
            const announcement = this.announcementQueue.shift();
            await this.makeAnnouncement(announcement);
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * Make individual announcement
     */
    async makeAnnouncement(announcement) {
        const regionId = announcement.priority === 'assertive' 
            ? 'wf-announcements-assertive' 
            : 'wf-announcements-polite';
            
        const region = this.liveRegions.get(regionId);
        if (!region) return;
        
        // Apply delay if specified
        if (announcement.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, announcement.delay));
        }
        
        // Clear region if requested
        if (announcement.clear) {
            region.textContent = '';
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Make announcement
        region.textContent = announcement.message;
        
        // Clear after announcement to prevent re-reading
        setTimeout(() => {
            if (region.textContent === announcement.message) {
                region.textContent = '';
            }
        }, 1000);
    }
    
    /**
     * Announce status update
     */
    announceStatus(message, clear = false) {
        const region = this.liveRegions.get('wf-status-updates');
        if (!region) return;
        
        if (clear) {
            region.textContent = '';
            setTimeout(() => {
                region.textContent = message;
            }, 50);
        } else {
            region.textContent = message;
        }
    }
    
    /**
     * Announce error message
     */
    announceError(message) {
        this.announce(`Error: ${message}`, 'assertive', { clear: true });
        
        // Also update error region
        const errorRegion = this.liveRegions.get('wf-error-messages');
        if (errorRegion) {
            errorRegion.textContent = message;
        }
    }
    
    /**
     * Announce progress update
     */
    announceProgress(current, total, description = '') {
        const percentage = Math.round((current / total) * 100);
        const message = description 
            ? `${description}: ${percentage}% complete, ${current} of ${total}`
            : `Progress: ${percentage}% complete, ${current} of ${total}`;
            
        const region = this.liveRegions.get('wf-progress-updates');
        if (region) {
            region.textContent = message;
        }
    }
    
    /**
     * Setup skip links for keyboard navigation
     */
    setupSkipLinks() {
        const skipLinksContainer = this.createSkipLinksContainer();
        const skipLinks = [
            { href: '#main-content', text: 'Skip to main content' },
            { href: '#navigation', text: 'Skip to navigation' },
            { href: '#energy-visualization', text: 'Skip to energy visualization' },
            { href: '#accessibility-controls', text: 'Skip to accessibility controls' }
        ];
        
        skipLinks.forEach(link => {
            const skipLink = this.createSkipLink(link.href, link.text);
            skipLinksContainer.appendChild(skipLink);
            this.skipLinks.add(skipLink);
        });
        
        document.body.insertBefore(skipLinksContainer, document.body.firstChild);
    }
    
    /**
     * Create skip links container
     */
    createSkipLinksContainer() {
        const container = document.createElement('div');
        container.id = 'wf-skip-links';
        container.className = 'skip-links';
        container.setAttribute('role', 'navigation');
        container.setAttribute('aria-label', 'Skip links');
        
        container.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            z-index: 10000;
            background: var(--wf-color-background, #000);
            color: var(--wf-color-text, #fff);
            padding: 8px;
            border-radius: 4px;
            font-size: 14px;
            transition: top 0.3s;
        `;
        
        return container;
    }
    
    /**
     * Create individual skip link
     */
    createSkipLink(href, text) {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = text;
        link.className = 'skip-link';
        
        link.style.cssText = `
            display: block;
            color: inherit;
            text-decoration: underline;
            padding: 4px 0;
            outline: 2px solid transparent;
            outline-offset: 2px;
        `;
        
        // Show skip links on focus
        link.addEventListener('focus', () => {
            link.parentElement.style.top = '6px';
        });
        
        link.addEventListener('blur', () => {
            setTimeout(() => {
                if (!link.parentElement.contains(document.activeElement)) {
                    link.parentElement.style.top = '-40px';
                }
            }, 100);
        });
        
        return link;
    }
    
    /**
     * Setup ARIA landmarks
     */
    setupLandmarks() {
        const landmarks = [
            { selector: 'header', role: 'banner', label: 'Site header' },
            { selector: 'nav', role: 'navigation', label: 'Main navigation' },
            { selector: 'main', role: 'main', label: 'Main content' },
            { selector: 'aside', role: 'complementary', label: 'Sidebar' },
            { selector: 'footer', role: 'contentinfo', label: 'Site footer' }
        ];
        
        landmarks.forEach(landmark => {
            const elements = document.querySelectorAll(landmark.selector);
            elements.forEach((element, index) => {
                if (!element.getAttribute('role')) {
                    element.setAttribute('role', landmark.role);
                }
                
                if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
                    const label = elements.length > 1 
                        ? `${landmark.label} ${index + 1}`
                        : landmark.label;
                    element.setAttribute('aria-label', label);
                }
                
                this.landmarks.set(element, landmark);
            });
        });
    }
    
    /**
     * Setup ARIA descriptions for complex elements
     */
    setupAriaDescriptions() {
        // Energy visualization description
        const energyViz = document.getElementById('energy-visualization');
        if (energyViz) {
            this.addAriaDescription(energyViz, 
                'Interactive energy visualization showing AI model states through visual effects. ' +
                'Use arrow keys to navigate, space to pause/resume, and tab to access controls.'
            );
        }
        
        // Complex interactive elements
        const complexElements = document.querySelectorAll('[data-complex-interaction]');
        complexElements.forEach(element => {
            const description = element.getAttribute('data-aria-description');
            if (description) {
                this.addAriaDescription(element, description);
            }
        });
    }
    
    /**
     * Add ARIA description to element
     */
    addAriaDescription(element, description) {
        const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
        
        const descElement = document.createElement('div');
        descElement.id = descId;
        descElement.className = 'sr-only';
        descElement.textContent = description;
        descElement.style.cssText = `
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
        
        document.body.appendChild(descElement);
        element.setAttribute('aria-describedby', descId);
    }
    
    /**
     * Update dynamic content for screen readers
     */
    updateDynamicContent(element, content, announce = true) {
        if (!element) return;
        
        // Update content
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = content;
        } else {
            element.textContent = content;
        }
        
        // Announce change if requested
        if (announce) {
            const label = element.getAttribute('aria-label') || 
                         element.getAttribute('aria-labelledby') || 
                         'Content';
            this.announce(`${label} updated: ${content}`);
        }
    }
    
    /**
     * Manage focus for dynamic content changes
     */
    manageFocusForUpdate(element, options = {}) {
        const { preserveFocus = true, announceChange = true } = options;
        
        if (preserveFocus && document.activeElement === element) {
            // Temporarily blur and refocus to trigger screen reader update
            element.blur();
            setTimeout(() => {
                element.focus();
                if (announceChange) {
                    this.announce('Content updated', 'polite');
                }
            }, 50);
        }
    }
    
    /**
     * Create accessible loading state
     */
    createLoadingState(container, message = 'Loading...') {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'wf-loading-state';
        loadingElement.setAttribute('role', 'status');
        loadingElement.setAttribute('aria-live', 'polite');
        loadingElement.setAttribute('aria-label', message);
        loadingElement.textContent = message;
        
        // Visual loading indicator
        loadingElement.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-size: 16px;
            color: var(--wf-color-text-secondary, #666);
        `;
        
        container.appendChild(loadingElement);
        return loadingElement;
    }
    
    /**
     * Remove loading state and announce completion
     */
    removeLoadingState(loadingElement, completionMessage = 'Content loaded') {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
            this.announce(completionMessage, 'polite');
        }
    }
    
    /**
     * Create accessible error state
     */
    createErrorState(container, errorMessage, actionable = true) {
        const errorElement = document.createElement('div');
        errorElement.className = 'wf-error-state';
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'assertive');
        
        const errorText = document.createElement('p');
        errorText.textContent = errorMessage;
        errorElement.appendChild(errorText);
        
        if (actionable) {
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry';
            retryButton.className = 'wf-retry-button';
            retryButton.addEventListener('click', () => {
                this.announce('Retrying...', 'polite');
            });
            errorElement.appendChild(retryButton);
        }
        
        container.appendChild(errorElement);
        this.announceError(errorMessage);
        
        return errorElement;
    }
    
    /**
     * Get screen reader helpers summary
     */
    getSummary() {
        return {
            liveRegions: Array.from(this.liveRegions.keys()),
            skipLinks: this.skipLinks.size,
            landmarks: this.landmarks.size,
            queuedAnnouncements: this.announcementQueue.length,
            initialized: this.initialized
        };
    }
    
    /**
     * Clear all announcements and reset state
     */
    reset() {
        this.announcementQueue = [];
        this.liveRegions.forEach(region => {
            region.textContent = '';
        });
        this.announce('Screen reader helpers reset', 'polite');
    }
}

// Create global instance
window.WF_ScreenReaderHelpers = new ScreenReaderHelpers();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenReaderHelpers;
}
