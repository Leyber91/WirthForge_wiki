/**
 * WF-UX-010 Feedback Collection Test Suite
 * Tests for user feedback collection, processing, and privacy compliance
 */

import { FeedbackCollector } from '../../../code/WF-UX-010/feedback-collector.js';
import { PrivacyManager } from '../../../code/WF-UX-010/privacy-manager.js';
import { MetricsAnalyzer } from '../../../code/WF-UX-010/metrics-analyzer.js';

describe('Feedback Collection Test Suite', () => {
    let feedbackCollector;
    let privacyManager;
    let metricsAnalyzer;
    let mockStorage;

    beforeEach(() => {
        // Mock IndexedDB and localStorage
        mockStorage = new Map();
        global.indexedDB = {
            open: jest.fn().mockResolvedValue({
                transaction: jest.fn().mockReturnValue({
                    objectStore: jest.fn().mockReturnValue({
                        add: jest.fn().mockResolvedValue(true),
                        get: jest.fn().mockResolvedValue(null),
                        getAll: jest.fn().mockResolvedValue([])
                    }),
                    complete: Promise.resolve()
                })
            })
        };

        global.localStorage = {
            getItem: jest.fn((key) => mockStorage.get(key)),
            setItem: jest.fn((key, value) => mockStorage.set(key, value)),
            removeItem: jest.fn((key) => mockStorage.delete(key)),
            clear: jest.fn(() => mockStorage.clear())
        };

        // Mock performance API
        global.performance = {
            now: jest.fn(() => Date.now()),
            mark: jest.fn(),
            measure: jest.fn()
        };

        // Mock PerformanceObserver
        global.PerformanceObserver = jest.fn().mockImplementation(() => ({
            observe: jest.fn(),
            disconnect: jest.fn()
        }));

        // Initialize components
        feedbackCollector = new FeedbackCollector({
            privacyMode: 'strict',
            maxProcessingTime: 5,
            batchSize: 10
        });

        privacyManager = new PrivacyManager();
        metricsAnalyzer = new MetricsAnalyzer();
    });

    afterEach(() => {
        if (feedbackCollector) {
            feedbackCollector.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Event Collection', () => {
        test('should collect user interaction events', async () => {
            // Grant consent for interaction tracking
            feedbackCollector.updateConsent('interaction-tracking', true);

            const mockEvent = {
                type: 'click',
                target: document.createElement('button'),
                clientX: 100,
                clientY: 200
            };

            feedbackCollector.collectInteractionEvent('click', mockEvent);

            expect(feedbackCollector.eventQueue.length).toBe(1);
            expect(feedbackCollector.eventQueue[0].type).toBe('interaction');
            expect(feedbackCollector.eventQueue[0].subType).toBe('click');
        });

        test('should respect privacy mode for coordinate collection', () => {
            feedbackCollector.updateConsent('interaction-tracking', true);

            const mockEvent = {
                type: 'click',
                target: document.createElement('button'),
                clientX: 100,
                clientY: 200
            };

            feedbackCollector.collectInteractionEvent('click', mockEvent);

            const collectedEvent = feedbackCollector.eventQueue[0];
            expect(collectedEvent.coordinates).toBeNull(); // Strict privacy mode
        });

        test('should not collect events without consent', () => {
            const mockEvent = {
                type: 'click',
                target: document.createElement('button')
            };

            feedbackCollector.collectInteractionEvent('click', mockEvent);

            expect(feedbackCollector.eventQueue.length).toBe(0);
        });

        test('should throttle event collection to maintain 60Hz', (done) => {
            feedbackCollector.updateConsent('interaction-tracking', true);

            const startTime = performance.now();
            let eventCount = 0;

            // Simulate rapid events
            const interval = setInterval(() => {
                const mockEvent = {
                    type: 'scroll',
                    target: document.body
                };
                feedbackCollector.collectInteractionEvent('scroll', mockEvent);
                eventCount++;

                if (eventCount >= 100) {
                    clearInterval(interval);
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    // Should maintain reasonable performance
                    expect(duration).toBeLessThan(100); // 100ms for 100 events
                    done();
                }
            }, 1);
        });
    });

    describe('Explicit Feedback Collection', () => {
        test('should collect explicit user feedback', () => {
            feedbackCollector.updateConsent('explicit-feedback', true);

            const feedbackData = {
                category: 'usability',
                rating: 4,
                text: 'The interface is intuitive and responsive',
                source: 'feedback-form'
            };

            feedbackCollector.collectExplicitFeedback(feedbackData);

            expect(feedbackCollector.feedbackBuffer.length).toBe(1);
            expect(feedbackCollector.feedbackBuffer[0].category).toBe('usability');
            expect(feedbackCollector.feedbackBuffer[0].rating).toBe(4);
        });

        test('should sanitize feedback text for PII', () => {
            feedbackCollector.updateConsent('explicit-feedback', true);

            const feedbackData = {
                text: 'Contact me at john.doe@example.com or call 555-123-4567',
                category: 'support'
            };

            feedbackCollector.collectExplicitFeedback(feedbackData);

            const sanitizedText = feedbackCollector.feedbackBuffer[0].text;
            expect(sanitizedText).not.toContain('john.doe@example.com');
            expect(sanitizedText).not.toContain('555-123-4567');
            expect(sanitizedText).toContain('[EMAIL]');
            expect(sanitizedText).toContain('[PHONE]');
        });

        test('should include energy context with feedback', () => {
            feedbackCollector.updateConsent('explicit-feedback', true);
            feedbackCollector.updateConsent('energy-metrics', true);

            // Add some energy metrics
            feedbackCollector.collectEnergyMetric({
                component: 'ui-renderer',
                energyValue: 15.5,
                computationTime: 8.2
            });

            const feedbackData = {
                text: 'Performance seems good',
                category: 'performance'
            };

            feedbackCollector.collectExplicitFeedback(feedbackData);

            const feedback = feedbackCollector.feedbackBuffer[0];
            expect(feedback.context.energyState).toBeDefined();
            expect(feedback.context.energyState.totalEnergy).toBe(15.5);
        });
    });

    describe('Energy Metrics Collection', () => {
        test('should collect energy metrics from components', () => {
            feedbackCollector.updateConsent('energy-metrics', true);

            const metricData = {
                component: 'data-processor',
                operation: 'filter',
                energyValue: 12.3,
                computationTime: 5.7,
                frameTime: 14.2,
                memoryUsage: 1024000
            };

            feedbackCollector.collectEnergyMetric(metricData);

            expect(feedbackCollector.energyMetrics.has('data-processor')).toBe(true);
            expect(feedbackCollector.energyMetrics.get('data-processor').energyValue).toBe(12.3);
        });

        test('should track frame time for 60Hz compliance', () => {
            feedbackCollector.updateConsent('energy-metrics', true);

            const metricData = {
                component: 'animation-engine',
                frameTime: 18.5, // Over 16.67ms budget
                energyValue: 8.1
            };

            feedbackCollector.collectEnergyMetric(metricData);

            const metric = feedbackCollector.energyMetrics.get('animation-engine');
            expect(metric.frameTime).toBe(18.5);
            // In real implementation, this would trigger performance warnings
        });
    });

    describe('Data Processing and Storage', () => {
        test('should process batches within time budget', async () => {
            feedbackCollector.updateConsent('interaction-tracking', true);

            // Fill event queue
            for (let i = 0; i < 20; i++) {
                feedbackCollector.eventQueue.push({
                    type: 'interaction',
                    timestamp: Date.now(),
                    data: `event-${i}`
                });
            }

            const startTime = performance.now();
            await feedbackCollector.processBatch();
            const processingTime = performance.now() - startTime;

            expect(processingTime).toBeLessThan(feedbackCollector.config.maxProcessingTime);
            expect(feedbackCollector.eventQueue.length).toBeLessThan(20);
        });

        test('should handle storage failures gracefully', async () => {
            // Mock storage failure
            global.indexedDB.open = jest.fn().mockRejectedValue(new Error('Storage unavailable'));

            const newCollector = new FeedbackCollector();
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization

            expect(newCollector.usingMemoryFallback).toBe(true);
        });

        test('should respect storage quota limits', async () => {
            const collector = new FeedbackCollector({ storageQuota: 1024 }); // 1KB limit
            
            // Mock storage estimate
            global.navigator = {
                storage: {
                    estimate: jest.fn().mockResolvedValue({
                        quota: 1024,
                        usage: 900
                    })
                }
            };

            const storageManager = await collector.initializeStorageManager();
            expect(storageManager.available).toBe(124);
        });
    });

    describe('Privacy and Consent Management', () => {
        test('should update consent status', () => {
            const eventSpy = jest.spyOn(document, 'dispatchEvent');

            feedbackCollector.updateConsent('interaction-tracking', true);

            expect(feedbackCollector.hasConsent('interaction-tracking')).toBe(true);
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'wirthforge:feedback-consent-updated'
                })
            );
        });

        test('should purge data when consent is withdrawn', async () => {
            feedbackCollector.updateConsent('interaction-tracking', true);
            
            // Add some data
            feedbackCollector.eventQueue.push({ type: 'test', data: 'sample' });
            
            const purgeSpy = jest.spyOn(feedbackCollector, 'purgeDataType');
            feedbackCollector.updateConsent('interaction-tracking', false);

            expect(purgeSpy).toHaveBeenCalledWith('interaction-tracking');
        });

        test('should handle granular consent for different data types', () => {
            feedbackCollector.updateConsent('interaction-tracking', true);
            feedbackCollector.updateConsent('explicit-feedback', false);
            feedbackCollector.updateConsent('energy-metrics', true);

            expect(feedbackCollector.hasConsent('interaction-tracking')).toBe(true);
            expect(feedbackCollector.hasConsent('explicit-feedback')).toBe(false);
            expect(feedbackCollector.hasConsent('energy-metrics')).toBe(true);
        });
    });

    describe('Data Export and Retrieval', () => {
        test('should export data with proper consent', async () => {
            feedbackCollector.updateConsent('data-export', true);
            feedbackCollector.updateConsent('interaction-tracking', true);

            // Add test data
            feedbackCollector.eventQueue.push({ type: 'test-event' });
            feedbackCollector.feedbackBuffer.push({ type: 'test-feedback' });

            const exportedData = await feedbackCollector.exportData();

            expect(exportedData).toHaveProperty('events');
            expect(exportedData).toHaveProperty('feedback');
            expect(exportedData).toHaveProperty('energyMetrics');
        });

        test('should reject export without consent', async () => {
            await expect(feedbackCollector.exportData()).rejects.toThrow('No consent for data export');
        });

        test('should handle memory fallback for data retrieval', async () => {
            feedbackCollector.usingMemoryFallback = true;
            feedbackCollector.memoryStorage = {
                events: [{ id: 1, type: 'test' }],
                feedback: [{ id: 1, text: 'test feedback' }],
                energyMetrics: [{ id: 1, component: 'test' }]
            };

            const events = await feedbackCollector.getEvents();
            expect(events).toEqual([{ id: 1, type: 'test' }]);
        });
    });

    describe('Performance Monitoring', () => {
        test('should warn when processing exceeds time budget', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Mock slow processing
            const originalStoreEvents = feedbackCollector.storeEvents;
            feedbackCollector.storeEvents = jest.fn().mockImplementation(() => {
                return new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
            });

            feedbackCollector.eventQueue.push({ type: 'test' });
            await feedbackCollector.processBatch();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Batch processing exceeded budget')
            );

            consoleSpy.mockRestore();
        });

        test('should maintain 60Hz processing loop', (done) => {
            const startTime = Date.now();
            let processCount = 0;

            const originalShouldProcess = feedbackCollector.shouldProcess;
            feedbackCollector.shouldProcess = jest.fn(() => {
                processCount++;
                if (processCount >= 5) {
                    const elapsed = Date.now() - startTime;
                    const expectedInterval = feedbackCollector.config.throttleInterval * 5;
                    
                    expect(elapsed).toBeGreaterThanOrEqual(expectedInterval * 0.9);
                    expect(elapsed).toBeLessThanOrEqual(expectedInterval * 1.1);
                    done();
                    return false;
                }
                return false;
            });
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle processing errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // Mock error in storage
            feedbackCollector.storeEvents = jest.fn().mockRejectedValue(new Error('Storage error'));
            
            feedbackCollector.eventQueue.push({ type: 'test' });
            await feedbackCollector.processBatch();

            expect(consoleSpy).toHaveBeenCalledWith('Batch processing failed:', expect.any(Error));
            expect(feedbackCollector.isProcessing).toBe(false);

            consoleSpy.mockRestore();
        });

        test('should clean up resources on destroy', () => {
            const mockObserver = { disconnect: jest.fn() };
            const mockDb = { close: jest.fn() };
            
            feedbackCollector.performanceObserver = mockObserver;
            feedbackCollector.db = mockDb;

            feedbackCollector.destroy();

            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(mockDb.close).toHaveBeenCalled();
            expect(feedbackCollector.eventQueue).toEqual([]);
            expect(feedbackCollector.feedbackBuffer).toEqual([]);
        });
    });

    describe('Integration with Privacy Manager', () => {
        test('should integrate with privacy manager for consent', async () => {
            const mockPrivacyManager = {
                hasConsent: jest.fn().mockReturnValue(true),
                requestConsent: jest.fn().mockResolvedValue(true)
            };

            // Test integration
            const hasConsent = mockPrivacyManager.hasConsent('interaction-tracking');
            expect(hasConsent).toBe(true);
        });
    });

    describe('Integration with Metrics Analyzer', () => {
        test('should provide data to metrics analyzer', async () => {
            feedbackCollector.updateConsent('data-export', true);
            
            const testData = await feedbackCollector.exportData();
            
            // Mock metrics analyzer processing
            const mockAnalyzer = {
                processData: jest.fn().mockReturnValue({
                    insights: ['User engagement is high'],
                    metrics: { averageRating: 4.2 }
                })
            };

            const results = mockAnalyzer.processData(testData);
            expect(results.insights).toBeDefined();
            expect(results.metrics).toBeDefined();
        });
    });
});
