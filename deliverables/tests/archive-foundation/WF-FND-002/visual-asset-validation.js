/**
 * WF-FND-002 Visual Asset Validation Script
 * Validates all visual assets for physics visualization system
 * 
 * @version 1.0.0
 * @date 2025-01-12
 * @author WIRTHFORGE Asset Generation System
 */

const fs = require('fs').promises;
const path = require('path');

class WF_FND_002_AssetValidator {
    constructor() {
        this.basePath = path.join(__dirname, '../../');
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        
        // Expected assets based on WF-FND-002 specifications
        this.expectedAssets = {
            diagrams: [
                'assets/diagrams/WF-FND-002-progressive-levels.mmd',
                'assets/diagrams/WF-FND-002-physics-mapping.mmd',
                'assets/diagrams/WF-FND-002-broker-architecture.mmd'
            ],
            visualAssets: [
                'assets/visual/WF-FND-002-lightning-bolt.svg',
                'assets/visual/WF-FND-002-energy-stream.svg',
                'assets/visual/WF-FND-002-interference-pattern.svg',
                'assets/visual/WF-FND-002-resonance-celebration.svg'
            ],
            dataFiles: [
                'data/WF-FND-002-visual-specs.json',
                'data/WF-FND-002-accessibility.json'
            ],
            uiTokens: [
                'ui/WF-FND-002-design-tokens.json'
            ],
            codeSnippets: [
                'code/WF-FND-002/snippets/mermaid-examples.md'
            ],
            documentation: [
                'docs/WF-FND-002/document.md'
            ]
        };
        
        // Color palette validation
        this.colorPalette = {
            lightning: '#fbbf24',
            energyStream: '#60a5fa',
            interference: '#c084fc',
            resonance: '#a855f7',
            system: '#1f2937'
        };
        
        // Performance requirements
        this.performanceRequirements = {
            maxFileSize: 500 * 1024, // 500KB max per asset
            frameRate: 60, // 60fps target
            frameBudget: 16.67 // 16.67ms frame budget
        };
    }

    async validateAllAssets() {
        console.log('🔍 Starting WF-FND-002 Visual Asset Validation...\n');
        
        try {
            await this.validateAssetExistence();
            await this.validateSVGAssets();
            await this.validateJSONSchemas();
            await this.validateMermaidDiagrams();
            await this.validateAccessibilityCompliance();
            await this.validatePerformanceRequirements();
            await this.validateColorConsistency();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            this.results.failed++;
        }
    }

    async validateAssetExistence() {
        console.log('📁 Validating asset existence...');
        
        const allAssets = [
            ...this.expectedAssets.diagrams,
            ...this.expectedAssets.visualAssets,
            ...this.expectedAssets.dataFiles,
            ...this.expectedAssets.uiTokens,
            ...this.expectedAssets.codeSnippets,
            ...this.expectedAssets.documentation
        ];

        for (const asset of allAssets) {
            const fullPath = path.join(this.basePath, asset);
            try {
                await fs.access(fullPath);
                this.logPass(`Asset exists: ${asset}`);
            } catch (error) {
                this.logFail(`Missing asset: ${asset}`);
            }
        }
    }

    async validateSVGAssets() {
        console.log('🎨 Validating SVG visual assets...');
        
        for (const svgPath of this.expectedAssets.visualAssets) {
            const fullPath = path.join(this.basePath, svgPath);
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Check for valid SVG structure
                if (!content.includes('<svg') || !content.includes('</svg>')) {
                    this.logFail(`Invalid SVG structure: ${svgPath}`);
                    continue;
                }
                
                // Check for accessibility attributes
                if (!content.includes('aria-') && !content.includes('<title>') && !content.includes('<desc>')) {
                    this.logWarning(`Missing accessibility attributes: ${svgPath}`);
                }
                
                // Check for animation elements (60fps compliance)
                const animations = content.match(/<animate/g) || [];
                if (animations.length > 10) {
                    this.logWarning(`High animation count (${animations.length}): ${svgPath}`);
                }
                
                // Check for WIRTHFORGE color palette usage
                const hasWirthforgeColors = Object.values(this.colorPalette).some(color => 
                    content.includes(color)
                );
                
                if (!hasWirthforgeColors) {
                    this.logWarning(`No WIRTHFORGE colors detected: ${svgPath}`);
                }
                
                this.logPass(`SVG validation passed: ${svgPath}`);
                
            } catch (error) {
                this.logFail(`SVG validation failed: ${svgPath} - ${error.message}`);
            }
        }
    }

    async validateJSONSchemas() {
        console.log('📋 Validating JSON schemas...');
        
        const jsonFiles = [...this.expectedAssets.dataFiles, ...this.expectedAssets.uiTokens];
        
        for (const jsonPath of jsonFiles) {
            const fullPath = path.join(this.basePath, jsonPath);
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                const data = JSON.parse(content);
                
                // Check for required metadata
                const requiredFields = ['document', 'title', 'version', 'lastUpdated'];
                const missingFields = requiredFields.filter(field => !data[field]);
                
                if (missingFields.length > 0) {
                    this.logFail(`Missing required fields in ${jsonPath}: ${missingFields.join(', ')}`);
                } else {
                    this.logPass(`JSON schema validation passed: ${jsonPath}`);
                }
                
                // Check for WF-FND-002 document reference
                if (data.document !== 'WF-FND-002') {
                    this.logWarning(`Incorrect document reference: ${jsonPath}`);
                }
                
                // Validate accessibility specifications
                if (jsonPath.includes('accessibility') && !data.wcagCompliance) {
                    this.logFail(`Missing WCAG compliance specification: ${jsonPath}`);
                }
                
            } catch (error) {
                this.logFail(`JSON validation failed: ${jsonPath} - ${error.message}`);
            }
        }
    }

    async validateMermaidDiagrams() {
        console.log('📊 Validating Mermaid diagrams...');
        
        for (const mermaidPath of this.expectedAssets.diagrams) {
            const fullPath = path.join(this.basePath, mermaidPath);
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Check for valid Mermaid syntax
                const validGraphTypes = ['graph', 'flowchart', 'gantt', 'stateDiagram'];
                const hasValidType = validGraphTypes.some(type => content.includes(type));
                
                if (!hasValidType) {
                    this.logFail(`Invalid Mermaid diagram type: ${mermaidPath}`);
                    continue;
                }
                
                // Check for WIRTHFORGE color classes
                const hasColorClasses = content.includes('classDef') && content.includes('class ');
                if (!hasColorClasses) {
                    this.logWarning(`Missing color class definitions: ${mermaidPath}`);
                }
                
                // Check for accessibility considerations
                if (!content.includes('fill:') || !content.includes('stroke:')) {
                    this.logWarning(`Missing color specifications: ${mermaidPath}`);
                }
                
                this.logPass(`Mermaid diagram validation passed: ${mermaidPath}`);
                
            } catch (error) {
                this.logFail(`Mermaid validation failed: ${mermaidPath} - ${error.message}`);
            }
        }
    }

    async validateAccessibilityCompliance() {
        console.log('♿ Validating accessibility compliance...');
        
        const accessibilityPath = path.join(this.basePath, 'data/WF-FND-002-accessibility.json');
        try {
            const content = await fs.readFile(accessibilityPath, 'utf8');
            const data = JSON.parse(content);
            
            // Check WCAG compliance level
            if (data.wcagCompliance !== 'WCAG 2.2 AA') {
                this.logFail('WCAG compliance level must be WCAG 2.2 AA');
            }
            
            // Check for color blind support
            if (!data.accessibilityFeatures?.visualAccessibility?.colorBlindSupport) {
                this.logFail('Missing color blind support specifications');
            }
            
            // Check for motion accessibility
            if (!data.accessibilityFeatures?.visualAccessibility?.motionAccessibility) {
                this.logFail('Missing motion accessibility specifications');
            }
            
            // Check for keyboard navigation
            if (!data.accessibilityFeatures?.motorAccessibility?.keyboardNavigation) {
                this.logFail('Missing keyboard navigation specifications');
            }
            
            this.logPass('Accessibility compliance validation passed');
            
        } catch (error) {
            this.logFail(`Accessibility validation failed: ${error.message}`);
        }
    }

    async validatePerformanceRequirements() {
        console.log('⚡ Validating performance requirements...');
        
        // Check file sizes
        const allAssets = [
            ...this.expectedAssets.visualAssets,
            ...this.expectedAssets.diagrams
        ];
        
        for (const asset of allAssets) {
            const fullPath = path.join(this.basePath, asset);
            try {
                const stats = await fs.stat(fullPath);
                if (stats.size > this.performanceRequirements.maxFileSize) {
                    this.logWarning(`Large file size (${Math.round(stats.size/1024)}KB): ${asset}`);
                } else {
                    this.logPass(`File size OK (${Math.round(stats.size/1024)}KB): ${asset}`);
                }
            } catch (error) {
                this.logFail(`Performance check failed: ${asset} - ${error.message}`);
            }
        }
        
        // Validate 60fps compliance in design tokens
        const tokensPath = path.join(this.basePath, 'ui/WF-FND-002-design-tokens.json');
        try {
            const content = await fs.readFile(tokensPath, 'utf8');
            const data = JSON.parse(content);
            
            if (data.performance?.frameRate !== '60fps') {
                this.logFail('Frame rate must be 60fps for energy truth visualization');
            }
            
            if (data.performance?.frameBudget !== '16.67ms') {
                this.logFail('Frame budget must be 16.67ms for 60fps compliance');
            }
            
            this.logPass('Performance requirements validation passed');
            
        } catch (error) {
            this.logFail(`Performance validation failed: ${error.message}`);
        }
    }

    async validateColorConsistency() {
        console.log('🎨 Validating color consistency...');
        
        // Check design tokens
        const tokensPath = path.join(this.basePath, 'ui/WF-FND-002-design-tokens.json');
        try {
            const content = await fs.readFile(tokensPath, 'utf8');
            const data = JSON.parse(content);
            
            // Validate WIRTHFORGE color palette
            const expectedColors = {
                lightning: '#fbbf24',
                energyStream: '#60a5fa',
                interference: '#c084fc',
                resonance: '#a855f7'
            };
            
            for (const [name, expectedColor] of Object.entries(expectedColors)) {
                const actualColor = data.colorPalettes?.[name]?.primary;
                if (actualColor !== expectedColor) {
                    this.logFail(`Color mismatch for ${name}: expected ${expectedColor}, got ${actualColor}`);
                } else {
                    this.logPass(`Color consistency OK: ${name}`);
                }
            }
            
        } catch (error) {
            this.logFail(`Color consistency validation failed: ${error.message}`);
        }
    }

    logPass(message) {
        console.log(`✅ ${message}`);
        this.results.passed++;
        this.results.details.push({ type: 'PASS', message });
    }

    logFail(message) {
        console.log(`❌ ${message}`);
        this.results.failed++;
        this.results.details.push({ type: 'FAIL', message });
    }

    logWarning(message) {
        console.log(`⚠️  ${message}`);
        this.results.warnings++;
        this.results.details.push({ type: 'WARNING', message });
    }

    generateReport() {
        console.log('\n📊 VALIDATION REPORT');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);
        console.log(`📋 Total Checks: ${this.results.passed + this.results.failed + this.results.warnings}`);
        
        const successRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All critical validations passed!');
            console.log('WF-FND-002 assets are ready for production.');
        } else {
            console.log('\n🔧 Issues found that need attention:');
            this.results.details
                .filter(detail => detail.type === 'FAIL')
                .forEach(detail => console.log(`   • ${detail.message}`));
        }
        
        // Generate JSON report
        const report = {
            document: 'WF-FND-002',
            validationDate: new Date().toISOString(),
            results: this.results,
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.failed > 0) {
            recommendations.push('Address all failed validation checks before production deployment');
        }
        
        if (this.results.warnings > 5) {
            recommendations.push('Review warnings to improve asset quality and performance');
        }
        
        recommendations.push('Run accessibility testing with real users and assistive technologies');
        recommendations.push('Perform performance testing on target devices and browsers');
        recommendations.push('Validate visual effects with color-blind users');
        
        return recommendations;
    }
}

// CLI execution
if (require.main === module) {
    const validator = new WF_FND_002_AssetValidator();
    validator.validateAllAssets()
        .then(() => {
            process.exit(validator.results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Validation script failed:', error);
            process.exit(1);
        });
}

module.exports = WF_FND_002_AssetValidator;
