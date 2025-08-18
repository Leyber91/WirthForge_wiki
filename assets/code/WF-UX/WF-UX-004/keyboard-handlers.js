/**
 * WF-UX-004 Keyboard Navigation Handlers
 * Comprehensive keyboard navigation system with roving tabindex, focus traps, and shortcuts
 * Ensures full keyboard accessibility for all interactive elements
 */

class KeyboardHandlers {
    constructor() {
        this.focusTraps = new Map();
        this.rovingTabGroups = new Map();
        this.shortcuts = new Map();
        this.focusHistory = [];
        this.currentTrap = null;
        this.initialized = false;
        
        // Default keyboard shortcuts
        this.defaultShortcuts = {
            'Alt+1': () => this.focusMainContent(),
            'Alt+2': () => this.focusNavigation(),
            'Alt+3': () => this.focusEnergyVisualization(),
            'Alt+4': () => this.focusAccessibilityControls(),
            'Escape': () => this.handleEscape(),
            'F1': () => this.showKeyboardHelp(),
            'Ctrl+/': () => this.showKeyboardHelp(),
            'Alt+H': () => this.showKeyboardHelp()
        };
        
        this.init();
    }
    
    /**
     * Initialize keyboard handlers
     */
    init() {
        if (this.initialized) return;
        
        this.setupGlobalKeyboardListeners();
        this.setupDefaultShortcuts();
        this.setupFocusManagement();
        this.setupRovingTabindex();
        this.initialized = true;
        
        // Announce keyboard navigation availability
        if (window.WF_ScreenReaderHelpers) {
            window.WF_ScreenReaderHelpers.announce(
                'Keyboard navigation enabled. Press Alt+H for help.',
                'polite'
            );
        }
    }
    
    /**
     * Setup global keyboard event listeners
     */
    setupGlobalKeyboardListeners() {
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        document.addEventListener('keyup', this.handleGlobalKeyup.bind(this));
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
    }
    
    /**
     * Handle global keydown events
     */
    handleGlobalKeydown(event) {
        const key = this.getKeyCombo(event);
        
        // Check for registered shortcuts
        if (this.shortcuts.has(key)) {
            const handler = this.shortcuts.get(key);
            if (handler && typeof handler === 'function') {
                event.preventDefault();
                handler(event);
                return;
            }
        }
        
        // Handle focus trap navigation
        if (this.currentTrap) {
            this.handleFocusTrapNavigation(event);
        }
        
        // Handle roving tabindex navigation
        this.handleRovingTabNavigation(event);
        
        // Handle special keys
        this.handleSpecialKeys(event);
    }
    
    /**
     * Handle global keyup events
     */
    handleGlobalKeyup(event) {
        // Track modifier keys for complex shortcuts
        this.updateModifierState(event);
    }
    
    /**
     * Get key combination string
     */
    getKeyCombo(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        // Handle special keys
        const specialKeys = {
            ' ': 'Space',
            'Enter': 'Enter',
            'Escape': 'Escape',
            'Tab': 'Tab',
            'ArrowUp': 'ArrowUp',
            'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft',
            'ArrowRight': 'ArrowRight',
            'Home': 'Home',
            'End': 'End',
            'PageUp': 'PageUp',
            'PageDown': 'PageDown'
        };
        
        const key = specialKeys[event.key] || event.key;
        parts.push(key);
        
        return parts.join('+');
    }
    
    /**
     * Setup default keyboard shortcuts
     */
    setupDefaultShortcuts() {
        Object.entries(this.defaultShortcuts).forEach(([key, handler]) => {
            this.registerShortcut(key, handler);
        });
    }
    
    /**
     * Register keyboard shortcut
     */
    registerShortcut(keyCombo, handler, description = '') {
        this.shortcuts.set(keyCombo, handler);
        
        // Store description for help system
        if (description) {
            if (!this.shortcuts.descriptions) {
                this.shortcuts.descriptions = new Map();
            }
            this.shortcuts.descriptions.set(keyCombo, description);
        }
    }
    
    /**
     * Unregister keyboard shortcut
     */
    unregisterShortcut(keyCombo) {
        this.shortcuts.delete(keyCombo);
        if (this.shortcuts.descriptions) {
            this.shortcuts.descriptions.delete(keyCombo);
        }
    }
    
    /**
     * Create focus trap for modal dialogs and overlays
     */
    createFocusTrap(container, options = {}) {
        const trapId = options.id || `trap-${Date.now()}`;
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) {
            console.warn('Focus trap created with no focusable elements');
            return null;
        }
        
        const trap = {
            id: trapId,
            container,
            focusableElements,
            firstElement: focusableElements[0],
            lastElement: focusableElements[focusableElements.length - 1],
            previousFocus: document.activeElement,
            active: false,
            options: {
                returnFocus: options.returnFocus !== false,
                escapeDeactivates: options.escapeDeactivates !== false,
                ...options
            }
        };
        
        this.focusTraps.set(trapId, trap);
        return trapId;
    }
    
    /**
     * Activate focus trap
     */
    activateFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap) return false;
        
        // Deactivate current trap if exists
        if (this.currentTrap) {
            this.deactivateFocusTrap(this.currentTrap.id);
        }
        
        trap.active = true;
        this.currentTrap = trap;
        
        // Focus first element
        trap.firstElement.focus();
        
        // Announce trap activation
        if (window.WF_ScreenReaderHelpers) {
            window.WF_ScreenReaderHelpers.announce(
                'Dialog opened. Press Escape to close.',
                'assertive'
            );
        }
        
        return true;
    }
    
    /**
     * Deactivate focus trap
     */
    deactivateFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap || !trap.active) return false;
        
        trap.active = false;
        this.currentTrap = null;
        
        // Return focus to previous element
        if (trap.options.returnFocus && trap.previousFocus) {
            trap.previousFocus.focus();
        }
        
        return true;
    }
    
    /**
     * Handle focus trap navigation
     */
    handleFocusTrapNavigation(event) {
        if (!this.currentTrap || event.key !== 'Tab') return;
        
        const trap = this.currentTrap;
        const isTabPressed = event.key === 'Tab';
        const isShiftPressed = event.shiftKey;
        
        if (!isTabPressed) return;
        
        // Update focusable elements (in case DOM changed)
        trap.focusableElements = this.getFocusableElements(trap.container);
        trap.firstElement = trap.focusableElements[0];
        trap.lastElement = trap.focusableElements[trap.focusableElements.length - 1];
        
        if (isShiftPressed) {
            // Shift + Tab
            if (document.activeElement === trap.firstElement) {
                event.preventDefault();
                trap.lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === trap.lastElement) {
                event.preventDefault();
                trap.firstElement.focus();
            }
        }
    }
    
    /**
     * Setup roving tabindex for complex widgets
     */
    setupRovingTabindex() {
        // Find elements with roving tabindex data attribute
        const rovingGroups = document.querySelectorAll('[data-roving-tabindex]');
        
        rovingGroups.forEach(group => {
            this.createRovingTabGroup(group);
        });
    }
    
    /**
     * Create roving tabindex group
     */
    createRovingTabGroup(container, options = {}) {
        const groupId = options.id || `roving-${Date.now()}`;
        const selector = options.itemSelector || '[role="tab"], [role="menuitem"], [role="option"], [role="gridcell"]';
        const items = container.querySelectorAll(selector);
        
        if (items.length === 0) return null;
        
        const group = {
            id: groupId,
            container,
            items: Array.from(items),
            currentIndex: 0,
            orientation: options.orientation || 'horizontal',
            wrap: options.wrap !== false,
            activateOnFocus: options.activateOnFocus === true
        };
        
        // Initialize tabindex values
        group.items.forEach((item, index) => {
            item.tabIndex = index === 0 ? 0 : -1;
            item.setAttribute('data-roving-index', index.toString());
        });
        
        this.rovingTabGroups.set(groupId, group);
        
        // Add event listeners
        container.addEventListener('keydown', (event) => {
            this.handleRovingTabKeydown(event, groupId);
        });
        
        container.addEventListener('focusin', (event) => {
            this.handleRovingTabFocusIn(event, groupId);
        });
        
        return groupId;
    }
    
    /**
     * Handle roving tabindex navigation
     */
    handleRovingTabNavigation(event) {
        const target = event.target;
        const groupContainer = target.closest('[data-roving-tabindex]');
        
        if (!groupContainer) return;
        
        // Find the group
        const group = Array.from(this.rovingTabGroups.values())
            .find(g => g.container === groupContainer);
            
        if (!group) return;
        
        this.handleRovingTabKeydown(event, group.id);
    }
    
    /**
     * Handle keydown for roving tabindex group
     */
    handleRovingTabKeydown(event, groupId) {
        const group = this.rovingTabGroups.get(groupId);
        if (!group) return;
        
        const { key } = event;
        const isHorizontal = group.orientation === 'horizontal';
        const isVertical = group.orientation === 'vertical';
        
        let handled = false;
        let newIndex = group.currentIndex;
        
        switch (key) {
            case 'ArrowRight':
                if (isHorizontal) {
                    newIndex = this.getNextIndex(group.currentIndex, group.items.length, group.wrap);
                    handled = true;
                }
                break;
                
            case 'ArrowLeft':
                if (isHorizontal) {
                    newIndex = this.getPreviousIndex(group.currentIndex, group.items.length, group.wrap);
                    handled = true;
                }
                break;
                
            case 'ArrowDown':
                if (isVertical) {
                    newIndex = this.getNextIndex(group.currentIndex, group.items.length, group.wrap);
                    handled = true;
                }
                break;
                
            case 'ArrowUp':
                if (isVertical) {
                    newIndex = this.getPreviousIndex(group.currentIndex, group.items.length, group.wrap);
                    handled = true;
                }
                break;
                
            case 'Home':
                newIndex = 0;
                handled = true;
                break;
                
            case 'End':
                newIndex = group.items.length - 1;
                handled = true;
                break;
        }
        
        if (handled) {
            event.preventDefault();
            this.moveRovingTabFocus(groupId, newIndex);
        }
    }
    
    /**
     * Handle focus in for roving tabindex
     */
    handleRovingTabFocusIn(event, groupId) {
        const group = this.rovingTabGroups.get(groupId);
        if (!group) return;
        
        const target = event.target;
        const index = group.items.indexOf(target);
        
        if (index !== -1) {
            group.currentIndex = index;
            this.updateRovingTabindex(group);
        }
    }
    
    /**
     * Move focus in roving tabindex group
     */
    moveRovingTabFocus(groupId, newIndex) {
        const group = this.rovingTabGroups.get(groupId);
        if (!group || newIndex < 0 || newIndex >= group.items.length) return;
        
        group.currentIndex = newIndex;
        this.updateRovingTabindex(group);
        group.items[newIndex].focus();
        
        // Activate if configured
        if (group.activateOnFocus) {
            group.items[newIndex].click();
        }
    }
    
    /**
     * Update tabindex values for roving group
     */
    updateRovingTabindex(group) {
        group.items.forEach((item, index) => {
            item.tabIndex = index === group.currentIndex ? 0 : -1;
        });
    }
    
    /**
     * Get next index with wrapping
     */
    getNextIndex(current, length, wrap) {
        if (current < length - 1) {
            return current + 1;
        }
        return wrap ? 0 : current;
    }
    
    /**
     * Get previous index with wrapping
     */
    getPreviousIndex(current, length, wrap) {
        if (current > 0) {
            return current - 1;
        }
        return wrap ? length - 1 : current;
    }
    
    /**
     * Get focusable elements within container
     */
    getFocusableElements(container) {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]',
            'audio[controls]',
            'video[controls]',
            'iframe',
            'object',
            'embed',
            'area[href]',
            'summary'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(focusableSelectors))
            .filter(element => {
                return element.offsetWidth > 0 && 
                       element.offsetHeight > 0 && 
                       !element.hasAttribute('hidden') &&
                       getComputedStyle(element).visibility !== 'hidden';
            });
    }
    
    /**
     * Handle special keys
     */
    handleSpecialKeys(event) {
        switch (event.key) {
            case 'Escape':
                this.handleEscape();
                break;
                
            case 'F6':
                event.preventDefault();
                this.cycleLandmarks(event.shiftKey);
                break;
        }
    }
    
    /**
     * Handle escape key
     */
    handleEscape() {
        // Close current focus trap
        if (this.currentTrap) {
            this.deactivateFocusTrap(this.currentTrap.id);
            return;
        }
        
        // Close any open menus or dropdowns
        const openMenus = document.querySelectorAll('[aria-expanded="true"]');
        openMenus.forEach(menu => {
            menu.setAttribute('aria-expanded', 'false');
            menu.focus();
        });
        
        // Return to main content
        if (openMenus.length === 0) {
            this.focusMainContent();
        }
    }
    
    /**
     * Focus main content
     */
    focusMainContent() {
        const main = document.querySelector('main, [role="main"], #main-content');
        if (main) {
            main.focus();
            if (window.WF_ScreenReaderHelpers) {
                window.WF_ScreenReaderHelpers.announce('Main content focused', 'polite');
            }
        }
    }
    
    /**
     * Focus navigation
     */
    focusNavigation() {
        const nav = document.querySelector('nav, [role="navigation"], #navigation');
        if (nav) {
            const firstLink = nav.querySelector('a, button');
            if (firstLink) {
                firstLink.focus();
            } else {
                nav.focus();
            }
            if (window.WF_ScreenReaderHelpers) {
                window.WF_ScreenReaderHelpers.announce('Navigation focused', 'polite');
            }
        }
    }
    
    /**
     * Focus energy visualization
     */
    focusEnergyVisualization() {
        const viz = document.querySelector('#energy-visualization, [data-energy-viz]');
        if (viz) {
            viz.focus();
            if (window.WF_ScreenReaderHelpers) {
                window.WF_ScreenReaderHelpers.announce('Energy visualization focused', 'polite');
            }
        }
    }
    
    /**
     * Focus accessibility controls
     */
    focusAccessibilityControls() {
        const controls = document.querySelector('#accessibility-controls, [data-accessibility-controls]');
        if (controls) {
            const firstControl = controls.querySelector('button, input, select');
            if (firstControl) {
                firstControl.focus();
            } else {
                controls.focus();
            }
            if (window.WF_ScreenReaderHelpers) {
                window.WF_ScreenReaderHelpers.announce('Accessibility controls focused', 'polite');
            }
        }
    }
    
    /**
     * Show keyboard help
     */
    showKeyboardHelp() {
        // Create or show keyboard help dialog
        let helpDialog = document.getElementById('wf-keyboard-help');
        
        if (!helpDialog) {
            helpDialog = this.createKeyboardHelpDialog();
        }
        
        helpDialog.style.display = 'block';
        
        // Create focus trap for help dialog
        const trapId = this.createFocusTrap(helpDialog, {
            id: 'keyboard-help-trap',
            escapeDeactivates: true
        });
        
        this.activateFocusTrap(trapId);
    }
    
    /**
     * Create keyboard help dialog
     */
    createKeyboardHelpDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'wf-keyboard-help';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-labelledby', 'keyboard-help-title');
        dialog.setAttribute('aria-modal', 'true');
        
        dialog.innerHTML = `
            <div class="keyboard-help-content">
                <h2 id="keyboard-help-title">Keyboard Shortcuts</h2>
                <div class="shortcuts-list">
                    <h3>Navigation</h3>
                    <dl>
                        <dt>Alt + 1</dt><dd>Focus main content</dd>
                        <dt>Alt + 2</dt><dd>Focus navigation</dd>
                        <dt>Alt + 3</dt><dd>Focus energy visualization</dd>
                        <dt>Alt + 4</dt><dd>Focus accessibility controls</dd>
                        <dt>F6</dt><dd>Cycle through landmarks</dd>
                    </dl>
                    
                    <h3>General</h3>
                    <dl>
                        <dt>Escape</dt><dd>Close dialog or return to main content</dd>
                        <dt>Alt + H</dt><dd>Show this help</dd>
                        <dt>Tab</dt><dd>Move to next focusable element</dd>
                        <dt>Shift + Tab</dt><dd>Move to previous focusable element</dd>
                    </dl>
                    
                    <h3>Energy Visualization</h3>
                    <dl>
                        <dt>Space</dt><dd>Pause/resume animation</dd>
                        <dt>Arrow Keys</dt><dd>Navigate visualization</dd>
                        <dt>Enter</dt><dd>Activate focused element</dd>
                    </dl>
                </div>
                <button id="close-keyboard-help" class="close-button">Close</button>
            </div>
        `;
        
        // Style the dialog
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const content = dialog.querySelector('.keyboard-help-content');
        content.style.cssText = `
            background: var(--wf-color-background, #fff);
            color: var(--wf-color-text, #000);
            max-width: 600px;
            margin: 50px auto;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        // Add close functionality
        const closeButton = dialog.querySelector('#close-keyboard-help');
        closeButton.addEventListener('click', () => {
            dialog.style.display = 'none';
            this.deactivateFocusTrap('keyboard-help-trap');
        });
        
        document.body.appendChild(dialog);
        return dialog;
    }
    
    /**
     * Cycle through landmarks
     */
    cycleLandmarks(reverse = false) {
        const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
        
        if (landmarks.length === 0) return;
        
        const currentIndex = Array.from(landmarks).findIndex(landmark => 
            landmark.contains(document.activeElement)
        );
        
        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex <= 0 ? landmarks.length - 1 : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= landmarks.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextLandmark = landmarks[nextIndex];
        nextLandmark.focus();
        
        const landmarkName = nextLandmark.getAttribute('aria-label') || 
                            nextLandmark.getAttribute('role');
        
        if (window.WF_ScreenReaderHelpers) {
            window.WF_ScreenReaderHelpers.announce(`${landmarkName} landmark`, 'polite');
        }
    }
    
    /**
     * Handle focus in events
     */
    handleFocusIn(event) {
        // Track focus history
        this.focusHistory.push({
            element: event.target,
            timestamp: Date.now()
        });
        
        // Keep history limited
        if (this.focusHistory.length > 10) {
            this.focusHistory.shift();
        }
    }
    
    /**
     * Handle focus out events
     */
    handleFocusOut(event) {
        // Could be used for cleanup or analytics
    }
    
    /**
     * Get keyboard handlers summary
     */
    getSummary() {
        return {
            shortcuts: this.shortcuts.size,
            focusTraps: this.focusTraps.size,
            rovingTabGroups: this.rovingTabGroups.size,
            currentTrap: this.currentTrap?.id || null,
            focusHistoryLength: this.focusHistory.length,
            initialized: this.initialized
        };
    }
    
    /**
     * Cleanup and reset
     */
    cleanup() {
        // Deactivate all focus traps
        this.focusTraps.forEach((trap, id) => {
            if (trap.active) {
                this.deactivateFocusTrap(id);
            }
        });
        
        // Clear all data
        this.focusTraps.clear();
        this.rovingTabGroups.clear();
        this.shortcuts.clear();
        this.focusHistory = [];
        this.currentTrap = null;
    }
}

// Create global instance
window.WF_KeyboardHandlers = new KeyboardHandlers();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardHandlers;
}
