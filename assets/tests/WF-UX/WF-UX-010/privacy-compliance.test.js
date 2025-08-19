/**
 * WF-UX-010 Privacy Compliance Test Suite
 * Tests for privacy protection, consent management, and data rights compliance
 */

import { PrivacyManager, AnonymizationEngine } from '../../../code/WF-UX-010/privacy-manager.js';
import { GovernanceValidator } from '../../../code/WF-UX-010/governance-validator.js';

describe('Privacy Compliance Test Suite', () => {
    let privacyManager;
    let anonymizationEngine;
    let governanceValidator;

    beforeEach(() => {
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // Initialize components
        privacyManager = new PrivacyManager({
            strictMode: true,
            consentRequired: true,
            immediateOptOut: true,
            dataMinimization: true
        });

        anonymizationEngine = new AnonymizationEngine();

        governanceValidator = new GovernanceValidator({
            strictMode: true,
            auditLogging: true
        });

        // Mock DOM methods
        global.document.body = {
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            contains: jest.fn().mockReturnValue(true)
        };

        global.document.createElement = jest.fn().mockReturnValue({
            className: '',
            innerHTML: '',
            querySelector: jest.fn().mockReturnValue({
                addEventListener: jest.fn(),
                checked: true,
                name: 'testCheckbox'
            }),
            querySelectorAll: jest.fn().mockReturnValue([
                { name: 'anonymize', checked: true },
                { name: 'localOnly', checked: true },
                { name: 'autoDelete', checked: true }
            ]),
            appendChild: jest.fn()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Privacy Settings Management', () => {
        test('should initialize with privacy-first defaults', () => {
            const settings = privacyManager.getPrivacySettings();
            
            expect(settings.dataCollection).toBe('opt_in_only');
            expect(settings.anonymization).toBe('automatic');
            expect(settings.retention).toBe('minimal');
            expect(settings.sharing).toBe('never');
            expect(settings.tracking).toBe('disabled');
        });

        test('should save and load privacy settings', async () => {
            const newSettings = {
                dataCollection: 'disabled',
                anonymization: 'high',
                retention: 'extended'
            };

            privacyManager.updatePrivacySettings(newSettings);
            
            // Create new instance to test persistence
            const newPrivacyManager = new PrivacyManager();
            await newPrivacyManager.loadPrivacySettings();
            
            const loadedSettings = newPrivacyManager.getPrivacySettings();
            expect(loadedSettings.dataCollection).toBe('disabled');
            expect(loadedSettings.anonymization).toBe('high');
            expect(loadedSettings.retention).toBe('extended');
        });

        test('should handle corrupted settings gracefully', async () => {
            // Corrupt localStorage
            localStorage.setItem('wirthforge_privacy_settings', 'invalid json');
            
            const newPrivacyManager = new PrivacyManager();
            await newPrivacyManager.loadPrivacySettings();
            
            // Should fall back to defaults
            const settings = newPrivacyManager.getPrivacySettings();
            expect(settings.dataCollection).toBe('opt_in_only');
        });
    });

    describe('Consent Management', () => {
        test('should request consent with proper UI', async () => {
            const consentRequest = {
                type: 'data_collection',
                purpose: 'usability_research',
                dataTypes: ['interaction_data', 'performance_data'],
                retention: { period: 30, unit: 'days' }
            };

            // Mock user granting consent
            const mockDialog = {
                querySelector: jest.fn().mockImplementation((selector) => {
                    if (selector === '.consent-accept') {
                        return { addEventListener: jest.fn((event, callback) => {
                            if (event === 'click') setTimeout(() => callback(), 10);
                        })};
                    }
                    if (selector === '.consent-deny') {
                        return { addEventListener: jest.fn() };
                    }
                    if (selector === '.privacy-controls input[type="checkbox"]') {
                        return [];
                    }
                })
            };

            privacyManager.createConsentDialog = jest.fn().mockReturnValue(mockDialog);

            const consent = await privacyManager.requestConsent(consentRequest);
            
            expect(consent.status).toBe('granted');
            expect(consent.type).toBe('data_collection');
            expect(consent.purpose).toBe('usability_research');
            expect(consent.dataTypes).toEqual(['interaction_data', 'performance_data']);
        });

        test('should handle consent denial', async () => {
            const consentRequest = {
                type: 'data_collection',
                purpose: 'analytics',
                dataTypes: ['usage_data'],
                retention: { period: 7, unit: 'days' }
            };

            // Mock user denying consent
            const mockDialog = {
                querySelector: jest.fn().mockImplementation((selector) => {
                    if (selector === '.consent-deny') {
                        return { addEventListener: jest.fn((event, callback) => {
                            if (event === 'click') setTimeout(() => callback(), 10);
                        })};
                    }
                    if (selector === '.consent-accept') {
                        return { addEventListener: jest.fn() };
                    }
                })
            };

            privacyManager.createConsentDialog = jest.fn().mockReturnValue(mockDialog);

            const consent = await privacyManager.requestConsent(consentRequest);
            
            expect(consent.status).toBe('denied');
        });

        test('should auto-deny consent after timeout', async () => {
            const consentRequest = {
                type: 'data_collection',
                purpose: 'testing',
                dataTypes: ['test_data'],
                retention: { period: 1, unit: 'days' }
            };

            // Mock no user interaction (timeout scenario)
            const mockDialog = {
                querySelector: jest.fn().mockReturnValue({
                    addEventListener: jest.fn()
                })
            };

            privacyManager.createConsentDialog = jest.fn().mockReturnValue(mockDialog);

            const startTime = Date.now();
            const consent = await privacyManager.requestConsent(consentRequest);
            const endTime = Date.now();
            
            expect(consent.status).toBe('denied');
            expect(endTime - startTime).toBeGreaterThanOrEqual(30000); // 30 second timeout
        });

        test('should withdraw consent immediately', async () => {
            // First grant consent
            const consentRequest = {
                type: 'data_collection',
                purpose: 'test_withdrawal',
                dataTypes: ['test_data'],
                retention: { period: 1, unit: 'days' }
            };

            privacyManager.showConsentDialog = jest.fn().mockResolvedValue({
                granted: true,
                preferences: {},
                timestamp: Date.now()
            });

            const consent = await privacyManager.requestConsent(consentRequest);
            expect(consent.status).toBe('granted');

            // Then withdraw consent
            privacyManager.stopDataCollection = jest.fn().mockResolvedValue(true);
            privacyManager.handleDataAfterWithdrawal = jest.fn().mockResolvedValue(true);

            const withdrawnConsent = await privacyManager.withdrawConsent(consent.id, 'user_request');
            
            expect(withdrawnConsent.status).toBe('withdrawn');
            expect(withdrawnConsent.withdrawnAt).toBeDefined();
            expect(withdrawnConsent.withdrawalReason).toBe('user_request');
        });

        test('should validate consent requests', async () => {
            const invalidRequest = {
                // Missing required fields
                type: 'data_collection'
                // No purpose or dataTypes
            };

            await expect(
                privacyManager.requestConsent(invalidRequest)
            ).rejects.toThrow('Invalid consent request');
        });

        test('should check existing consent before requesting new', async () => {
            const consentRequest = {
                type: 'data_collection',
                purpose: 'duplicate_test',
                dataTypes: ['test_data'],
                retention: { period: 1, unit: 'days' }
            };

            // Grant initial consent
            privacyManager.showConsentDialog = jest.fn().mockResolvedValue({
                granted: true,
                preferences: {},
                timestamp: Date.now()
            });

            const firstConsent = await privacyManager.requestConsent(consentRequest);
            expect(firstConsent.status).toBe('granted');

            // Request same consent again - should return existing
            const secondConsent = await privacyManager.requestConsent(consentRequest);
            expect(secondConsent.id).toBe(firstConsent.id);
        });
    });

    describe('Data Anonymization', () => {
        test('should remove direct identifiers', async () => {
            const testData = {
                userId: 'user123',
                email: 'test@example.com',
                name: 'John Doe',
                phone: '+1234567890',
                interactionType: 'click',
                timestamp: Date.now()
            };

            const anonymized = await privacyManager.anonymizeData(testData, 'standard');
            
            expect(anonymized.userId).toBeUndefined();
            expect(anonymized.email).toBeUndefined();
            expect(anonymized.name).toBeUndefined();
            expect(anonymized.phone).toBeUndefined();
            expect(anonymized.interactionType).toBe('click');
            expect(anonymized.timestamp).toBeDefined();
        });

        test('should generalize quasi-identifiers', async () => {
            const testData = {
                timestamp: 1692403200123, // Specific timestamp
                location: 'New York, NY',
                deviceId: 'device123',
                sessionId: 'session456',
                score: 87.3
            };

            const anonymized = await anonymizationEngine.anonymize(testData, {
                level: 'high',
                removeQuasiIdentifiers: true,
                generalization: true
            });
            
            // Timestamp should be generalized to hour precision
            const originalDate = new Date(testData.timestamp);
            const anonymizedDate = new Date(anonymized.timestamp);
            expect(anonymizedDate.getMinutes()).toBe(0);
            expect(anonymizedDate.getSeconds()).toBe(0);
            
            // Score should be generalized to ranges
            expect(anonymized.score).toBe(80); // Rounded to nearest 10
        });

        test('should add noise for high anonymization level', async () => {
            const testData = {
                performanceScore: 100,
                usabilityRating: 4.5,
                completionTime: 1500
            };

            const anonymized = await anonymizationEngine.anonymize(testData, {
                level: 'high',
                addNoise: true
            });
            
            // Values should be slightly different due to noise
            expect(anonymized.performanceScore).not.toBe(100);
            expect(anonymized.usabilityRating).not.toBe(4.5);
            expect(anonymized.completionTime).not.toBe(1500);
            
            // But should be within reasonable range (10% noise)
            expect(Math.abs(anonymized.performanceScore - 100)).toBeLessThan(20);
            expect(Math.abs(anonymized.usabilityRating - 4.5)).toBeLessThan(1);
        });

        test('should handle anonymization errors gracefully', async () => {
            const invalidData = null;

            await expect(
                privacyManager.anonymizeData(invalidData, 'standard')
            ).rejects.toThrow('Anonymization failed');
        });

        test('should maintain anonymization performance budget', async () => {
            const largeData = {
                userId: 'user123',
                interactions: Array(1000).fill({ type: 'click', x: 100, y: 200 }),
                metadata: Array(500).fill({ key: 'value' })
            };

            const startTime = performance.now();
            await privacyManager.anonymizeData(largeData, 'standard');
            const processingTime = performance.now() - startTime;
            
            expect(processingTime).toBeLessThan(50); // Should complete within 50ms
        });
    });

    describe('Data Subject Rights', () => {
        test('should handle data access requests', async () => {
            const userId = 'test_user_123';
            
            // Mock user data collection methods
            privacyManager.collectUserData = jest.fn().mockResolvedValue({
                interactions: [{ type: 'click', timestamp: Date.now() }],
                feedback: [{ rating: 4, timestamp: Date.now() }]
            });
            
            privacyManager.getUserConsents = jest.fn().mockReturnValue([
                { id: 'consent1', status: 'granted', purpose: 'research' }
            ]);
            
            privacyManager.getUserPrivacySettings = jest.fn().mockReturnValue({
                dataCollection: 'opt_in_only',
                anonymization: 'automatic'
            });
            
            privacyManager.getDataProcessingActivities = jest.fn().mockReturnValue([
                { activity: 'feedback_collection', status: 'active' }
            ]);

            const response = await privacyManager.handleDataSubjectRequest({
                type: 'access',
                userId: userId,
                details: {}
            });
            
            expect(response.requestType).toBe('access');
            expect(response.userId).toBe(userId);
            expect(response.data.personalData).toBeDefined();
            expect(response.data.consents).toBeDefined();
            expect(response.data.privacySettings).toBeDefined();
        });

        test('should handle data erasure requests', async () => {
            const userId = 'test_user_456';
            
            // Mock data deletion methods
            privacyManager.deleteUserData = jest.fn().mockResolvedValue(true);
            privacyManager.getUserConsents = jest.fn().mockReturnValue([
                { id: 'consent1', status: 'granted' }
            ]);
            privacyManager.withdrawConsent = jest.fn().mockResolvedValue({
                status: 'withdrawn'
            });

            const response = await privacyManager.handleDataSubjectRequest({
                type: 'erasure',
                userId: userId,
                details: {}
            });
            
            expect(response.requestType).toBe('erasure');
            expect(response.status).toBe('completed');
            expect(privacyManager.deleteUserData).toHaveBeenCalledWith(userId);
        });

        test('should handle data portability requests', async () => {
            const userId = 'test_user_789';
            
            privacyManager.handleAccessRequest = jest.fn().mockResolvedValue({
                requestType: 'access',
                userId: userId,
                data: { interactions: [], feedback: [] }
            });

            const response = await privacyManager.handleDataSubjectRequest({
                type: 'portability',
                userId: userId,
                details: { format: 'json' }
            });
            
            expect(response).toBeDefined();
            expect(privacyManager.handleAccessRequest).toHaveBeenCalledWith(userId);
        });

        test('should validate data subject requests', async () => {
            const invalidRequest = {
                type: 'unknown_request',
                userId: 'test_user',
                details: {}
            };

            await expect(
                privacyManager.handleDataSubjectRequest(invalidRequest)
            ).rejects.toThrow('Unknown request type');
        });
    });

    describe('Data Minimization', () => {
        test('should minimize data for usability research', () => {
            const fullData = {
                userId: 'user123',
                interactionType: 'click',
                timestamp: Date.now(),
                personalInfo: { name: 'John', age: 30 },
                deviceInfo: { browser: 'Chrome', os: 'Windows' },
                location: { lat: 40.7128, lng: -74.0060 },
                irrelevantField: 'should be removed'
            };

            const minimized = privacyManager.minimizeData(fullData, 'usability_research');
            
            expect(minimized.interactionType).toBeDefined();
            expect(minimized.timestamp).toBeDefined();
            expect(minimized.personalInfo).toBeUndefined();
            expect(minimized.location).toBeUndefined();
            expect(minimized.irrelevantField).toBeUndefined();
        });

        test('should minimize data for performance monitoring', () => {
            const fullData = {
                userId: 'user123',
                frameTime: 15.2,
                memoryUsage: 45.6,
                cpuUsage: 23.1,
                personalData: 'sensitive',
                networkInfo: { ip: '192.168.1.1' }
            };

            const minimized = privacyManager.minimizeData(fullData, 'performance_monitoring');
            
            expect(minimized.frameTime).toBeDefined();
            expect(minimized.memoryUsage).toBeDefined();
            expect(minimized.cpuUsage).toBeDefined();
            expect(minimized.personalData).toBeUndefined();
            expect(minimized.networkInfo).toBeUndefined();
        });

        test('should handle unknown research purposes', () => {
            const testData = { field1: 'value1', field2: 'value2' };
            
            const minimized = privacyManager.minimizeData(testData, 'unknown_purpose');
            
            // Should return empty object for unknown purposes (safe default)
            expect(Object.keys(minimized)).toHaveLength(0);
        });
    });

    describe('Privacy Monitoring and Auditing', () => {
        test('should log privacy events to audit trail', async () => {
            const initialAuditCount = privacyManager.auditTrail.length;
            
            await privacyManager.requestConsent({
                type: 'data_collection',
                purpose: 'audit_test',
                dataTypes: ['test_data'],
                retention: { period: 1, unit: 'days' }
            });
            
            expect(privacyManager.auditTrail.length).toBeGreaterThan(initialAuditCount);
            
            const lastAuditEntry = privacyManager.auditTrail[privacyManager.auditTrail.length - 1];
            expect(lastAuditEntry.action).toBeDefined();
            expect(lastAuditEntry.timestamp).toBeDefined();
            expect(lastAuditEntry.id).toBeDefined();
        });

        test('should perform periodic privacy audits', async () => {
            const auditSpy = jest.spyOn(privacyManager, 'performPrivacyAudit');
            
            // Mock the audit methods
            privacyManager.checkExpiredConsents = jest.fn().mockResolvedValue([]);
            privacyManager.checkDataRetention = jest.fn().mockResolvedValue([]);
            privacyManager.monitorDataProcessing = jest.fn().mockResolvedValue([]);
            
            await privacyManager.performPrivacyAudit();
            
            expect(auditSpy).toHaveBeenCalled();
            expect(privacyManager.checkExpiredConsents).toHaveBeenCalled();
            expect(privacyManager.checkDataRetention).toHaveBeenCalled();
            expect(privacyManager.monitorDataProcessing).toHaveBeenCalled();
        });

        test('should check for expired consents', async () => {
            // Create expired consent
            const expiredConsent = {
                id: 'expired_consent',
                status: 'granted',
                grantedAt: Date.now() - 86400000, // 24 hours ago
                expiresAt: Date.now() - 3600000,  // 1 hour ago
                purpose: 'test'
            };

            privacyManager.consentStore.set(expiredConsent.id, expiredConsent);
            
            privacyManager.checkExpiredConsents = jest.fn().mockImplementation(async () => {
                for (const [id, consent] of privacyManager.consentStore) {
                    if (consent.expiresAt && Date.now() > consent.expiresAt) {
                        consent.status = 'expired';
                        await privacyManager.withdrawConsent(id, 'expired');
                    }
                }
            });

            await privacyManager.checkExpiredConsents();
            
            const updatedConsent = privacyManager.consentStore.get(expiredConsent.id);
            expect(updatedConsent.status).toBe('expired');
        });

        test('should export privacy audit trail', async () => {
            // Add some audit entries
            privacyManager.logPrivacyEvent({
                action: 'consent_granted',
                timestamp: Date.now() - 1000
            });
            
            privacyManager.logPrivacyEvent({
                action: 'data_anonymized',
                timestamp: Date.now()
            });

            const timeRange = {
                start: Date.now() - 3600000,
                end: Date.now()
            };

            const auditExport = privacyManager.getAuditTrail(timeRange);
            
            expect(auditExport).toBeInstanceOf(Array);
            expect(auditExport.length).toBeGreaterThan(0);
            expect(auditExport.every(entry => 
                entry.timestamp >= timeRange.start && 
                entry.timestamp <= timeRange.end
            )).toBe(true);
        });
    });

    describe('Governance Integration', () => {
        test('should validate privacy compliance in protocols', async () => {
            const testProtocol = {
                protocolId: 'privacy_test_001',
                privacyControls: {
                    consentRequired: true,
                    optOut: {
                        available: true,
                        immediate: true
                    },
                    dataRights: ['access', 'rectification', 'erasure']
                },
                dataCollection: {
                    types: ['interaction_data'],
                    anonymization: {
                        level: 'standard',
                        automatic: true
                    },
                    retention: {
                        period: { value: 30, unit: 'days' },
                        autoDelete: true
                    },
                    storage: {
                        encryption: true,
                        access: ['user', 'researcher']
                    }
                }
            };

            const validation = await governanceValidator.validatePrivacyProtection(testProtocol);
            
            expect(validation.status).toBe('compliant');
            expect(validation.message).toContain('Privacy protection compliance verified');
        });

        test('should detect privacy violations in protocols', async () => {
            const violatingProtocol = {
                protocolId: 'privacy_violation_001',
                privacyControls: {
                    consentRequired: false, // Violation
                    optOut: {
                        available: false,     // Violation
                        immediate: false      // Violation
                    }
                },
                dataCollection: {
                    types: ['personal_data', 'sensitive_data', 'behavioral_data'],
                    anonymization: {
                        level: 'none'         // Warning
                    },
                    retention: {
                        period: { value: 5, unit: 'years' } // Warning
                    }
                }
            };

            const validation = await governanceValidator.validatePrivacyProtection(violatingProtocol);
            
            expect(validation.status).toBe('violation');
            expect(validation.details.violations.length).toBeGreaterThan(0);
            expect(validation.details.violations.some(v => 
                v.includes('consent')
            )).toBe(true);
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle high-volume consent requests', async () => {
            const consentPromises = [];
            
            // Mock consent dialog to auto-approve
            privacyManager.showConsentDialog = jest.fn().mockResolvedValue({
                granted: true,
                preferences: {},
                timestamp: Date.now()
            });

            // Generate many concurrent consent requests
            for (let i = 0; i < 100; i++) {
                consentPromises.push(
                    privacyManager.requestConsent({
                        type: 'data_collection',
                        purpose: `test_purpose_${i}`,
                        dataTypes: ['test_data'],
                        retention: { period: 1, unit: 'days' }
                    })
                );
            }

            const startTime = performance.now();
            const results = await Promise.all(consentPromises);
            const processingTime = performance.now() - startTime;
            
            expect(results).toHaveLength(100);
            expect(results.every(r => r.status === 'granted')).toBe(true);
            expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should maintain performance during anonymization', async () => {
            const largeDataset = Array(1000).fill(null).map((_, i) => ({
                userId: `user_${i}`,
                email: `user${i}@example.com`,
                interactions: Array(10).fill({ type: 'click', x: i, y: i }),
                timestamp: Date.now() - i * 1000
            }));

            const startTime = performance.now();
            
            const anonymizedResults = await Promise.all(
                largeDataset.map(data => 
                    privacyManager.anonymizeData(data, 'standard')
                )
            );
            
            const processingTime = performance.now() - startTime;
            
            expect(anonymizedResults).toHaveLength(1000);
            expect(anonymizedResults.every(r => !r.userId && !r.email)).toBe(true);
            expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        test('should handle memory constraints during data processing', async () => {
            // Simulate memory pressure
            const memoryIntensiveData = {
                largeArray: Array(10000).fill('x').join(''),
                nestedData: Array(100).fill(null).map(() => ({
                    field: Array(100).fill('data').join('')
                }))
            };

            // Should not crash or exceed memory limits
            const result = await privacyManager.anonymizeData(memoryIntensiveData, 'standard');
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });

    describe('Error Recovery and Resilience', () => {
        test('should recover from storage failures', async () => {
            // Mock storage failure
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = jest.fn(() => {
                throw new Error('Storage quota exceeded');
            });

            // Should handle gracefully without crashing
            await expect(
                privacyManager.savePrivacySettings()
            ).resolves.not.toThrow();

            // Restore original method
            localStorage.setItem = originalSetItem;
        });

        test('should handle consent dialog creation failures', async () => {
            // Mock DOM manipulation failure
            global.document.createElement = jest.fn(() => {
                throw new Error('DOM manipulation failed');
            });

            const consentRequest = {
                type: 'data_collection',
                purpose: 'error_test',
                dataTypes: ['test_data'],
                retention: { period: 1, unit: 'days' }
            };

            // Should handle error gracefully
            await expect(
                privacyManager.requestConsent(consentRequest)
            ).rejects.toThrow();
        });

        test('should maintain audit trail integrity during failures', async () => {
            const initialAuditCount = privacyManager.auditTrail.length;
            
            // Mock a method that might fail
            const originalAnonymize = privacyManager.anonymizeData;
            privacyManager.anonymizeData = jest.fn().mockRejectedValue(
                new Error('Anonymization service unavailable')
            );

            try {
                await privacyManager.anonymizeData({ test: 'data' }, 'standard');
            } catch (error) {
                // Expected to fail
            }

            // Audit trail should still be maintained
            expect(privacyManager.auditTrail.length).toBeGreaterThan(initialAuditCount);
            
            // Restore original method
            privacyManager.anonymizeData = originalAnonymize;
        });
    });
});


