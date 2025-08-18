/**
 * WF-FND-003 Architecture Validation Script
 * Validates layer compliance, contracts, and performance requirements
 * 
 * @version 1.0.0
 * @date 2025-01-12
 * @author WIRTHFORGE Asset Generation System
 */

const fs = require('fs').promises;
const path = require('path');

class WF_FND_003_ArchitectureValidator {
    constructor() {
        this.basePath = path.join(__dirname, '../../');
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        
        // Expected assets for WF-FND-003
        this.expectedAssets = {
            documentation: [
                'docs/WF-FND-003/document.md'
            ],
            diagrams: [
                'assets/diagrams/WF-FND-003-layer-stack.mmd',
                'assets/diagrams/WF-FND-003-data-flow.mmd',
                'assets/diagrams/WF-FND-003-hardware-tiers.mmd',
                'assets/diagrams/WF-FND-003-integration-points.mmd'
            ],
            contracts: [
                'data/WF-FND-003-layer-contracts.json',
                'data/WF-FND-003-api-schemas.json'
            ],
            codeExamples: [
                'code/WF-FND-003/layer-examples/layer1-identity.py',
                'code/WF-FND-003/layer-examples/layer3-orchestrator.py',
                'code/WF-FND-003/interfaces/layer-interfaces.ts'
            ],
            tests: [
                'tests/WF-FND-003/architecture-validator.js'
            ]
        };
        
        // Layer communication rules
        this.allowedCommunication = [
            'L5 ↔ L4',
            'L4 ↔ L1',
            'L4 ↔ L3', 
            'L3 ↔ L2',
            'L3 ↔ L1'
        ];
        
        this.forbiddenCommunication = [
            'L5 ↔ L3',
            'L5 ↔ L2',
            'L5 ↔ L1',
            'L4 ↔ L2',
            'L2 ↔ L1'
        ];
        
        // Performance requirements
        this.performanceRequirements = {
            frameRate: 60,
            frameBudget: 16.67, // ms
            maxLatency: 50, // ms
            maxQueueSize: 1000
        };
    }

    async validateAllAssets() {
        console.log('🏗️  Starting WF-FND-003 Architecture Validation...\n');
        
        try {
            await this.validateAssetExistence();
            await this.validateLayerContracts();
            await this.validateApiSchemas();
            await this.validateMermaidDiagrams();
            await this.validateCodeExamples();
            await this.validateArchitectureCompliance();
            await this.validatePerformanceRequirements();
            await this.validateIntegrationPoints();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            this.results.failed++;
        }
    }

    async validateAssetExistence() {
        console.log('📁 Validating asset existence...');
        
        const allAssets = [
            ...this.expectedAssets.documentation,
            ...this.expectedAssets.diagrams,
            ...this.expectedAssets.contracts,
            ...this.expectedAssets.codeExamples,
            ...this.expectedAssets.tests
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

    async validateLayerContracts() {
        console.log('📋 Validating layer contracts...');
        
        const contractsPath = path.join(this.basePath, 'data/WF-FND-003-layer-contracts.json');
        try {
            const content = await fs.readFile(contractsPath, 'utf8');
            const contracts = JSON.parse(content);
            
            // Validate required contract structure
            const requiredSections = ['layerContracts', 'crossLayerRules', 'validationRules'];
            for (const section of requiredSections) {
                if (!contracts[section]) {
                    this.logFail(`Missing contract section: ${section}`);
                } else {
                    this.logPass(`Contract section present: ${section}`);
                }
            }
            
            // Validate each layer contract
            const expectedLayers = ['L1_InputIdentity', 'L2_ModelCompute', 'L3_OrchestrationEnergy', 'L4_ContractsTransport', 'L5_VisualizationUX'];
            for (const layer of expectedLayers) {
                if (!contracts.layerContracts[layer]) {
                    this.logFail(`Missing layer contract: ${layer}`);
                } else {
                    this.validateLayerContract(layer, contracts.layerContracts[layer]);
                }
            }
            
            // Validate communication rules
            this.validateCommunicationRules(contracts.crossLayerRules);
            
        } catch (error) {
            this.logFail(`Layer contracts validation failed: ${error.message}`);
        }
    }

    validateLayerContract(layerName, contract) {
        const requiredFields = ['purpose', 'responsibilities', 'inputContract', 'outputContract', 'allowedDirections', 'antiPatterns'];
        
        for (const field of requiredFields) {
            if (!contract[field]) {
                this.logFail(`${layerName} missing required field: ${field}`);
            } else {
                this.logPass(`${layerName} has required field: ${field}`);
            }
        }
        
        // Validate input/output contracts have proper structure
        if (contract.inputContract && !contract.inputContract.consumes) {
            this.logWarning(`${layerName} input contract missing 'consumes' specification`);
        }
        
        if (contract.outputContract && !contract.outputContract.produces) {
            this.logWarning(`${layerName} output contract missing 'produces' specification`);
        }
    }

    validateCommunicationRules(crossLayerRules) {
        if (!crossLayerRules.communicationFlow) {
            this.logFail('Missing communication flow rules');
            return;
        }
        
        const { allowed, forbidden } = crossLayerRules.communicationFlow;
        
        // Check that all allowed communications are properly defined
        for (const allowedComm of this.allowedCommunication) {
            if (!allowed.includes(allowedComm)) {
                this.logWarning(`Expected allowed communication not found: ${allowedComm}`);
            }
        }
        
        // Check that forbidden communications are properly restricted
        for (const forbiddenComm of this.forbiddenCommunication) {
            if (!forbidden.includes(forbiddenComm)) {
                this.logWarning(`Expected forbidden communication not restricted: ${forbiddenComm}`);
            }
        }
        
        this.logPass('Communication rules validation completed');
    }

    async validateApiSchemas() {
        console.log('🌐 Validating API schemas...');
        
        const schemasPath = path.join(this.basePath, 'data/WF-FND-003-api-schemas.json');
        try {
            const content = await fs.readFile(schemasPath, 'utf8');
            const schemas = JSON.parse(content);
            
            // Validate WebSocket protocol
            if (!schemas.websocketProtocol) {
                this.logFail('Missing WebSocket protocol specification');
            } else {
                this.validateWebSocketProtocol(schemas.websocketProtocol);
            }
            
            // Validate REST API endpoints
            if (!schemas.restApiEndpoints) {
                this.logFail('Missing REST API endpoints specification');
            } else {
                this.validateRestApiEndpoints(schemas.restApiEndpoints);
            }
            
            // Validate error handling
            if (!schemas.errorHandling) {
                this.logFail('Missing error handling specification');
            } else {
                this.validateErrorHandling(schemas.errorHandling);
            }
            
            // Validate performance specifications
            if (!schemas.performanceSpecifications) {
                this.logFail('Missing performance specifications');
            } else {
                this.validatePerformanceSpecs(schemas.performanceSpecifications);
            }
            
        } catch (error) {
            this.logFail(`API schemas validation failed: ${error.message}`);
        }
    }

    validateWebSocketProtocol(protocol) {
        const requiredFields = ['version', 'connectionEndpoint', 'messageEnvelope', 'messageTypes'];
        
        for (const field of requiredFields) {
            if (!protocol[field]) {
                this.logFail(`WebSocket protocol missing: ${field}`);
            } else {
                this.logPass(`WebSocket protocol has: ${field}`);
            }
        }
        
        // Validate message types
        const expectedMessageTypes = ['userInput', 'controlAction', 'tokenStream', 'energyUpdate', 'interferenceEvent'];
        for (const msgType of expectedMessageTypes) {
            if (!protocol.messageTypes[msgType]) {
                this.logWarning(`Missing WebSocket message type: ${msgType}`);
            }
        }
    }

    validateRestApiEndpoints(endpoints) {
        const requiredEndpoints = ['getModels', 'getSystemStatus', 'createSession', 'getSession'];
        
        for (const endpoint of requiredEndpoints) {
            if (!endpoints.endpoints[endpoint]) {
                this.logFail(`Missing REST endpoint: ${endpoint}`);
            } else {
                this.logPass(`REST endpoint present: ${endpoint}`);
            }
        }
    }

    validateErrorHandling(errorHandling) {
        if (!errorHandling.httpErrorCodes) {
            this.logFail('Missing HTTP error codes specification');
        }
        
        if (!errorHandling.websocketErrors) {
            this.logFail('Missing WebSocket error specification');
        }
        
        // Check for standard HTTP error codes
        const standardCodes = ['400', '401', '404', '429', '500', '503'];
        for (const code of standardCodes) {
            if (!errorHandling.httpErrorCodes[code]) {
                this.logWarning(`Missing standard HTTP error code: ${code}`);
            }
        }
        
        this.logPass('Error handling validation completed');
    }

    validatePerformanceSpecs(perfSpecs) {
        const requiredSpecs = ['websocketLimits', 'httpLimits', 'realTimeRequirements'];
        
        for (const spec of requiredSpecs) {
            if (!perfSpecs[spec]) {
                this.logFail(`Missing performance spec: ${spec}`);
            }
        }
        
        // Validate real-time requirements match architecture specs
        if (perfSpecs.realTimeRequirements) {
            const realTime = perfSpecs.realTimeRequirements;
            
            if (realTime.targetFrameRate !== '60Hz') {
                this.logWarning('Target frame rate should be 60Hz for energy truth visualization');
            }
            
            if (realTime.maxLatency && parseInt(realTime.maxLatency) > this.performanceRequirements.maxLatency) {
                this.logWarning(`Max latency (${realTime.maxLatency}) exceeds requirement (${this.performanceRequirements.maxLatency}ms)`);
            }
        }
        
        this.logPass('Performance specifications validation completed');
    }

    async validateMermaidDiagrams() {
        console.log('📊 Validating Mermaid diagrams...');
        
        for (const diagramPath of this.expectedAssets.diagrams) {
            const fullPath = path.join(this.basePath, diagramPath);
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Check for valid Mermaid syntax
                if (!content.includes('graph') && !content.includes('sequenceDiagram') && !content.includes('flowchart')) {
                    this.logFail(`Invalid Mermaid diagram type: ${diagramPath}`);
                    continue;
                }
                
                // Check for layer references in architecture diagrams
                if (diagramPath.includes('layer-stack') || diagramPath.includes('data-flow')) {
                    const hasAllLayers = ['L1', 'L2', 'L3', 'L4', 'L5'].every(layer => 
                        content.includes(layer)
                    );
                    
                    if (!hasAllLayers) {
                        this.logWarning(`Diagram missing layer references: ${diagramPath}`);
                    } else {
                        this.logPass(`All layers referenced in: ${diagramPath}`);
                    }
                }
                
                // Check for WIRTHFORGE color classes
                if (content.includes('classDef')) {
                    this.logPass(`Color classes defined in: ${diagramPath}`);
                } else {
                    this.logWarning(`No color classes in: ${diagramPath}`);
                }
                
                this.logPass(`Mermaid diagram validation passed: ${diagramPath}`);
                
            } catch (error) {
                this.logFail(`Mermaid validation failed: ${diagramPath} - ${error.message}`);
            }
        }
    }

    async validateCodeExamples() {
        console.log('💻 Validating code examples...');
        
        for (const codePath of this.expectedAssets.codeExamples) {
            const fullPath = path.join(this.basePath, codePath);
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Check for proper layer implementation patterns
                if (codePath.includes('layer1')) {
                    this.validateLayer1Code(content, codePath);
                } else if (codePath.includes('layer3')) {
                    this.validateLayer3Code(content, codePath);
                } else if (codePath.includes('interfaces')) {
                    this.validateInterfaceCode(content, codePath);
                }
                
                this.logPass(`Code example validation passed: ${codePath}`);
                
            } catch (error) {
                this.logFail(`Code validation failed: ${codePath} - ${error.message}`);
            }
        }
    }

    validateLayer1Code(content, filePath) {
        const requiredPatterns = [
            'validate_input',
            'resolve_identity', 
            'check_rate_limit',
            'InputEvent',
            'process_request'
        ];
        
        for (const pattern of requiredPatterns) {
            if (!content.includes(pattern)) {
                this.logWarning(`Layer 1 code missing pattern: ${pattern} in ${filePath}`);
            }
        }
        
        // Check for anti-patterns
        if (content.includes('time.sleep(') && !content.includes('asyncio.sleep(')) {
            this.logWarning(`Layer 1 code uses blocking sleep: ${filePath}`);
        }
    }

    validateLayer3Code(content, filePath) {
        const requiredPatterns = [
            '60',
            'frame_rate',
            'update_loop',
            'energy',
            'orchestrat',
            'async def'
        ];
        
        for (const pattern of requiredPatterns) {
            if (!content.includes(pattern)) {
                this.logWarning(`Layer 3 code missing pattern: ${pattern} in ${filePath}`);
            }
        }
        
        // Check for 60Hz implementation
        if (!content.includes('16.67') && !content.includes('1.0 / 60')) {
            this.logWarning(`Layer 3 code missing 60Hz frame budget calculation: ${filePath}`);
        }
    }

    validateInterfaceCode(content, filePath) {
        const requiredInterfaces = [
            'Layer1Interface',
            'Layer2Interface', 
            'Layer3Interface',
            'Layer4Interface',
            'Layer5Interface'
        ];
        
        for (const iface of requiredInterfaces) {
            if (!content.includes(iface)) {
                this.logWarning(`Interface definition missing: ${iface} in ${filePath}`);
            }
        }
    }

    async validateArchitectureCompliance() {
        console.log('🏛️  Validating architecture compliance...');
        
        // Check that all layers are properly defined
        const layersPath = path.join(this.basePath, 'data/WF-FND-003-layer-contracts.json');
        try {
            const content = await fs.readFile(layersPath, 'utf8');
            const contracts = JSON.parse(content);
            
            // Validate single source of truth principle
            const l3Contract = contracts.layerContracts.L3_OrchestrationEnergy;
            if (!l3Contract.responsibilities.includes('Global state management (single source of truth)')) {
                this.logFail('L3 not designated as single source of truth');
            } else {
                this.logPass('L3 properly designated as single source of truth');
            }
            
            // Validate 60Hz requirement
            if (!contracts.crossLayerRules.performanceRequirements.globalFrameRate.includes('60Hz')) {
                this.logFail('60Hz requirement not specified in cross-layer rules');
            } else {
                this.logPass('60Hz requirement properly specified');
            }
            
            // Validate non-blocking requirement
            if (!contracts.crossLayerRules.performanceRequirements.nonBlockingRule) {
                this.logFail('Non-blocking rule not specified');
            } else {
                this.logPass('Non-blocking rule properly specified');
            }
            
        } catch (error) {
            this.logFail(`Architecture compliance validation failed: ${error.message}`);
        }
    }

    async validatePerformanceRequirements() {
        console.log('⚡ Validating performance requirements...');
        
        // Check that performance specs align with architecture requirements
        const schemasPath = path.join(this.basePath, 'data/WF-FND-003-api-schemas.json');
        try {
            const content = await fs.readFile(schemasPath, 'utf8');
            const schemas = JSON.parse(content);
            
            const perfSpecs = schemas.performanceSpecifications;
            if (perfSpecs && perfSpecs.realTimeRequirements) {
                const realTime = perfSpecs.realTimeRequirements;
                
                // Validate frame rate
                if (realTime.targetFrameRate === '60Hz') {
                    this.logPass('Target frame rate correctly set to 60Hz');
                } else {
                    this.logFail(`Incorrect target frame rate: ${realTime.targetFrameRate}`);
                }
                
                // Validate latency requirements
                if (realTime.maxLatency && parseInt(realTime.maxLatency.replace('ms', '')) <= this.performanceRequirements.maxLatency) {
                    this.logPass('Max latency within requirements');
                } else {
                    this.logWarning('Max latency may exceed requirements');
                }
                
                // Validate backpressure handling
                if (realTime.maxBackpressureBuffer) {
                    this.logPass('Backpressure buffer specified');
                } else {
                    this.logWarning('Backpressure buffer not specified');
                }
            }
            
        } catch (error) {
            this.logFail(`Performance requirements validation failed: ${error.message}`);
        }
    }

    async validateIntegrationPoints() {
        console.log('🔗 Validating integration points...');
        
        // Check integration diagram exists and references other WF documents
        const integrationPath = path.join(this.basePath, 'assets/diagrams/WF-FND-003-integration-points.mmd');
        try {
            const content = await fs.readFile(integrationPath, 'utf8');
            
            // Check for references to other WIRTHFORGE documents
            const expectedReferences = ['WF-TECH-001', 'WF-TECH-002', 'WF-TECH-003', 'WF-UX-006', 'WF-FND-001', 'WF-FND-002'];
            for (const ref of expectedReferences) {
                if (content.includes(ref)) {
                    this.logPass(`Integration reference found: ${ref}`);
                } else {
                    this.logWarning(`Integration reference missing: ${ref}`);
                }
            }
            
            // Check for layer mappings
            if (content.includes('Layer to Tech Mappings') || content.includes('Integration Contracts')) {
                this.logPass('Integration mappings properly defined');
            } else {
                this.logWarning('Integration mappings may be incomplete');
            }
            
        } catch (error) {
            this.logFail(`Integration points validation failed: ${error.message}`);
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
        console.log('\n🏗️  ARCHITECTURE VALIDATION REPORT');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);
        console.log(`📋 Total Checks: ${this.results.passed + this.results.failed + this.results.warnings}`);
        
        const successRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All critical architecture validations passed!');
            console.log('WF-FND-003 architecture is compliant and ready for implementation.');
        } else {
            console.log('\n🔧 Architecture issues found that need attention:');
            this.results.details
                .filter(detail => detail.type === 'FAIL')
                .forEach(detail => console.log(`   • ${detail.message}`));
        }
        
        if (this.results.warnings > 0) {
            console.log('\n⚠️  Recommendations for improvement:');
            this.results.details
                .filter(detail => detail.type === 'WARNING')
                .slice(0, 5) // Show top 5 warnings
                .forEach(detail => console.log(`   • ${detail.message}`));
        }
        
        // Generate JSON report
        const report = {
            document: 'WF-FND-003',
            validationType: 'Architecture Compliance',
            validationDate: new Date().toISOString(),
            results: this.results,
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.failed > 0) {
            recommendations.push('Address all failed validation checks before proceeding with implementation');
        }
        
        if (this.results.warnings > 10) {
            recommendations.push('Review warnings to improve architecture compliance and clarity');
        }
        
        recommendations.push('Ensure all layer implementations follow the defined contracts');
        recommendations.push('Validate 60Hz performance requirements in actual implementation');
        recommendations.push('Test cross-layer communication boundaries in integration testing');
        recommendations.push('Implement comprehensive monitoring for architecture compliance');
        
        return recommendations;
    }
}

// CLI execution
if (require.main === module) {
    const validator = new WF_FND_003_ArchitectureValidator();
    validator.validateAllAssets()
        .then(() => {
            process.exit(validator.results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Architecture validation script failed:', error);
            process.exit(1);
        });
}

module.exports = WF_FND_003_ArchitectureValidator;
