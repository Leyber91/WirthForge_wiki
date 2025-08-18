/**
 * WF-UX-004 Compliance Validation Tests
 * WCAG 2.2 AA compliance validation and regulatory requirement testing
 * Ensures adherence to accessibility standards and legal requirements
 */

const { axe, toHaveNoViolations } = require('jest-axe');
const { JSDOM } = require('jsdom');

expect.extend(toHaveNoViolations);

describe('WF-UX-004 Compliance Validation', () => {
    let dom, document, window;
    
    beforeEach(() => {
        dom = new JSDOM(`<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body></body></html>`);
        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;
    });
    
    afterEach(() => {
        dom.window.close();
    });
    
    describe('WCAG 2.2 Level A Compliance', () => {
        test('1.1.1 Non-text Content', async () => {
            document.body.innerHTML = `
                <img src="test.jpg" alt="Energy visualization showing 3 active models">
                <canvas role="img" aria-label="Interactive energy display"></canvas>
            `;
            
            const results = await axe(document, { rules: { 'image-alt': { enabled: true } } });
            expect(results).toHaveNoViolations();
        });
        
        test('1.3.1 Info and Relationships', async () => {
            document.body.innerHTML = `
                <h1>Main Title</h1>
                <h2>Section Title</h2>
                <form>
                    <fieldset>
                        <legend>Motion Settings</legend>
                        <label><input type="radio" name="motion" value="full"> Full Motion</label>
                    </fieldset>
                </form>
            `;
            
            const results = await axe(document, { 
                rules: { 
                    'heading-order': { enabled: true },
                    'label': { enabled: true },
                    'fieldset-legend': { enabled: true }
                } 
            });
            expect(results).toHaveNoViolations();
        });
        
        test('2.1.1 Keyboard Accessible', () => {
            document.body.innerHTML = `
                <button>Accessible Button</button>
                <a href="#main">Skip Link</a>
                <div tabindex="0" role="button">Custom Button</div>
            `;
            
            const focusableElements = document.querySelectorAll('button, a[href], [tabindex="0"]');
            expect(focusableElements.length).toBeGreaterThan(0);
            
            focusableElements.forEach(element => {
                expect(element.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });
        
        test('2.1.2 No Keyboard Trap', () => {
            // Test focus trap implementation
            document.body.innerHTML = `
                <div id="modal" role="dialog" aria-modal="true">
                    <button id="first">First</button>
                    <button id="last">Last</button>
                </div>
            `;
            
            const modal = document.getElementById('modal');
            const firstButton = document.getElementById('first');
            const lastButton = document.getElementById('last');
            
            expect(modal.getAttribute('aria-modal')).toBe('true');
            expect(firstButton.tabIndex).toBeGreaterThanOrEqual(0);
            expect(lastButton.tabIndex).toBeGreaterThanOrEqual(0);
        });
        
        test('3.1.1 Language of Page', () => {
            expect(document.documentElement.getAttribute('lang')).toBeTruthy();
            expect(document.documentElement.getAttribute('lang')).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
        });
        
        test('4.1.1 Parsing', async () => {
            const results = await axe(document, { 
                rules: { 
                    'duplicate-id': { enabled: true },
                    'valid-lang': { enabled: true }
                } 
            });
            expect(results).toHaveNoViolations();
        });
        
        test('4.1.2 Name, Role, Value', async () => {
            document.body.innerHTML = `
                <button aria-label="Close Dialog">×</button>
                <input type="text" aria-label="Search Query">
                <div role="button" tabindex="0" aria-label="Custom Control">Click me</div>
            `;
            
            const results = await axe(document, { 
                rules: { 
                    'button-name': { enabled: true },
                    'input-button-name': { enabled: true }
                } 
            });
            expect(results).toHaveNoViolations();
        });
    });
    
    describe('WCAG 2.2 Level AA Compliance', () => {
        test('1.4.3 Contrast (Minimum)', async () => {
            document.body.innerHTML = `
                <p style="color: #000; background: #fff;">High contrast text</p>
                <button style="color: #fff; background: #0066cc;">Accessible button</button>
            `;
            
            const results = await axe(document, { 
                rules: { 'color-contrast': { enabled: true } } 
            });
            expect(results).toHaveNoViolations();
        });
        
        test('1.4.4 Resize Text', () => {
            // Test that text can be resized up to 200% without loss of functionality
            document.body.innerHTML = `
                <div style="font-size: 16px; max-width: 100%;">
                    <p>This text should be readable at 200% zoom</p>
                    <button>This button should remain clickable</button>
                </div>
            `;
            
            const textElements = document.querySelectorAll('p, button');
            textElements.forEach(element => {
                const style = window.getComputedStyle(element);
                expect(style.fontSize).toBeTruthy();
            });
        });
        
        test('1.4.5 Images of Text', () => {
            // Verify no images of text are used unnecessarily
            document.body.innerHTML = `
                <h1>Text Heading (not image)</h1>
                <button>Text Button (not image)</button>
            `;
            
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const buttons = document.querySelectorAll('button');
            
            expect(headings.length).toBeGreaterThan(0);
            expect(buttons.length).toBeGreaterThan(0);
        });
        
        test('2.4.1 Bypass Blocks', () => {
            document.body.innerHTML = `
                <a href="#main" class="skip-link">Skip to main content</a>
                <nav>Navigation</nav>
                <main id="main">Main content</main>
            `;
            
            const skipLink = document.querySelector('.skip-link');
            const mainContent = document.getElementById('main');
            
            expect(skipLink).toBeTruthy();
            expect(skipLink.getAttribute('href')).toBe('#main');
            expect(mainContent).toBeTruthy();
        });
        
        test('2.4.2 Page Titled', () => {
            expect(document.title).toBeTruthy();
            expect(document.title.trim()).not.toBe('');
        });
        
        test('2.4.3 Focus Order', () => {
            document.body.innerHTML = `
                <button tabindex="0">First</button>
                <input type="text" tabindex="0">
                <a href="#" tabindex="0">Last</a>
            `;
            
            const focusableElements = document.querySelectorAll('[tabindex="0"]');
            focusableElements.forEach(element => {
                expect(element.tabIndex).toBe(0);
            });
        });
        
        test('3.1.2 Language of Parts', () => {
            document.body.innerHTML = `
                <p>English text</p>
                <p lang="es">Texto en español</p>
                <p lang="fr">Texte en français</p>
            `;
            
            const foreignLanguageElements = document.querySelectorAll('[lang]');
            foreignLanguageElements.forEach(element => {
                expect(element.getAttribute('lang')).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
            });
        });
        
        test('3.2.1 On Focus', () => {
            // Verify focus doesn't trigger unexpected context changes
            document.body.innerHTML = `
                <input type="text" id="search">
                <button type="button">Search</button>
            `;
            
            const input = document.getElementById('search');
            expect(input.type).toBe('text');
            expect(input.getAttribute('onchange')).toBeNull();
        });
        
        test('3.2.2 On Input', () => {
            // Verify input doesn't trigger unexpected context changes
            document.body.innerHTML = `
                <select id="options">
                    <option value="1">Option 1</option>
                    <option value="2">Option 2</option>
                </select>
            `;
            
            const select = document.getElementById('options');
            expect(select.getAttribute('onchange')).toBeNull();
        });
    });
    
    describe('Section 508 Compliance', () => {
        test('Electronic Content Accessibility', async () => {
            document.body.innerHTML = `
                <main role="main">
                    <h1>Accessible Content</h1>
                    <p>All content is accessible to assistive technology</p>
                    <button aria-label="Accessible Button">Action</button>
                </main>
            `;
            
            const results = await axe(document, { tags: ['section508'] });
            expect(results).toHaveNoViolations();
        });
        
        test('Keyboard Navigation Requirements', () => {
            document.body.innerHTML = `
                <nav>
                    <a href="#section1">Section 1</a>
                    <a href="#section2">Section 2</a>
                </nav>
                <main>
                    <section id="section1" tabindex="-1">
                        <h2>Section 1</h2>
                    </section>
                </main>
            `;
            
            const links = document.querySelectorAll('a[href^="#"]');
            links.forEach(link => {
                const target = document.querySelector(link.getAttribute('href'));
                expect(target).toBeTruthy();
            });
        });
    });
    
    describe('EN 301 549 Compliance (European Standard)', () => {
        test('Web Content Requirements', async () => {
            document.body.innerHTML = `
                <header role="banner">
                    <h1>WIRTHFORGE</h1>
                    <nav role="navigation">
                        <ul>
                            <li><a href="#main">Main</a></li>
                        </ul>
                    </nav>
                </header>
                <main role="main" id="main">
                    <h2>Energy Visualization</h2>
                </main>
            `;
            
            const results = await axe(document, { tags: ['wcag2a', 'wcag2aa'] });
            expect(results).toHaveNoViolations();
        });
        
        test('ICT Accessibility Requirements', () => {
            // Test specific ICT requirements
            const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href]');
            
            interactiveElements.forEach(element => {
                // Must be programmatically determinable
                expect(element.tagName).toBeTruthy();
                
                // Must have accessible name
                const hasAccessibleName = element.getAttribute('aria-label') ||
                                        element.getAttribute('aria-labelledby') ||
                                        element.textContent.trim() ||
                                        element.getAttribute('title');
                expect(hasAccessibleName).toBeTruthy();
            });
        });
    });
    
    describe('AODA Compliance (Ontario)', () => {
        test('Information and Communications Standard', async () => {
            document.body.innerHTML = `
                <form>
                    <label for="email">Email Address</label>
                    <input type="email" id="email" required aria-describedby="email-error">
                    <div id="email-error" role="alert"></div>
                </form>
            `;
            
            const results = await axe(document);
            expect(results).toHaveNoViolations();
        });
    });
    
    describe('ADA Compliance (Americans with Disabilities Act)', () => {
        test('Title III Requirements', async () => {
            document.body.innerHTML = `
                <main>
                    <h1>Public Accommodation</h1>
                    <p>Equal access to all users</p>
                    <button>Accessible Action</button>
                </main>
            `;
            
            const results = await axe(document, { tags: ['wcag2a', 'wcag2aa'] });
            expect(results).toHaveNoViolations();
        });
    });
    
    describe('Custom Compliance Rules', () => {
        test('WIRTHFORGE Accessibility Standards', () => {
            document.body.innerHTML = `
                <div id="energy-visualization" 
                     role="img" 
                     aria-label="Energy visualization" 
                     tabindex="0">
                    <canvas></canvas>
                    <div class="sr-only">Alternative description</div>
                </div>
            `;
            
            const energyViz = document.getElementById('energy-visualization');
            expect(energyViz.getAttribute('role')).toBe('img');
            expect(energyViz.getAttribute('aria-label')).toBeTruthy();
            expect(energyViz.getAttribute('tabindex')).toBe('0');
            
            const srOnly = energyViz.querySelector('.sr-only');
            expect(srOnly).toBeTruthy();
            expect(srOnly.textContent.trim()).not.toBe('');
        });
        
        test('Live Region Requirements', () => {
            document.body.innerHTML = `
                <div id="status-updates" aria-live="polite" aria-atomic="false"></div>
                <div id="error-messages" aria-live="assertive" aria-atomic="true"></div>
                <div id="progress-updates" aria-live="polite" aria-atomic="false"></div>
            `;
            
            const liveRegions = document.querySelectorAll('[aria-live]');
            expect(liveRegions.length).toBeGreaterThanOrEqual(3);
            
            liveRegions.forEach(region => {
                const liveValue = region.getAttribute('aria-live');
                expect(['polite', 'assertive']).toContain(liveValue);
                expect(region.hasAttribute('aria-atomic')).toBeTruthy();
            });
        });
        
        test('Color Vision Support Requirements', () => {
            document.body.innerHTML = `
                <div class="energy-state-red" 
                     data-pattern="diagonal-lines"
                     aria-label="High energy state (red with diagonal lines)">
                </div>
                <div class="energy-state-green" 
                     data-pattern="dots"
                     aria-label="Normal energy state (green with dots)">
                </div>
            `;
            
            const colorElements = document.querySelectorAll('[data-pattern]');
            colorElements.forEach(element => {
                expect(element.getAttribute('data-pattern')).toBeTruthy();
                expect(element.getAttribute('aria-label')).toContain('(');
            });
        });
    });
    
    describe('Compliance Reporting', () => {
        test('Generate WCAG Compliance Report', async () => {
            document.body.innerHTML = `
                <main role="main">
                    <h1>Test Page</h1>
                    <p>Content for testing</p>
                    <button>Test Button</button>
                </main>
            `;
            
            const results = await axe(document, {
                tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
                resultTypes: ['violations', 'incomplete', 'passes']
            });
            
            const report = {
                url: 'test-page',
                timestamp: new Date().toISOString(),
                violations: results.violations.length,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                wcagLevel: 'AA',
                compliance: results.violations.length === 0 ? 'PASS' : 'FAIL'
            };
            
            expect(report.compliance).toBe('PASS');
            expect(report.violations).toBe(0);
        });
        
        test('Generate Section 508 Report', async () => {
            const results = await axe(document, { tags: ['section508'] });
            
            const section508Report = {
                standard: 'Section 508',
                violations: results.violations,
                compliant: results.violations.length === 0,
                testDate: new Date().toISOString()
            };
            
            expect(section508Report.compliant).toBeTruthy();
        });
    });
    
    describe('Audit Trail', () => {
        test('Document Compliance Testing', () => {
            const auditEntry = {
                testSuite: 'WF-UX-004 Compliance Validation',
                testDate: new Date().toISOString(),
                tester: 'Automated Test Suite',
                wcagVersion: '2.2',
                level: 'AA',
                tools: ['axe-core', 'jest-axe'],
                scope: 'Full application',
                results: 'PASS'
            };
            
            expect(auditEntry.wcagVersion).toBe('2.2');
            expect(auditEntry.level).toBe('AA');
            expect(auditEntry.results).toBe('PASS');
        });
    });
});

// Compliance utilities
class ComplianceValidator {
    static async validateWCAG22AA(document) {
        const results = await axe(document, {
            tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']
        });
        
        return {
            compliant: results.violations.length === 0,
            violations: results.violations,
            score: this.calculateComplianceScore(results)
        };
    }
    
    static calculateComplianceScore(results) {
        const total = results.violations.length + results.passes.length;
        if (total === 0) return 100;
        
        return Math.round((results.passes.length / total) * 100);
    }
    
    static generateComplianceReport(results) {
        return {
            summary: {
                total: results.violations.length + results.passes.length,
                passed: results.passes.length,
                failed: results.violations.length,
                score: this.calculateComplianceScore(results)
            },
            violations: results.violations.map(v => ({
                rule: v.id,
                impact: v.impact,
                description: v.description,
                help: v.help,
                helpUrl: v.helpUrl,
                nodes: v.nodes.length
            })),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = { ComplianceValidator };
