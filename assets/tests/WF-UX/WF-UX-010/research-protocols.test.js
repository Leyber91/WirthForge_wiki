/**
 * WF-UX-010 Research Protocols Test Suite
 * Tests for research protocol validation, execution, and compliance
 */

import { GovernanceValidator } from '../../../code/WF-UX-010/governance-validator.js';
import { ExperimentFramework } from '../../../code/WF-UX-010/experiment-framework.js';
import { PrivacyManager } from '../../../code/WF-UX-010/privacy-manager.js';

describe('Research Protocols Test Suite', () => {
    let governanceValidator;
    let experimentFramework;
    let privacyManager;
    let testProtocol;

    beforeEach(() => {
        // Initialize test environment
        governanceValidator = new GovernanceValidator({
            strictMode: true,
            auditLogging: true,
            maxValidationTime: 5
        });

        experimentFramework = new ExperimentFramework({
            maxConcurrentExperiments: 3,
            minSampleSize: 50,
            confidenceLevel: 0.95
        });

        privacyManager = new PrivacyManager({
            strictMode: true,
            consentRequired: true,
            immediateOptOut: true
        });

        // Sample test protocol
        testProtocol = {
            protocolId: 'TEST-PROTOCOL-001',
            name: 'Usability Testing Protocol',
            description: 'Test protocol for evaluating user interface improvements',
            version: '1.0.0',
            createdAt: Date.now(),
            objectives: [
                {
                    id: 'obj_001',
                    description: 'Measure task completion rates',
                    type: 'quantitative',
                    priority: 'primary'
                }
            ],
            methodology: {
                type: 'controlled_experiment',
                localFirst: true,
                energyTruthCompliant: true,
                performanceBudget: {
                    maxFrameTime: 16.67,
                    maxMemoryUsage: 50
                }
            },
            dataCollection: {
                types: ['interaction_data', 'performance_data'],
                storage: {
                    location: 'local_only',
                    encryption: true,
                    access: ['user', 'researcher']
                },
                anonymization: {
                    level: 'standard',
                    automatic: true
                },
                retention: {
                    period: { value: 30, unit: 'days' },
                    autoDelete: true
                }
            },
            privacyControls: {
                consentRequired: true,
                optOut: {
                    available: true,
                    immediate: true
                },
                dataRights: ['access', 'rectification', 'erasure', 'portability']
            },
            participants: {
                targetCount: { minimum: 100, maximum: 500 },
                recruitment: { voluntary: true },
                eligibility: ['adult', 'platform_user']
            },
            metrics: {
                primary: [
                    {
                        name: 'task_completion_rate',
                        type: 'usability_metric',
                        unit: 'percentage',
                        target: { min: 80, max: 100 }
                    }
                ],
                secondary: [
                    {
                        name: 'frame_time',
                        type: 'performance_metric',
                        unit: 'milliseconds',
                        target: { max: 16.67 }
                    }
                ]
            },
            auditRequirements: {
                logging: {
                    immutable: true,
                    integrity: {
                        checksums: true,
                        digitalSignatures: true
                    }
                },
                access: {
                    restrictions: ['read_only', 'authorized_only']
                }
            },
            complianceChecks: {
                ethical: {
                    informedConsent: true,
                    transparentProcessing: true,
                    voluntaryParticipation: true
                },
                legal: {
                    dataProtection: true,
                    userRights: true
                },
                technical: {
                    performanceBudget: true,
                    localFirst: true,
                    energyTruth: true
                }
            }
        };
    });

    afterEach(() => {
        // Clean up test environment
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('Protocol Validation', () => {
        test('should validate compliant research protocol', async () => {
            const validation = await governanceValidator.validateResearchProtocol(testProtocol);
            
            expect(validation.overallStatus).toBe('fully_compliant');
            expect(validation.violations).toHaveLength(0);
            expect(validation.processingTime).toBeLessThan(100);
        });

        test('should detect local-first compliance violations', async () => {
            const violatingProtocol = {
                ...testProtocol,
                dataCollection: {
                    ...testProtocol.dataCollection,
                    storage: { location: 'cloud_primary' }
                }
            };

            const validation = await governanceValidator.validateResearchProtocol(violatingProtocol);
            
            expect(validation.overallStatus).toBe('non_compliant');
            expect(validation.violations).toContainEqual(
                expect.objectContaining({
                    severity: 'critical',
                    message: expect.stringContaining('local-only')
                })
            );
        });

        test('should detect performance budget violations', async () => {
            const violatingProtocol = {
                ...testProtocol,
                methodology: {
                    ...testProtocol.methodology,
                    performanceBudget: { maxFrameTime: 25.0 }
                }
            };

            const validation = await governanceValidator.validateResearchProtocol(violatingProtocol);
            
            expect(validation.violations).toContainEqual(
                expect.objectContaining({
                    message: expect.stringContaining('16.67ms')
                })
            );
        });

        test('should detect privacy protection violations', async () => {
            const violatingProtocol = {
                ...testProtocol,
                privacyControls: {
                    consentRequired: false,
                    optOut: { available: false }
                }
            };

            const validation = await governanceValidator.validateResearchProtocol(violatingProtocol);
            
            expect(validation.violations.length).toBeGreaterThan(0);
            expect(validation.violations.some(v => 
                v.message.includes('consent')
            )).toBe(true);
        });

        test('should validate energy truth compliance', async () => {
            const violatingProtocol = {
                ...testProtocol,
                methodology: {
                    ...testProtocol.methodology,
                    energyTruthCompliant: false
                }
            };

            const validation = await governanceValidator.validateResearchProtocol(violatingProtocol);
            
            expect(validation.violations).toContainEqual(
                expect.objectContaining({
                    message: expect.stringContaining('energy truth')
                })
            );
        });

        test('should handle validation errors gracefully', async () => {
            const invalidProtocol = null;

            await expect(
                governanceValidator.validateResearchProtocol(invalidProtocol)
            ).rejects.toThrow('Validation failed');
        });

        test('should maintain validation performance budget', async () => {
            const startTime = performance.now();
            
            await governanceValidator.validateResearchProtocol(testProtocol);
            
            const processingTime = performance.now() - startTime;
            expect(processingTime).toBeLessThan(50); // 50ms budget
        });
    });

    describe('Protocol Execution', () => {
        test('should create experiment from protocol', async () => {
            const experimentConfig = {
                name: testProtocol.name,
                description: testProtocol.description,
                type: 'usability_test',
                hypothesis: 'UI improvements will increase task completion rates',
                variants: [
                    { id: 'control', name: 'Current UI', weight: 1 },
                    { id: 'treatment', name: 'Improved UI', weight: 1 }
                ],
                metrics: testProtocol.metrics.primary,
                targetAudience: testProtocol.participants,
                duration: 7,
                sampleSize: testProtocol.participants.targetCount.minimum
            };

            const experiment = await experimentFramework.createExperiment(experimentConfig);
            
            expect(experiment.id).toBeDefined();
            expect(experiment.status).toBe('draft');
            expect(experiment.variants).toHaveLength(2);
            expect(experiment.privacy.consentRequired).toBe(true);
        });

        test('should enforce concurrent experiment limits', async () => {
            // Create maximum allowed experiments
            const promises = [];
            for (let i = 0; i < 3; i++) {
                promises.push(experimentFramework.createExperiment({
                    name: `Test Experiment ${i}`,
                    variants: [
                        { id: 'control', name: 'Control' },
                        { id: 'treatment', name: 'Treatment' }
                    ],
                    metrics: [{ name: 'test_metric', type: 'custom' }]
                }));
            }
            
            await Promise.all(promises);

            // Try to create one more - should fail
            await expect(
                experimentFramework.createExperiment({
                    name: 'Excess Experiment',
                    variants: [{ id: 'control' }, { id: 'treatment' }],
                    metrics: [{ name: 'test_metric' }]
                })
            ).rejects.toThrow('Maximum concurrent experiments limit reached');
        });

        test('should require governance approval before starting', async () => {
            const experiment = await experimentFramework.createExperiment({
                name: 'Test Experiment',
                variants: [{ id: 'control' }, { id: 'treatment' }],
                metrics: [{ name: 'test_metric', type: 'custom' }]
            });

            await expect(
                experimentFramework.startExperiment(experiment.id)
            ).rejects.toThrow('governance approval');
        });

        test('should start experiment with proper approval', async () => {
            const experiment = await experimentFramework.createExperiment({
                name: 'Approved Experiment',
                variants: [{ id: 'control' }, { id: 'treatment' }],
                metrics: [{ name: 'test_metric', type: 'custom' }]
            });

            const approvalDetails = {
                approvedBy: 'test_approver',
                approvalReason: 'meets all requirements'
            };

            const startedExperiment = await experimentFramework.startExperiment(
                experiment.id, 
                approvalDetails
            );
            
            expect(startedExperiment.status).toBe('running');
            expect(startedExperiment.governance.approved).toBe(true);
            expect(startedExperiment.startedAt).toBeDefined();
            expect(startedExperiment.endAt).toBeDefined();
        });
    });

    describe('Privacy Compliance', () => {
        test('should request consent for data collection', async () => {
            const consentRequest = {
                type: 'data_collection',
                purpose: 'usability_research',
                dataTypes: ['interaction_data', 'performance_data'],
                retention: { period: 30, unit: 'days' }
            };

            // Mock user consent dialog
            const originalShowConsentDialog = privacyManager.showConsentDialog;
            privacyManager.showConsentDialog = jest.fn().mockResolvedValue({
                granted: true,
                preferences: {
                    anonymize: true,
                    localOnly: true,
                    autoDelete: true
                },
                timestamp: Date.now()
            });

            const consent = await privacyManager.requestConsent(consentRequest);
            
            expect(consent.status).toBe('granted');
            expect(consent.type).toBe('data_collection');
            expect(consent.purpose).toBe('usability_research');
            
            // Restore original method
            privacyManager.showConsentDialog = originalShowConsentDialog;
        });

        test('should handle consent withdrawal', async () => {
            // First, grant consent
            const consentRequest = {
                type: 'data_collection',
                purpose: 'usability_research',
                dataTypes: ['interaction_data'],
                retention: { period: 30, unit: 'days' }
            };

            privacyManager.showConsentDialog = jest.fn().mockResolvedValue({
                granted: true,
                preferences: {},
                timestamp: Date.now()
            });

            const consent = await privacyManager.requestConsent(consentRequest);
            
            // Then withdraw consent
            const withdrawnConsent = await privacyManager.withdrawConsent(
                consent.id, 
                'user_request'
            );
            
            expect(withdrawnConsent.status).toBe('withdrawn');
            expect(withdrawnConsent.withdrawnAt).toBeDefined();
            expect(withdrawnConsent.withdrawalReason).toBe('user_request');
        });

        test('should anonymize data according to settings', async () => {
            const testData = {
                userId: 'user123',
                email: 'test@example.com',
                timestamp: Date.now(),
                interactionType: 'click',
                performance: { frameTime: 15.2 }
            };

            const anonymized = await privacyManager.anonymizeData(testData, 'standard');
            
            expect(anonymized.userId).toBeUndefined();
            expect(anonymized.email).toBeUndefined();
            expect(anonymized.interactionType).toBe('click');
            expect(anonymized.performance).toBeDefined();
        });

        test('should enforce data minimization', async () => {
            const fullData = {
                userId: 'user123',
                interactionType: 'click',
                timestamp: Date.now(),
                personalInfo: { name: 'John Doe' },
                performance: { frameTime: 15.2 },
                irrelevantData: 'should be removed'
            };

            const minimized = privacyManager.minimizeData(fullData, 'usability_research');
            
            expect(minimized.interactionType).toBeDefined();
            expect(minimized.timestamp).toBeDefined();
            expect(minimized.personalInfo).toBeUndefined();
            expect(minimized.irrelevantData).toBeUndefined();
        });

        test('should handle data subject rights requests', async () => {
            const accessRequest = {
                type: 'access',
                userId: 'test_user_123',
                details: {}
            };

            const response = await privacyManager.handleDataSubjectRequest(accessRequest);
            
            expect(response.requestType).toBe('access');
            expect(response.userId).toBe('test_user_123');
            expect(response.processedAt).toBeDefined();
            expect(response.data).toBeDefined();
        });
    });

    describe('Performance Compliance', () => {
        test('should maintain 60Hz performance during protocol execution', async () => {
            const performanceMonitor = {
                frameTimes: [],
                startMonitoring() {
                    this.startTime = performance.now();
                },
                recordFrame() {
                    const now = performance.now();
                    if (this.lastFrame) {
                        this.frameTimes.push(now - this.lastFrame);
                    }
                    this.lastFrame = now;
                },
                getAverageFrameTime() {
                    return this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
                }
            };

            performanceMonitor.startMonitoring();
            
            // Simulate protocol execution with frame monitoring
            for (let i = 0; i < 100; i++) {
                performanceMonitor.recordFrame();
                
                // Simulate protocol work
                await governanceValidator.validateResearchProtocol(testProtocol);
                
                // Simulate frame rendering
                await new Promise(resolve => requestAnimationFrame(resolve));
            }

            const averageFrameTime = performanceMonitor.getAverageFrameTime();
            expect(averageFrameTime).toBeLessThan(16.67); // 60Hz budget
        });

        test('should handle performance budget violations', async () => {
            // Create a protocol that might exceed performance budget
            const heavyProtocol = {
                ...testProtocol,
                dataCollection: {
                    ...testProtocol.dataCollection,
                    types: Array(20).fill('heavy_data_type') // Excessive data collection
                }
            };

            const startTime = performance.now();
            const validation = await governanceValidator.validateResearchProtocol(heavyProtocol);
            const processingTime = performance.now() - startTime;

            // Should complete within reasonable time even with heavy protocol
            expect(processingTime).toBeLessThan(100);
            expect(validation).toBeDefined();
        });
    });

    describe('Audit and Compliance Tracking', () => {
        test('should maintain immutable audit trail', async () => {
            const initialAuditCount = governanceValidator.auditLogger.auditTrail.length;
            
            await governanceValidator.validateResearchProtocol(testProtocol);
            
            const finalAuditCount = governanceValidator.auditLogger.auditTrail.length;
            expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
            
            // Verify audit entries are immutable
            const auditEntry = governanceValidator.auditLogger.auditTrail[finalAuditCount - 1];
            expect(auditEntry.id).toBeDefined();
            expect(auditEntry.checksum).toBeDefined();
            expect(auditEntry.signature).toBeDefined();
        });

        test('should export audit trail for compliance reporting', async () => {
            await governanceValidator.validateResearchProtocol(testProtocol);
            
            const timeRange = {
                start: Date.now() - 3600000, // 1 hour ago
                end: Date.now()
            };
            
            const auditExport = await governanceValidator.exportAuditTrail(timeRange);
            
            expect(auditExport.exportedAt).toBeDefined();
            expect(auditExport.timeRange).toEqual(timeRange);
            expect(auditExport.auditTrail).toBeInstanceOf(Array);
            expect(auditExport.integrity.verified).toBe(true);
        });

        test('should track protocol compliance over time', async () => {
            // Validate protocol multiple times
            const validations = [];
            for (let i = 0; i < 3; i++) {
                const validation = await governanceValidator.validateResearchProtocol(testProtocol);
                validations.push(validation);
                await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            }

            const history = await governanceValidator.getValidationHistory({
                protocolId: testProtocol.protocolId
            });
            
            expect(history).toHaveLength(3);
            expect(history.every(h => h.overallStatus === 'fully_compliant')).toBe(true);
        });
    });

    describe('Integration Testing', () => {
        test('should integrate governance, privacy, and experiment systems', async () => {
            // 1. Validate protocol
            const validation = await governanceValidator.validateResearchProtocol(testProtocol);
            expect(validation.overallStatus).toBe('fully_compliant');

            // 2. Request privacy consent
            privacyManager.showConsentDialog = jest.fn().mockResolvedValue({
                granted: true,
                preferences: { anonymize: true },
                timestamp: Date.now()
            });

            const consent = await privacyManager.requestConsent({
                type: 'data_collection',
                purpose: testProtocol.name,
                dataTypes: testProtocol.dataCollection.types,
                retention: testProtocol.dataCollection.retention
            });
            expect(consent.status).toBe('granted');

            // 3. Create and start experiment
            const experiment = await experimentFramework.createExperiment({
                name: testProtocol.name,
                variants: [{ id: 'control' }, { id: 'treatment' }],
                metrics: testProtocol.metrics.primary
            });

            const startedExperiment = await experimentFramework.startExperiment(
                experiment.id,
                { approvedBy: 'integration_test' }
            );
            expect(startedExperiment.status).toBe('running');

            // 4. Verify all systems are coordinated
            expect(validation.protocolId).toBe(testProtocol.protocolId);
            expect(consent.purpose).toBe(testProtocol.name);
            expect(startedExperiment.name).toBe(testProtocol.name);
        });

        test('should handle system failures gracefully', async () => {
            // Simulate storage failure
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = jest.fn(() => {
                throw new Error('Storage quota exceeded');
            });

            // Should not crash the validation process
            const validation = await governanceValidator.validateResearchProtocol(testProtocol);
            expect(validation).toBeDefined();

            // Restore original method
            localStorage.setItem = originalSetItem;
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle malformed protocol data', async () => {
            const malformedProtocol = {
                protocolId: null,
                methodology: 'invalid_structure',
                dataCollection: []
            };

            await expect(
                governanceValidator.validateResearchProtocol(malformedProtocol)
            ).rejects.toThrow();
        });

        test('should handle concurrent validation requests', async () => {
            const promises = Array(10).fill(null).map(() =>
                governanceValidator.validateResearchProtocol(testProtocol)
            );

            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(10);
            expect(results.every(r => r.overallStatus === 'fully_compliant')).toBe(true);
        });

        test('should handle memory constraints gracefully', async () => {
            // Create a large protocol to test memory handling
            const largeProtocol = {
                ...testProtocol,
                largeData: Array(1000).fill('x').join('') // Large string
            };

            const validation = await governanceValidator.validateResearchProtocol(largeProtocol);
            expect(validation).toBeDefined();
            expect(validation.processingTime).toBeLessThan(1000); // Should still be fast
        });
    });
});
