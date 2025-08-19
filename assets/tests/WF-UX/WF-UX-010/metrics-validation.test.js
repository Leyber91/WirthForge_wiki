/**
 * WF-UX-010 Metrics Validation Test Suite
 * Tests for research metrics collection, analysis, and validation
 */

import { MetricsAnalyzer } from '../../../code/WF-UX-010/metrics-analyzer.js';
import { ResearchDashboard } from '../../../code/WF-UX-010/research-dashboard.js';
import { ExperimentFramework, StatisticalEngine } from '../../../code/WF-UX-010/experiment-framework.js';

describe('Metrics Validation Test Suite', () => {
    let metricsAnalyzer;
    let researchDashboard;
    let experimentFramework;
    let statisticalEngine;

    beforeEach(() => {
        metricsAnalyzer = new MetricsAnalyzer({
            maxProcessingTime: 8,
            batchSize: 50,
            performanceMode: 'balanced'
        });

        researchDashboard = new ResearchDashboard({
            updateInterval: 1000,
            maxWidgets: 10,
            performanceBudget: 16.67
        });

        experimentFramework = new ExperimentFramework({
            maxConcurrentExperiments: 3,
            minSampleSize: 50,
            confidenceLevel: 0.95
        });

        statisticalEngine = new StatisticalEngine();

        global.performance = {
            now: jest.fn(() => Date.now()),
            mark: jest.fn(),
            measure: jest.fn()
        };

        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Energy Engagement Metrics', () => {
        test('should validate energy efficiency calculations', async () => {
            const energyData = [
                {
                    type: 'energy_interaction',
                    timestamp: Date.now() - 5000,
                    data: {
                        batteryLevel: 0.8,
                        powerMode: 'balanced',
                        cpuUsage: 0.3,
                        interactionType: 'click',
                        energyEfficiency: 0.85
                    }
                },
                {
                    type: 'energy_interaction',
                    timestamp: Date.now() - 3000,
                    data: {
                        batteryLevel: 0.75,
                        powerMode: 'high_performance',
                        cpuUsage: 0.6,
                        interactionType: 'scroll',
                        energyEfficiency: 0.72
                    }
                }
            ];

            const analysis = await metricsAnalyzer.analyzeEnergyEngagement(energyData);
            
            expect(analysis.averageEfficiency).toBeCloseTo(0.785, 2);
            expect(analysis.batteryImpact.trend).toBe('declining');
            expect(analysis.powerModeDistribution).toHaveProperty('balanced');
            expect(analysis.recommendations).toContain(
                expect.objectContaining({
                    type: 'energy_optimization'
                })
            );
        });

        test('should detect energy anomalies', async () => {
            const anomalousData = [
                { energyEfficiency: 0.85, timestamp: Date.now() - 5000 },
                { energyEfficiency: 0.82, timestamp: Date.now() - 4000 },
                { energyEfficiency: 0.15, timestamp: Date.now() - 3000 }, // Anomaly
                { energyEfficiency: 0.88, timestamp: Date.now() - 2000 }
            ];

            const anomalies = await metricsAnalyzer.detectEnergyAnomalies(anomalousData);
            
            expect(anomalies).toHaveLength(1);
            expect(anomalies[0].energyEfficiency).toBe(0.15);
            expect(anomalies[0].anomalyScore).toBeGreaterThan(2);
        });
    });

    describe('Performance Metrics Validation', () => {
        test('should validate 60Hz compliance', async () => {
            const performanceData = [
                { frameTime: 15.2, timestamp: Date.now() - 1000 },
                { frameTime: 18.7, timestamp: Date.now() - 800 },
                { frameTime: 14.1, timestamp: Date.now() - 600 }
            ];

            const analysis = await metricsAnalyzer.analyzePerformanceMetrics(performanceData);
            
            expect(analysis.averageFrameTime).toBeCloseTo(16.0, 1);
            expect(analysis.frameTimeCompliance.percentage).toBeCloseTo(66.67, 2);
            expect(analysis.performanceGrade).toBe('B');
        });

        test('should maintain processing time budget', async () => {
            const largeDataset = Array(1000).fill(null).map(() => ({
                frameTime: Math.random() * 20 + 10,
                memoryUsage: Math.random() * 100 + 20,
                timestamp: Date.now()
            }));

            const startTime = performance.now();
            const analysis = await metricsAnalyzer.analyzePerformanceMetrics(largeDataset);
            const processingTime = performance.now() - startTime;
            
            expect(processingTime).toBeLessThan(100);
            expect(analysis.summary.totalRecords).toBe(1000);
        });
    });

    describe('Statistical Analysis', () => {
        test('should perform valid t-test', () => {
            const controlGroup = [85, 87, 82, 90, 88, 86, 84, 89, 87, 85];
            const treatmentGroup = [92, 94, 89, 96, 93, 91, 95, 90, 94, 92];

            const testResult = statisticalEngine.twoSampleTest(controlGroup, treatmentGroup, 0.95);
            
            expect(testResult.significant).toBe(true);
            expect(testResult.pValue).toBeLessThan(0.05);
            expect(testResult.effectSize).toBeGreaterThan(0);
            expect(testResult.confidenceInterval).toHaveLength(2);
        });

        test('should calculate descriptive statistics', () => {
            const testData = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
            
            const stats = statisticalEngine.calculateStats(testData);
            
            expect(stats.mean).toBe(19);
            expect(stats.count).toBe(10);
            expect(stats.min).toBe(10);
            expect(stats.max).toBe(28);
            expect(stats.std).toBeCloseTo(6.05, 2);
        });

        test('should handle edge cases', () => {
            const emptyStats = statisticalEngine.calculateStats([]);
            expect(emptyStats.mean).toBe(0);
            expect(emptyStats.count).toBe(0);

            const singleStats = statisticalEngine.calculateStats([42]);
            expect(singleStats.mean).toBe(42);
            expect(singleStats.std).toBe(0);
        });
    });

    describe('Dashboard Performance', () => {
        test('should maintain 60Hz during updates', async () => {
            await researchDashboard.initialize();
            
            const frameMonitor = {
                frameTimes: [],
                lastFrame: null,
                recordFrame() {
                    const now = performance.now();
                    if (this.lastFrame) {
                        this.frameTimes.push(now - this.lastFrame);
                    }
                    this.lastFrame = now;
                }
            };

            for (let i = 0; i < 60; i++) {
                frameMonitor.recordFrame();
                
                await researchDashboard.updateMetrics({
                    testMetric: { value: Math.random() * 100 }
                });
                
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
            
            const avgFrameTime = frameMonitor.frameTimes.reduce((sum, time) => sum + time, 0) / frameMonitor.frameTimes.length;
            expect(avgFrameTime).toBeLessThan(16.67);
        });

        test('should handle widget errors gracefully', async () => {
            await researchDashboard.initialize();
            
            const faultyWidget = {
                id: 'faulty-widget',
                render: jest.fn().mockImplementation(() => {
                    throw new Error('Widget rendering failed');
                })
            };
            
            researchDashboard.addWidget(faultyWidget);
            
            await expect(
                researchDashboard.updateMetrics({ testData: { value: 100 } })
            ).resolves.not.toThrow();
            
            expect(researchDashboard.errorCount).toBeGreaterThan(0);
        });
    });

    describe('Data Quality Validation', () => {
        test('should validate data quality', async () => {
            const mixedQualityData = [
                { value: 10, timestamp: Date.now() - 5000, quality: 'high' },
                { value: null, timestamp: Date.now() - 4000, quality: 'missing' },
                { value: -5, timestamp: Date.now() - 3000, quality: 'invalid' },
                { value: 12, timestamp: Date.now() - 2000, quality: 'high' }
            ];

            const qualityReport = await metricsAnalyzer.validateDataQuality(mixedQualityData);
            
            expect(qualityReport.totalRecords).toBe(4);
            expect(qualityReport.validRecords).toBe(2);
            expect(qualityReport.missingValues).toBe(1);
            expect(qualityReport.invalidValues).toBe(1);
            expect(qualityReport.qualityScore).toBeCloseTo(0.5, 1);
        });

        test('should handle corrupted data', async () => {
            const corruptedData = [
                { value: 10, timestamp: Date.now() },
                { value: null, timestamp: Date.now() },
                { value: 'invalid', timestamp: Date.now() },
                { timestamp: Date.now() },
                { value: Infinity, timestamp: Date.now() }
            ];

            const analysis = await metricsAnalyzer.processBatch(corruptedData);
            
            expect(analysis.summary.totalRecords).toBe(5);
            expect(analysis.summary.validRecords).toBe(1);
            expect(analysis.summary.corruptedRecords).toBe(4);
            expect(analysis.dataQuality.score).toBeLessThan(0.5);
        });
    });

    describe('Experiment Integration', () => {
        test('should collect experiment metrics', async () => {
            const experiment = await experimentFramework.createExperiment({
                name: 'Metrics Test Experiment',
                variants: [
                    { id: 'control', name: 'Control Version' },
                    { id: 'treatment', name: 'Treatment Version' }
                ],
                metrics: [
                    { name: 'completion_rate', type: 'conversion' },
                    { name: 'task_time', type: 'duration' }
                ]
            });

            const startedExperiment = await experimentFramework.startExperiment(
                experiment.id,
                { approvedBy: 'test_system' }
            );

            const participants = ['user1', 'user2', 'user3', 'user4'];
            const assignments = [];
            
            for (const participantId of participants) {
                const assignment = await experimentFramework.assignParticipant(
                    experiment.id,
                    participantId,
                    { userLevel: 'intermediate' }
                );
                assignments.push(assignment);
            }

            for (const assignment of assignments) {
                await experimentFramework.recordEvent(
                    experiment.id,
                    assignment.participantId,
                    'task_completed',
                    {
                        completionTime: Math.random() * 5000 + 2000,
                        success: Math.random() > 0.2
                    }
                );
            }

            const analysis = await experimentFramework.analyzeExperiment(experiment.id, 'interim');
            
            expect(analysis.sampleSizes).toBeDefined();
            expect(analysis.metrics).toBeDefined();
            expect(analysis.insights).toBeInstanceOf(Array);
            expect(analysis.processingTime).toBeLessThan(1000);
        });

        test('should detect metric drift', async () => {
            const baselineMetrics = {
                conversionRate: 0.15,
                averageTime: 3500,
                satisfactionScore: 4.2
            };

            const currentMetrics = {
                conversionRate: 0.12,
                averageTime: 4200,
                satisfactionScore: 3.8
            };

            const driftAnalysis = await metricsAnalyzer.detectMetricDrift(
                baselineMetrics,
                currentMetrics,
                { threshold: 0.1 }
            );
            
            expect(driftAnalysis.driftDetected).toBe(true);
            expect(driftAnalysis.driftingMetrics).toContain('conversionRate');
            expect(driftAnalysis.severity).toBe('moderate');
        });
    });

    describe('Scalability and Performance', () => {
        test('should handle large datasets efficiently', async () => {
            const largeDataset = Array(10000).fill(null).map((_, i) => ({
                timestamp: Date.now() - i * 1000,
                value: Math.sin(i * 0.01) * 50 + 50,
                type: 'performance_metric'
            }));

            const startTime = performance.now();
            const analysis = await metricsAnalyzer.processBatch(largeDataset);
            const processingTime = performance.now() - startTime;
            
            expect(analysis.summary.totalRecords).toBe(10000);
            expect(processingTime).toBeLessThan(5000);
        });

        test('should maintain accuracy under concurrent processing', async () => {
            const datasets = Array(5).fill(null).map((_, i) => 
                Array(100).fill(null).map(() => ({
                    value: Math.random() * 100,
                    timestamp: Date.now(),
                    batchId: i
                }))
            );

            const promises = datasets.map(dataset => 
                metricsAnalyzer.processBatch(dataset)
            );

            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(5);
            expect(results.every(r => r.summary.totalRecords === 100)).toBe(true);
            expect(results.every(r => r.summary.processingTime < 1000)).toBe(true);
        });
    });

    describe('Compliance and Audit', () => {
        test('should generate compliance report', async () => {
            const testMetrics = [
                { name: 'frame_time', value: 15.2, timestamp: Date.now() - 1000 },
                { name: 'frame_time', value: 18.7, timestamp: Date.now() - 800 },
                { name: 'memory_usage', value: 45.6, timestamp: Date.now() - 1000 }
            ];

            const complianceReport = await metricsAnalyzer.generateComplianceReport(
                testMetrics,
                {
                    performanceBudgets: {
                        frame_time: { max: 16.67 },
                        memory_usage: { max: 100 }
                    }
                }
            );
            
            expect(complianceReport.period).toBeDefined();
            expect(complianceReport.compliance.frame_time.compliant).toBe(false);
            expect(complianceReport.compliance.memory_usage.compliant).toBe(true);
            expect(complianceReport.overallCompliance).toBeLessThan(1.0);
        });

        test('should validate metric schema', async () => {
            const validMetric = {
                name: 'task_completion_rate',
                type: 'percentage',
                value: 0.85,
                timestamp: Date.now()
            };

            const invalidMetric = {
                name: 'invalid_metric',
                value: 'not_a_number',
                timestamp: 'invalid_timestamp'
            };

            const validationResults = await Promise.all([
                metricsAnalyzer.validateMetricSchema(validMetric),
                metricsAnalyzer.validateMetricSchema(invalidMetric)
            ]);

            expect(validationResults[0].valid).toBe(true);
            expect(validationResults[0].errors).toHaveLength(0);
            
            expect(validationResults[1].valid).toBe(false);
            expect(validationResults[1].errors.length).toBeGreaterThan(0);
        });
    });

    describe('Error Recovery', () => {
        test('should recover from processing failures', async () => {
            const testData = Array(100).fill(null).map((_, i) => ({
                id: i,
                value: Math.random() * 100,
                timestamp: Date.now()
            }));

            let processedCount = 0;
            const originalProcessBatch = metricsAnalyzer.processBatch;
            metricsAnalyzer.processBatch = jest.fn().mockImplementation(async (data) => {
                processedCount += data.length;
                if (processedCount > 50) {
                    throw new Error('Processing failure');
                }
                return originalProcessBatch.call(metricsAnalyzer, data);
            });

            const chunkSize = 25;
            const results = [];
            
            for (let i = 0; i < testData.length; i += chunkSize) {
                const chunk = testData.slice(i, i + chunkSize);
                try {
                    const result = await metricsAnalyzer.processBatch(chunk);
                    results.push(result);
                } catch (error) {
                    continue;
                }
            }

            expect(results).toHaveLength(2);
            expect(results.every(r => r.summary.validRecords === chunkSize)).toBe(true);
            
            metricsAnalyzer.processBatch = originalProcessBatch;
        });
    });
});
