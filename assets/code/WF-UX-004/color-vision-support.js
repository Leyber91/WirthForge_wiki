/**
 * WF-UX-004 Color Vision Support
 * Comprehensive color vision adaptation utilities for protanopia, deuteranopia, tritanopia, and monochromacy
 * Provides real-time color transformations and accessible alternatives
 */

class ColorVisionSupport {
    constructor() {
        this.colorProfiles = new Map();
        this.activeProfile = 'normal';
        this.colorMappings = new Map();
        this.observers = new Set();
        this.initialized = false;
        
        // Color vision deficiency matrices
        this.cvdMatrices = {
            protanopia: [
                0.567, 0.433, 0.000,
                0.558, 0.442, 0.000,
                0.000, 0.242, 0.758
            ],
            deuteranopia: [
                0.625, 0.375, 0.000,
                0.700, 0.300, 0.000,
                0.000, 0.300, 0.700
            ],
            tritanopia: [
                0.950, 0.050, 0.000,
                0.000, 0.433, 0.567,
                0.000, 0.475, 0.525
            ],
            monochromacy: [
                0.299, 0.587, 0.114,
                0.299, 0.587, 0.114,
                0.299, 0.587, 0.114
            ]
        };
        
        // Accessible color alternatives
        this.accessibleColors = {
            red: { pattern: 'diagonal-lines', symbol: '■', description: 'Red (diagonal lines)' },
            green: { pattern: 'dots', symbol: '●', description: 'Green (dots)' },
            blue: { pattern: 'vertical-lines', symbol: '▲', description: 'Blue (vertical lines)' },
            yellow: { pattern: 'horizontal-lines', symbol: '◆', description: 'Yellow (horizontal lines)' },
            orange: { pattern: 'cross-hatch', symbol: '✦', description: 'Orange (cross-hatch)' },
            purple: { pattern: 'waves', symbol: '◗', description: 'Purple (waves)' }
        };
        
        this.init();
    }
    
    /**
     * Initialize color vision support
     */
    init() {
        if (this.initialized) return;
        
        this.setupColorProfiles();
        this.createSVGPatterns();
        this.createColorFilters();
        this.detectUserPreferences();
        this.setupColorMappings();
        this.initialized = true;
        
        // Announce initialization
        if (window.WF_ScreenReaderHelpers) {
            window.WF_ScreenReaderHelpers.announce(
                'Color vision support initialized',
                'polite'
            );
        }
    }
    
    /**
     * Setup color vision profiles
     */
    setupColorProfiles() {
        const profiles = [
            {
                id: 'normal',
                name: 'Normal Color Vision',
                description: 'Standard color display without modifications',
                matrix: null,
                enabled: true
            },
            {
                id: 'protanopia',
                name: 'Protanopia',
                description: 'Red-blind color vision (missing L-cones)',
                matrix: this.cvdMatrices.protanopia,
                enabled: true
            },
            {
                id: 'deuteranopia',
                name: 'Deuteranopia',
                description: 'Green-blind color vision (missing M-cones)',
                matrix: this.cvdMatrices.deuteranopia,
                enabled: true
            },
            {
                id: 'tritanopia',
                name: 'Tritanopia',
                description: 'Blue-blind color vision (missing S-cones)',
                matrix: this.cvdMatrices.tritanopia,
                enabled: true
            },
            {
                id: 'monochromacy',
                name: 'Monochromacy',
                description: 'Complete color blindness (grayscale)',
                matrix: this.cvdMatrices.monochromacy,
                enabled: true
            },
            {
                id: 'high-contrast',
                name: 'High Contrast',
                description: 'Enhanced contrast for low vision',
                matrix: null,
                enabled: true,
                customCSS: true
            }
        ];
        
        profiles.forEach(profile => {
            this.colorProfiles.set(profile.id, profile);
        });
    }
    
    /**
     * Detect user color vision preferences
     */
    detectUserPreferences() {
        // Check for stored preferences
        try {
            const stored = localStorage.getItem('wf-color-vision-profile');
            if (stored && this.colorProfiles.has(stored)) {
                this.setColorProfile(stored);
                return;
            }
        } catch (error) {
            console.warn('Failed to load color vision preferences:', error);
        }
        
        // Check for OS high contrast mode
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            this.setColorProfile('high-contrast');
        }
        
        // Check for forced colors (Windows high contrast)
        if (window.matchMedia && window.matchMedia('(forced-colors: active)').matches) {
            this.setColorProfile('high-contrast');
        }
    }
    
    /**
     * Set active color profile
     */
    setColorProfile(profileId) {
        const profile = this.colorProfiles.get(profileId);
        if (!profile || !profile.enabled) {
            console.warn(`Color profile '${profileId}' not found or disabled`);
            return false;
        }
        
        const previousProfile = this.activeProfile;
        this.activeProfile = profileId;
        
        // Apply the profile
        this.applyColorProfile(profile);
        
        // Save preference
        try {
            localStorage.setItem('wf-color-vision-profile', profileId);
        } catch (error) {
            console.warn('Failed to save color vision preference:', error);
        }
        
        // Notify observers
        this.notifyObservers(profileId, previousProfile);
        
        // Announce change
        if (window.WF_ScreenReaderHelpers && previousProfile !== profileId) {
            window.WF_ScreenReaderHelpers.announce(
                `Color vision profile changed to ${profile.name}`,
                'polite'
            );
        }
        
        return true;
    }
    
    /**
     * Apply color profile to document
     */
    applyColorProfile(profile) {
        const root = document.documentElement;
        
        // Remove existing color vision classes
        root.classList.remove('wf-protanopia', 'wf-deuteranopia', 'wf-tritanopia', 'wf-monochromacy', 'wf-high-contrast');
        
        // Apply new profile
        if (profile.id !== 'normal') {
            root.classList.add(`wf-${profile.id}`);
        }
        
        // Apply CSS filter if matrix-based
        if (profile.matrix) {
            this.applyColorMatrix(profile.matrix);
        } else {
            this.removeColorMatrix();
        }
        
        // Apply custom CSS for high contrast
        if (profile.customCSS) {
            this.applyHighContrastStyles();
        }
        
        // Update color mappings
        this.updateColorMappings(profile);
    }
    
    /**
     * Apply color matrix filter
     */
    applyColorMatrix(matrix) {
        let filterElement = document.getElementById('wf-color-vision-filter');
        
        if (!filterElement) {
            filterElement = document.createElement('div');
            filterElement.id = 'wf-color-vision-filter';
            filterElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999999;
                mix-blend-mode: multiply;
            `;
            document.body.appendChild(filterElement);
        }
        
        // Create CSS filter from matrix
        const filterValue = `url(#wf-cvd-filter-${this.activeProfile})`;
        document.body.style.filter = filterValue;
    }
    
    /**
     * Remove color matrix filter
     */
    removeColorMatrix() {
        document.body.style.filter = '';
        const filterElement = document.getElementById('wf-color-vision-filter');
        if (filterElement) {
            filterElement.remove();
        }
    }
    
    /**
     * Apply high contrast styles
     */
    applyHighContrastStyles() {
        let styleElement = document.getElementById('wf-high-contrast-styles');
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'wf-high-contrast-styles';
            document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = `
            .wf-high-contrast {
                --wf-color-background: #000000;
                --wf-color-text: #ffffff;
                --wf-color-primary: #ffff00;
                --wf-color-secondary: #00ffff;
                --wf-color-accent: #ff00ff;
                --wf-color-success: #00ff00;
                --wf-color-warning: #ffff00;
                --wf-color-error: #ff0000;
                --wf-color-border: #ffffff;
                --wf-color-focus: #ffff00;
            }
            
            .wf-high-contrast * {
                background-color: var(--wf-color-background) !important;
                color: var(--wf-color-text) !important;
                border-color: var(--wf-color-border) !important;
            }
            
            .wf-high-contrast a,
            .wf-high-contrast button {
                color: var(--wf-color-primary) !important;
                text-decoration: underline !important;
            }
            
            .wf-high-contrast :focus {
                outline: 3px solid var(--wf-color-focus) !important;
                outline-offset: 2px !important;
            }
            
            .wf-high-contrast img,
            .wf-high-contrast video,
            .wf-high-contrast canvas {
                filter: contrast(150%) brightness(120%) !important;
            }
        `;
    }
    
    /**
     * Create SVG patterns for color alternatives
     */
    createSVGPatterns() {
        let svg = document.getElementById('wf-color-patterns');
        
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'wf-color-patterns';
            svg.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden;';
            document.body.appendChild(svg);
        }
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Create patterns for different colors
        const patterns = [
            { id: 'diagonal-lines', path: 'M0,0 L4,4 M-1,3 L3,7 M3,-1 L7,3', color: '#000' },
            { id: 'dots', circle: { cx: 2, cy: 2, r: 1 }, color: '#000' },
            { id: 'vertical-lines', path: 'M2,0 L2,4', color: '#000' },
            { id: 'horizontal-lines', path: 'M0,2 L4,2', color: '#000' },
            { id: 'cross-hatch', path: 'M0,0 L4,4 M0,4 L4,0', color: '#000' },
            { id: 'waves', path: 'M0,2 Q1,0 2,2 Q3,4 4,2', color: '#000' }
        ];
        
        patterns.forEach(patternDef => {
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.id = `wf-pattern-${patternDef.id}`;
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', '4');
            pattern.setAttribute('height', '4');
            
            if (patternDef.path) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', patternDef.path);
                path.setAttribute('stroke', patternDef.color);
                path.setAttribute('stroke-width', '0.5');
                pattern.appendChild(path);
            }
            
            if (patternDef.circle) {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', patternDef.circle.cx);
                circle.setAttribute('cy', patternDef.circle.cy);
                circle.setAttribute('r', patternDef.circle.r);
                circle.setAttribute('fill', patternDef.color);
                pattern.appendChild(circle);
            }
            
            defs.appendChild(pattern);
        });
        
        svg.appendChild(defs);
    }
    
    /**
     * Create SVG color filters
     */
    createColorFilters() {
        let svg = document.getElementById('wf-color-filters');
        
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'wf-color-filters';
            svg.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden;';
            document.body.appendChild(svg);
        }
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Create filters for each CVD type
        Object.entries(this.cvdMatrices).forEach(([type, matrix]) => {
            const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            filter.id = `wf-cvd-filter-${type}`;
            
            const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
            colorMatrix.setAttribute('type', 'matrix');
            colorMatrix.setAttribute('values', matrix.join(' '));
            
            filter.appendChild(colorMatrix);
            defs.appendChild(filter);
        });
        
        svg.appendChild(defs);
    }
    
    /**
     * Setup color mappings for accessible alternatives
     */
    setupColorMappings() {
        // Map common color names to accessible alternatives
        const mappings = [
            { original: 'red', accessible: this.accessibleColors.red },
            { original: 'green', accessible: this.accessibleColors.green },
            { original: 'blue', accessible: this.accessibleColors.blue },
            { original: 'yellow', accessible: this.accessibleColors.yellow },
            { original: 'orange', accessible: this.accessibleColors.orange },
            { original: 'purple', accessible: this.accessibleColors.purple }
        ];
        
        mappings.forEach(mapping => {
            this.colorMappings.set(mapping.original, mapping.accessible);
        });
    }
    
    /**
     * Update color mappings based on active profile
     */
    updateColorMappings(profile) {
        // Add profile-specific logic here if needed
        // For now, mappings remain consistent across profiles
    }
    
    /**
     * Get accessible color alternative
     */
    getAccessibleColor(colorName) {
        return this.colorMappings.get(colorName.toLowerCase()) || {
            pattern: 'solid',
            symbol: '■',
            description: colorName
        };
    }
    
    /**
     * Apply pattern to element
     */
    applyPatternToElement(element, colorName) {
        const accessible = this.getAccessibleColor(colorName);
        
        if (this.activeProfile !== 'normal') {
            element.style.backgroundImage = `url(#wf-pattern-${accessible.pattern})`;
            element.setAttribute('data-color-pattern', accessible.pattern);
            element.setAttribute('aria-label', accessible.description);
        } else {
            element.style.backgroundImage = '';
            element.removeAttribute('data-color-pattern');
        }
    }
    
    /**
     * Transform color value for current profile
     */
    transformColor(rgb) {
        if (this.activeProfile === 'normal') return rgb;
        
        const profile = this.colorProfiles.get(this.activeProfile);
        if (!profile || !profile.matrix) return rgb;
        
        // Parse RGB values
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return rgb;
        
        const [, r, g, b] = match.map(Number);
        const matrix = profile.matrix;
        
        // Apply color matrix transformation
        const newR = Math.round(r * matrix[0] + g * matrix[1] + b * matrix[2]);
        const newG = Math.round(r * matrix[3] + g * matrix[4] + b * matrix[5]);
        const newB = Math.round(r * matrix[6] + g * matrix[7] + b * matrix[8]);
        
        // Clamp values to 0-255 range
        const clampedR = Math.max(0, Math.min(255, newR));
        const clampedG = Math.max(0, Math.min(255, newG));
        const clampedB = Math.max(0, Math.min(255, newB));
        
        return `rgb(${clampedR}, ${clampedG}, ${clampedB})`;
    }
    
    /**
     * Check color contrast ratio
     */
    getContrastRatio(color1, color2) {
        const luminance1 = this.getLuminance(color1);
        const luminance2 = this.getLuminance(color2);
        
        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }
    
    /**
     * Calculate relative luminance
     */
    getLuminance(color) {
        // Parse color to RGB
        const rgb = this.parseColor(color);
        if (!rgb) return 0;
        
        // Convert to relative luminance
        const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    /**
     * Parse color string to RGB array
     */
    parseColor(color) {
        // Handle rgb() format
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
        }
        
        // Handle hex format
        const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            return [
                parseInt(hexMatch[1], 16),
                parseInt(hexMatch[2], 16),
                parseInt(hexMatch[3], 16)
            ];
        }
        
        return null;
    }
    
    /**
     * Suggest accessible color combination
     */
    suggestAccessibleColors(foreground, background, targetRatio = 4.5) {
        const currentRatio = this.getContrastRatio(foreground, background);
        
        if (currentRatio >= targetRatio) {
            return { foreground, background, ratio: currentRatio };
        }
        
        // Try to adjust colors to meet target ratio
        const adjustedForeground = this.adjustColorForContrast(foreground, background, targetRatio);
        const adjustedBackground = this.adjustColorForContrast(background, foreground, targetRatio);
        
        const foregroundRatio = this.getContrastRatio(adjustedForeground, background);
        const backgroundRatio = this.getContrastRatio(foreground, adjustedBackground);
        
        if (foregroundRatio >= targetRatio) {
            return { foreground: adjustedForeground, background, ratio: foregroundRatio };
        }
        
        if (backgroundRatio >= targetRatio) {
            return { foreground, background: adjustedBackground, ratio: backgroundRatio };
        }
        
        // Return best available option
        return foregroundRatio > backgroundRatio
            ? { foreground: adjustedForeground, background, ratio: foregroundRatio }
            : { foreground, background: adjustedBackground, ratio: backgroundRatio };
    }
    
    /**
     * Adjust color to improve contrast
     */
    adjustColorForContrast(color, reference, targetRatio) {
        const rgb = this.parseColor(color);
        if (!rgb) return color;
        
        const referenceLuminance = this.getLuminance(reference);
        
        // Determine if we should make the color lighter or darker
        const shouldLighten = referenceLuminance < 0.5;
        
        let [r, g, b] = rgb;
        let iterations = 0;
        const maxIterations = 50;
        
        while (iterations < maxIterations) {
            const currentColor = `rgb(${r}, ${g}, ${b})`;
            const currentRatio = this.getContrastRatio(currentColor, reference);
            
            if (currentRatio >= targetRatio) {
                return currentColor;
            }
            
            // Adjust color values
            if (shouldLighten) {
                r = Math.min(255, r + 5);
                g = Math.min(255, g + 5);
                b = Math.min(255, b + 5);
            } else {
                r = Math.max(0, r - 5);
                g = Math.max(0, g - 5);
                b = Math.max(0, b - 5);
            }
            
            iterations++;
        }
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    /**
     * Subscribe to color profile changes
     */
    subscribe(callback) {
        this.observers.add(callback);
        return () => this.observers.delete(callback);
    }
    
    /**
     * Notify observers of profile changes
     */
    notifyObservers(newProfile, oldProfile) {
        this.observers.forEach(callback => {
            try {
                callback(newProfile, oldProfile, this.colorProfiles.get(newProfile));
            } catch (error) {
                console.error('Error in color vision observer:', error);
            }
        });
    }
    
    /**
     * Get available color profiles
     */
    getAvailableProfiles() {
        return Array.from(this.colorProfiles.values())
            .filter(profile => profile.enabled)
            .map(profile => ({
                id: profile.id,
                name: profile.name,
                description: profile.description,
                active: profile.id === this.activeProfile
            }));
    }
    
    /**
     * Get current color profile
     */
    getCurrentProfile() {
        return this.colorProfiles.get(this.activeProfile);
    }
    
    /**
     * Test color vision simulation
     */
    testColorVision(testColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']) {
        const results = {};
        
        testColors.forEach(color => {
            results[color] = {};
            
            Object.keys(this.cvdMatrices).forEach(profileId => {
                const originalProfile = this.activeProfile;
                this.activeProfile = profileId;
                results[color][profileId] = this.transformColor(`rgb(${this.parseColor(color).join(', ')})`);
                this.activeProfile = originalProfile;
            });
        });
        
        return results;
    }
    
    /**
     * Get color vision support summary
     */
    getSummary() {
        return {
            activeProfile: this.activeProfile,
            availableProfiles: this.colorProfiles.size,
            colorMappings: this.colorMappings.size,
            observers: this.observers.size,
            initialized: this.initialized
        };
    }
    
    /**
     * Reset to normal color vision
     */
    reset() {
        this.setColorProfile('normal');
        
        if (window.WF_ScreenReaderHelpers) {
            window.WF_ScreenReaderHelpers.announce(
                'Color vision reset to normal',
                'polite'
            );
        }
    }
}

// Create global instance
window.WF_ColorVisionSupport = new ColorVisionSupport();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorVisionSupport;
}
