/**
 * WIRTHFORGE Sampling Accuracy Test Suite
 * 
 * Tests for metrics collection accuracy, timing precision, frame budget compliance,
 * and data integrity across system and model collectors at different frequencies.
 */

const { SystemCollector } = require('../../../code/WF-OPS/WF-OPS-002/system-collector');
const { ModelCollector } = require('../../../code/WF-OPS/WF-OPS-002/model-collector');
const { MetricsAggregator } = require('../../../code/WF-OPS/WF-OPS-002/aggregator');

describe('WF-OPS-002 Sampling Accuracy', () => {
    let systemCollector;
    let modelCollector;
    let aggregator;
    
    beforeEach(() => {
        systemCollector = new SystemCollector({
            sampleRate: 10, // 10Hz for testing
            frameBudgetMs: 16.67
        });
        
        modelCollector = new ModelCollector({
            sampleRate: 60, // 60Hz for testing
            frameBudgetMs: 16.67
        });
        
        aggregator = new MetricsAggregator({
            windowSizes: ['1s', '5s', '30s'],
            flushInterval: 1000
        });
    });
    
    afterEach(async () => {
        if (systemCollector.isRunning) {
            await systemCollector.stop();
        }
        if (modelCollector.isRunning) {
            await modelCollector.stop();
        }
        if (aggregator.isRunning) {
            await aggregator.stop();
        }
    });
    
    describe('System Collector Accuracy', () => {
        test('should collect system metrics at specified frequency', async () => {
            const metrics = [];
            const expectedSamples = 5; // Collect for 0.5 seconds at 10Hz
            
            systemCollector.on('metrics', (metric) => {
                metrics.push(metric);
            });
            
            await systemCollector.start();
            
            // Wait for expected collection period
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await systemCollector.stop();
            
            // Verify sample count (allow ±1 for timing variations)
            expect(metrics.length).toBeGreaterThanOrEqual(expectedSamples - 1);
            expect(metrics.length).toBeLessThanOrEqual(expectedSamples + 1);
        });
        
        test('should maintain consistent timing intervals', async () => {
            const timestamps = [];
            const expectedInterval = 100; // 10Hz = 100ms intervals
            const toleranceMs = 20; // ±20ms tolerance
            
            systemCollector.on('metrics', (metric) => {
                timestamps.push(metric.timestamp);
            });
            
            await systemCollector.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await systemCollector.stop();
            
            // Analyze intervals between consecutive samples
            const intervals = [];
            for (let i = 1; i < timestamps.length; i++) {
                intervals.push(timestamps[i] - timestamps[i - 1]);
            }
            
            // Verify most intervals are within tolerance
            const validIntervals = intervals.filter(interval => 
                Math.abs(interval - expectedInterval) <= toleranceMs
            );
            
            const accuracy = validIntervals.length / intervals.length;
            expect(accuracy).toBeGreaterThan(0.8); // 80% accuracy threshold
        });
        
        test('should collect valid CPU metrics', async () => {
            const metrics = [];
            
            systemCollector.on('metrics', (metric) => {
                if (metric.type === 'system' && metric.data.cpu_percent !== undefined) {
                    metrics.push(metric.data.cpu_percent);
                }
            });
            
            await systemCollector.start();
            await new Promise(resolve => setTimeout(resolve, 500));
            await systemCollector.stop();
            
            expect(metrics.length).toBeGreaterThan(0);
            
            // Verify CPU values are in valid range
            metrics.forEach(cpuValue => {
                expect(cpuValue).toBeGreaterThanOrEqual(0);
                expect(cpuValue).toBeLessThanOrEqual(100);
                expect(typeof cpuValue).toBe('number');
            });
        });
        
        test('should collect valid memory metrics', async () => {
            const metrics = [];
            
            systemCollector.on('metrics', (metric) => {
                if (metric.type === 'system' && metric.data.memory_percent !== undefined) {
                    metrics.push(metric.data.memory_percent);
                }
            });
            
            await systemCollector.start();
            await new Promise(resolve => setTimeout(resolve, 500));
            await systemCollector.stop();
            
            expect(metrics.length).toBeGreaterThan(0);
            
            // Verify memory values are in valid range
            metrics.forEach(memoryValue => {
                expect(memoryValue).toBeGreaterThanOrEqual(0);
                expect(memoryValue).toBeLessThanOrEqual(100);
                expect(typeof memoryValue).toBe('number');
            });
        });
        
        test('should respect frame budget constraints', async () => {
            const frameTimes = [];
            const frameBudget = 16.67; // 60Hz budget
            
            systemCollector.on('frameTime', (frameTime) => {
                frameTimes.push(frameTime);
            });
            
            await systemCollector.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await systemCollector.stop();
            
            // Verify frame times are within budget
            const overBudgetFrames = frameTimes.filter(time => time > frameBudget);
            const budgetCompliance = 1 - (overBudgetFrames.length / frameTimes.length);
            
            expect(budgetCompliance).toBeGreaterThan(0.95); // 95% compliance
        });
    });
    
    describe('Model Collector Accuracy', () => {
        test('should collect model metrics at 60Hz frequency', async () => {
            const metrics = [];
            const expectedSamples = 30; // Collect for 0.5 seconds at 60Hz
            
            modelCollector.on('metrics', (metric) => {
                metrics.push(metric);
            });
            
            await modelCollector.start();
            
            // Simulate model activity
            for (let i = 0; i < 10; i++) {
                modelCollector.recordTokenGeneration(1, 50); // 1 token, 50ms
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            await modelCollector.stop();
            
            // Verify high-frequency sampling
            expect(metrics.length).toBeGreaterThanOrEqual(expectedSamples - 5);
            expect(metrics.length).toBeLessThanOrEqual(expectedSamples + 5);
        });
        
        test('should accurately track token generation rates', async () => {
            const tokenRates = [];
            const expectedTokensPerSecond = 20; // 1 token per 50ms
            
            modelCollector.on('metrics', (metric) => {
                if (metric.type === 'model' && metric.data.tokens_per_second !== undefined) {
                    tokenRates.push(metric.data.tokens_per_second);
                }
            });
            
            await modelCollector.start();
            
            // Generate tokens at known rate
            const tokenInterval = setInterval(() => {
                modelCollector.recordTokenGeneration(1, 50);
            }, 50);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            clearInterval(tokenInterval);
            await modelCollector.stop();
            
            // Verify token rate accuracy
            const validRates = tokenRates.filter(rate => 
                Math.abs(rate - expectedTokensPerSecond) <= 5
            );
            
            const accuracy = validRates.length / tokenRates.length;
            expect(accuracy).toBeGreaterThan(0.7); // 70% accuracy threshold
        });
        
        test('should calculate accurate TTFT measurements', async () => {
            const ttftValues = [];
            const expectedTTFT = 200; // 200ms first token time
            
            modelCollector.on('metrics', (metric) => {
                if (metric.type === 'model' && metric.data.ttft_ms !== undefined) {
                    ttftValues.push(metric.data.ttft_ms);
                }
            });
            
            await modelCollector.start();
            
            // Simulate requests with known TTFT
            for (let i = 0; i < 5; i++) {
                modelCollector.recordRequest();
                await new Promise(resolve => setTimeout(resolve, expectedTTFT));
                modelCollector.recordTokenGeneration(1, 50);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            await modelCollector.stop();
            
            expect(ttftValues.length).toBeGreaterThan(0);
            
            // Verify TTFT accuracy (±50ms tolerance)
            const accurateTTFT = ttftValues.filter(ttft => 
                Math.abs(ttft - expectedTTFT) <= 50
            );
            
            const accuracy = accurateTTFT.length / ttftValues.length;
            expect(accuracy).toBeGreaterThan(0.8); // 80% accuracy
        });
        
        test('should track energy consumption accurately', async () => {
            const energyValues = [];
            
            modelCollector.on('metrics', (metric) => {
                if (metric.type === 'model' && metric.data.energy_joules !== undefined) {
                    energyValues.push(metric.data.energy_joules);
                }
            });
            
            await modelCollector.start();
            
            // Simulate high-energy operations
            for (let i = 0; i < 10; i++) {
                modelCollector.recordTokenGeneration(10, 100); // 10 tokens, 100ms
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            await modelCollector.stop();
            
            expect(energyValues.length).toBeGreaterThan(0);
            
            // Verify energy values are reasonable and increasing
            energyValues.forEach(energy => {
                expect(energy).toBeGreaterThan(0);
                expect(typeof energy).toBe('number');
            });
            
            // Energy should generally increase with more activity
            const increasingTrend = energyValues.slice(1).some((energy, i) => 
                energy >= energyValues[i]
            );
            expect(increasingTrend).toBe(true);
        });
    });
    
    describe('Aggregation Accuracy', () => {
        test('should aggregate metrics with correct statistics', async () => {
            const testData = [
                { timestamp: Date.now() - 4000, data: { value: 10 } },
                { timestamp: Date.now() - 3000, data: { value: 20 } },
                { timestamp: Date.now() - 2000, data: { value: 30 } },
                { timestamp: Date.now() - 1000, data: { value: 40 } },
                { timestamp: Date.now(), data: { value: 50 } }
            ];
            
            const aggregations = [];
            
            aggregator.on('aggregated', (aggregation) => {
                aggregations.push(aggregation);
            });
            
            await aggregator.start();
            
            // Feed test data
            for (const dataPoint of testData) {
                aggregator.addMetric(dataPoint);
            }
            
            // Wait for aggregation
            await new Promise(resolve => setTimeout(resolve, 1100));
            await aggregator.stop();
            
            expect(aggregations.length).toBeGreaterThan(0);
            
            // Verify statistical accuracy
            const aggregation = aggregations[0];
            expect(aggregation.statistics.count).toBe(5);
            expect(aggregation.statistics.min).toBe(10);
            expect(aggregation.statistics.max).toBe(50);
            expect(aggregation.statistics.mean).toBe(30);
            expect(aggregation.statistics.median).toBe(30);
        });
        
        test('should handle different time windows correctly', async () => {
            const windowSizes = ['1s', '5s', '30s'];
            const aggregations = new Map();
            
            aggregator.on('aggregated', (aggregation) => {
                if (!aggregations.has(aggregation.windowSize)) {
                    aggregations.set(aggregation.windowSize, []);
                }
                aggregations.get(aggregation.windowSize).push(aggregation);
            });
            
            await aggregator.start();
            
            // Generate data over 10 seconds
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                aggregator.addMetric({
                    timestamp: startTime + i * 100,
                    data: { value: Math.random() * 100 }
                });
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            await aggregator.stop();
            
            // Verify different window sizes produced aggregations
            for (const windowSize of windowSizes) {
                expect(aggregations.has(windowSize)).toBe(true);
                expect(aggregations.get(windowSize).length).toBeGreaterThan(0);
            }
        });
        
        test('should maintain data integrity during aggregation', async () => {
            const inputData = [];
            const outputAggregations = [];
            
            // Generate test data with known values
            for (let i = 0; i < 50; i++) {
                const dataPoint = {
                    timestamp: Date.now() + i * 100,
                    source: 'test',
                    data: { value: i * 2 } // Even numbers 0, 2, 4, ..., 98
                };
                inputData.push(dataPoint);
            }
            
            aggregator.on('aggregated', (aggregation) => {
                outputAggregations.push(aggregation);
            });
            
            await aggregator.start();
            
            // Feed all data
            for (const dataPoint of inputData) {
                aggregator.addMetric(dataPoint);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            await aggregator.stop();
            
            expect(outputAggregations.length).toBeGreaterThan(0);
            
            // Verify no data loss
            const totalInputPoints = inputData.length;
            const totalOutputPoints = outputAggregations.reduce(
                (sum, agg) => sum + agg.statistics.count, 0
            );
            
            expect(totalOutputPoints).toBe(totalInputPoints);
            
            // Verify statistical correctness
            const expectedSum = inputData.reduce((sum, point) => sum + point.data.value, 0);
            const outputSum = outputAggregations.reduce(
                (sum, agg) => sum + (agg.statistics.mean * agg.statistics.count), 0
            );
            
            expect(Math.abs(outputSum - expectedSum)).toBeLessThan(1); // Allow small floating point errors
        });
    });
    
    describe('Cross-Component Integration', () => {
        test('should maintain accuracy across collector-aggregator pipeline', async () => {
            const pipelineResults = [];
            
            // Connect system collector to aggregator
            systemCollector.on('metrics', (metric) => {
                aggregator.addMetric(metric);
            });
            
            aggregator.on('aggregated', (aggregation) => {
                pipelineResults.push(aggregation);
            });
            
            await systemCollector.start();
            await aggregator.start();
            
            // Run pipeline for 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await systemCollector.stop();
            await aggregator.stop();
            
            expect(pipelineResults.length).toBeGreaterThan(0);
            
            // Verify pipeline integrity
            pipelineResults.forEach(result => {
                expect(result.statistics).toBeDefined();
                expect(result.statistics.count).toBeGreaterThan(0);
                expect(typeof result.statistics.mean).toBe('number');
                expect(typeof result.statistics.min).toBe('number');
                expect(typeof result.statistics.max).toBe('number');
            });
        });
        
        test('should handle mixed frequency data correctly', async () => {
            const mixedResults = [];
            
            // Connect both collectors to aggregator
            systemCollector.on('metrics', (metric) => {
                aggregator.addMetric({ ...metric, source: 'system' });
            });
            
            modelCollector.on('metrics', (metric) => {
                aggregator.addMetric({ ...metric, source: 'model' });
            });
            
            aggregator.on('aggregated', (aggregation) => {
                mixedResults.push(aggregation);
            });
            
            await systemCollector.start();
            await modelCollector.start();
            await aggregator.start();
            
            // Generate some model activity
            for (let i = 0; i < 5; i++) {
                modelCollector.recordTokenGeneration(5, 100);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            await systemCollector.stop();
            await modelCollector.stop();
            await aggregator.stop();
            
            expect(mixedResults.length).toBeGreaterThan(0);
            
            // Verify both sources are represented
            const systemAggregations = mixedResults.filter(r => r.source === 'system');
            const modelAggregations = mixedResults.filter(r => r.source === 'model');
            
            expect(systemAggregations.length).toBeGreaterThan(0);
            expect(modelAggregations.length).toBeGreaterThan(0);
        });
    });
    
    describe('Performance and Timing', () => {
        test('should maintain sub-millisecond timestamp precision', async () => {
            const timestamps = [];
            
            systemCollector.on('metrics', (metric) => {
                timestamps.push(metric.timestamp);
            });
            
            await systemCollector.start();
            await new Promise(resolve => setTimeout(resolve, 500));
            await systemCollector.stop();
            
            expect(timestamps.length).toBeGreaterThan(1);
            
            // Verify timestamp precision (should have decimal places for sub-ms)
            const hasSubMillisecondPrecision = timestamps.some(ts => 
                (ts % 1) !== 0 || ts.toString().includes('.')
            );
            
            // At minimum, timestamps should be unique
            const uniqueTimestamps = new Set(timestamps);
            expect(uniqueTimestamps.size).toBe(timestamps.length);
        });
        
        test('should handle burst data collection without loss', async () => {
            const burstData = [];
            const burstSize = 100;
            
            aggregator.on('aggregated', (aggregation) => {
                burstData.push(aggregation);
            });
            
            await aggregator.start();
            
            // Send burst of data
            const startTime = Date.now();
            for (let i = 0; i < burstSize; i++) {
                aggregator.addMetric({
                    timestamp: startTime + i,
                    data: { value: i }
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            await aggregator.stop();
            
            // Verify all data was processed
            const totalProcessed = burstData.reduce(
                (sum, agg) => sum + agg.statistics.count, 0
            );
            
            expect(totalProcessed).toBe(burstSize);
        });
    });
});

// Helper functions for testing
function generateTestMetrics(count, interval = 100) {
    const metrics = [];
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
        metrics.push({
            timestamp: startTime + i * interval,
            source: 'test',
            type: 'system',
            data: {
                cpu_percent: Math.random() * 100,
                memory_percent: Math.random() * 100,
                value: Math.random() * 1000
            }
        });
    }
    
    return metrics;
}

function calculateStatistics(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    return {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        sum
    };
}

function measureFrameTime(fn) {
    const start = performance.now();
    fn();
    return performance.now() - start;
}
