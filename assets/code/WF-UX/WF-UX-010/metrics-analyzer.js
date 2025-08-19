/**
 * WF-UX-010 Metrics Analyzer
 * Processes feedback data and generates insights with statistical analysis
 * Maintains 8ms processing budget and real-time reporting capabilities
 */

export class MetricsAnalyzer {
    constructor(options = {}) {
        this.config = {
            maxProcessingTime: 8, // 8ms budget per analysis cycle
            batchSize: 100,
            analysisInterval: 1000, // 1 second
            confidenceLevel: 0.95,
            minSampleSize: 30,
            ...options
        };

        this.dataBuffer = [];
        this.analysisResults = new Map();
        this.statisticalCache = new Map();
        this.anomalyDetector = new AnomalyDetector();
        this.trendAnalyzer = new TrendAnalyzer();
        
        this.initializeAnalysis();
    }

    initializeAnalysis() {
        this.startAnalysisLoop();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('wirthforge:feedback-collected', (event) => {
            this.queueForAnalysis(event.detail);
        });

        document.addEventListener('wirthforge:energy-update', (event) => {
            this.analyzeEnergyMetrics(event.detail);
        });
    }

    queueForAnalysis(data) {
        this.dataBuffer.push({
            ...data,
            queuedAt: Date.now()
        });

        // Trigger immediate analysis for high-priority data
        if (this.isHighPriority(data)) {
            this.processImmediate(data);
        }
    }

    isHighPriority(data) {
        return data.type === 'explicit' && 
               (data.rating <= 2 || data.category === 'bug-report');
    }

    async processImmediate(data) {
        const startTime = performance.now();
        
        try {
            const analysis = await this.analyzeSingle(data);
            this.dispatchAnalysisResult(analysis);
            
            const processingTime = performance.now() - startTime;
            if (processingTime > 2) { // 2ms budget for immediate processing
                console.warn(`Immediate analysis took ${processingTime.toFixed(2)}ms`);
            }
        } catch (error) {
            console.error('Immediate analysis failed:', error);
        }
    }

    startAnalysisLoop() {
        const analysisLoop = () => {
            if (this.dataBuffer.length > 0) {
                this.processBatch();
            }
            
            setTimeout(analysisLoop, this.config.analysisInterval);
        };
        
        analysisLoop();
    }

    async processBatch() {
        const startTime = performance.now();
        
        try {
            const batch = this.dataBuffer.splice(0, this.config.batchSize);
            const results = await this.analyzeBatch(batch);
            
            this.updateAnalysisResults(results);
            this.detectAnomalies(results);
            this.updateTrends(results);
            
            const processingTime = performance.now() - startTime;
            if (processingTime > this.config.maxProcessingTime) {
                console.warn(`Batch analysis exceeded budget: ${processingTime.toFixed(2)}ms`);
            }
            
        } catch (error) {
            console.error('Batch analysis failed:', error);
        }
    }

    async analyzeBatch(batch) {
        const results = {
            energyEngagement: this.analyzeEnergyEngagement(batch),
            usabilityMetrics: this.analyzeUsability(batch),
            performanceMetrics: this.analyzePerformance(batch),
            feedbackSentiment: this.analyzeSentiment(batch),
            userBehavior: this.analyzeUserBehavior(batch),
            timestamp: Date.now(),
            sampleSize: batch.length
        };

        return results;
    }

    analyzeEnergyEngagement(batch) {
        const energyEvents = batch.filter(item => 
            item.type === 'interaction' && item.energyContext
        );

        if (energyEvents.length === 0) {
            return { score: 0, confidence: 0, insights: [] };
        }

        const engagementScores = energyEvents.map(event => {
            const context = event.energyContext;
            return this.calculateEngagementScore(context);
        });

        const avgScore = this.calculateMean(engagementScores);
        const stdDev = this.calculateStandardDeviation(engagementScores);
        
        return {
            score: avgScore,
            standardDeviation: stdDev,
            confidence: this.calculateConfidence(engagementScores.length),
            distribution: this.calculateDistribution(engagementScores),
            insights: this.generateEngagementInsights(avgScore, stdDev),
            trends: this.trendAnalyzer.analyzeTrend('energy_engagement', avgScore)
        };
    }

    calculateEngagementScore(energyContext) {
        const { totalEnergy, activeComponents, frameRate } = energyContext;
        
        // Normalize metrics (0-100 scale)
        const energyScore = Math.min(totalEnergy / 100, 1) * 100;
        const componentScore = Math.min(activeComponents.length / 10, 1) * 100;
        const performanceScore = Math.min(frameRate / 60, 1) * 100;
        
        // Weighted combination
        return (energyScore * 0.4) + (componentScore * 0.3) + (performanceScore * 0.3);
    }

    analyzeUsability(batch) {
        const usabilityEvents = batch.filter(item => 
            item.type === 'explicit' && item.category === 'usability'
        );

        if (usabilityEvents.length < this.config.minSampleSize) {
            return { score: 0, confidence: 0, insights: [] };
        }

        const ratings = usabilityEvents.map(event => event.rating);
        const avgRating = this.calculateMean(ratings);
        const satisfaction = (avgRating / 5) * 100; // Convert to percentage

        return {
            score: satisfaction,
            averageRating: avgRating,
            ratingDistribution: this.calculateRatingDistribution(ratings),
            confidence: this.calculateConfidence(ratings.length),
            insights: this.generateUsabilityInsights(avgRating, ratings),
            commonIssues: this.extractCommonIssues(usabilityEvents)
        };
    }

    analyzePerformance(batch) {
        const performanceEvents = batch.filter(item => 
            item.type === 'performance' || 
            (item.energyContext && item.energyContext.frameRate)
        );

        if (performanceEvents.length === 0) {
            return { score: 0, confidence: 0, insights: [] };
        }

        const frameRates = performanceEvents
            .map(event => event.energyContext?.frameRate || event.frameRate)
            .filter(rate => rate !== undefined);

        const avgFrameRate = this.calculateMean(frameRates);
        const performanceScore = Math.min(avgFrameRate / 60, 1) * 100;

        return {
            score: performanceScore,
            averageFrameRate: avgFrameRate,
            frameRateDistribution: this.calculateDistribution(frameRates),
            budgetCompliance: this.calculateBudgetCompliance(frameRates),
            confidence: this.calculateConfidence(frameRates.length),
            insights: this.generatePerformanceInsights(avgFrameRate, frameRates)
        };
    }

    analyzeSentiment(batch) {
        const textFeedback = batch.filter(item => 
            item.type === 'explicit' && item.text
        );

        if (textFeedback.length === 0) {
            return { score: 0, confidence: 0, insights: [] };
        }

        const sentiments = textFeedback.map(feedback => 
            this.calculateSentimentScore(feedback.text)
        );

        const avgSentiment = this.calculateMean(sentiments);
        
        return {
            score: avgSentiment,
            distribution: this.categorizeSentiments(sentiments),
            confidence: this.calculateConfidence(sentiments.length),
            insights: this.generateSentimentInsights(avgSentiment, sentiments),
            keyPhrases: this.extractKeyPhrases(textFeedback)
        };
    }

    calculateSentimentScore(text) {
        // Simplified sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect', 'easy', 'intuitive'];
        const negativeWords = ['bad', 'terrible', 'hate', 'difficult', 'confusing', 'slow', 'broken', 'frustrating'];
        
        const words = text.toLowerCase().split(/\W+/);
        let score = 50; // Neutral baseline
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 10;
            if (negativeWords.includes(word)) score -= 10;
        });
        
        return Math.max(0, Math.min(100, score));
    }

    analyzeUserBehavior(batch) {
        const interactionEvents = batch.filter(item => item.type === 'interaction');
        
        if (interactionEvents.length === 0) {
            return { patterns: [], insights: [] };
        }

        const patterns = {
            clickPatterns: this.analyzeClickPatterns(interactionEvents),
            scrollBehavior: this.analyzeScrollBehavior(interactionEvents),
            sessionDuration: this.analyzeSessionDuration(interactionEvents),
            navigationPaths: this.analyzeNavigationPaths(interactionEvents)
        };

        return {
            patterns,
            insights: this.generateBehaviorInsights(patterns),
            anomalies: this.anomalyDetector.detectBehaviorAnomalies(patterns)
        };
    }

    analyzeClickPatterns(events) {
        const clickEvents = events.filter(e => e.subType === 'click');
        
        return {
            totalClicks: clickEvents.length,
            clickRate: clickEvents.length / (events.length || 1),
            targetDistribution: this.calculateTargetDistribution(clickEvents),
            timeDistribution: this.calculateTimeDistribution(clickEvents)
        };
    }

    analyzeScrollBehavior(events) {
        const scrollEvents = events.filter(e => e.subType === 'scroll');
        
        return {
            totalScrolls: scrollEvents.length,
            scrollVelocity: this.calculateScrollVelocity(scrollEvents),
            scrollDepth: this.calculateScrollDepth(scrollEvents)
        };
    }

    // Statistical utility methods
    calculateMean(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        const mean = this.calculateMean(values);
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return Math.sqrt(this.calculateMean(squaredDiffs));
    }

    calculateConfidence(sampleSize) {
        if (sampleSize < this.config.minSampleSize) {
            return sampleSize / this.config.minSampleSize;
        }
        return Math.min(1, sampleSize / 100); // Max confidence at 100 samples
    }

    calculateDistribution(values) {
        const sorted = [...values].sort((a, b) => a - b);
        return {
            min: sorted[0] || 0,
            max: sorted[sorted.length - 1] || 0,
            median: this.calculateMedian(sorted),
            q1: this.calculatePercentile(sorted, 25),
            q3: this.calculatePercentile(sorted, 75)
        };
    }

    calculateMedian(sortedValues) {
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0
            ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
            : sortedValues[mid];
    }

    calculatePercentile(sortedValues, percentile) {
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) return sortedValues[lower];
        
        const weight = index - lower;
        return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
    }

    // Insight generation methods
    generateEngagementInsights(avgScore, stdDev) {
        const insights = [];
        
        if (avgScore > 80) {
            insights.push('High energy engagement - users are actively interacting with energy visualizations');
        } else if (avgScore < 40) {
            insights.push('Low energy engagement - consider improving energy visualization clarity');
        }
        
        if (stdDev > 20) {
            insights.push('High variability in engagement - user experience may be inconsistent');
        }
        
        return insights;
    }

    generateUsabilityInsights(avgRating, ratings) {
        const insights = [];
        
        if (avgRating >= 4) {
            insights.push('Excellent usability scores - users find the interface intuitive');
        } else if (avgRating <= 2) {
            insights.push('Poor usability scores - interface improvements needed');
        }
        
        const lowRatings = ratings.filter(r => r <= 2).length;
        if (lowRatings / ratings.length > 0.2) {
            insights.push('Significant portion of users experiencing usability issues');
        }
        
        return insights;
    }

    generatePerformanceInsights(avgFrameRate, frameRates) {
        const insights = [];
        
        if (avgFrameRate >= 58) {
            insights.push('Excellent performance - maintaining near 60Hz target');
        } else if (avgFrameRate < 45) {
            insights.push('Performance issues detected - frame rate below acceptable threshold');
        }
        
        const budgetViolations = frameRates.filter(rate => rate < 60).length;
        if (budgetViolations / frameRates.length > 0.1) {
            insights.push('Frequent 60Hz budget violations - optimization needed');
        }
        
        return insights;
    }

    // Analysis result management
    updateAnalysisResults(results) {
        const timestamp = results.timestamp;
        this.analysisResults.set(timestamp, results);
        
        // Keep only recent results (last 24 hours)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        for (const [key] of this.analysisResults) {
            if (key < cutoff) {
                this.analysisResults.delete(key);
            }
        }
    }

    detectAnomalies(results) {
        const anomalies = this.anomalyDetector.detect(results);
        if (anomalies.length > 0) {
            this.dispatchAnomalyAlert(anomalies);
        }
    }

    updateTrends(results) {
        this.trendAnalyzer.update('energy_engagement', results.energyEngagement.score);
        this.trendAnalyzer.update('usability', results.usabilityMetrics.score);
        this.trendAnalyzer.update('performance', results.performanceMetrics.score);
    }

    // Public API methods
    getLatestAnalysis() {
        const latest = Math.max(...this.analysisResults.keys());
        return this.analysisResults.get(latest);
    }

    getAnalysisHistory(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        const history = [];
        
        for (const [timestamp, results] of this.analysisResults) {
            if (timestamp >= cutoff) {
                history.push({ timestamp, ...results });
            }
        }
        
        return history.sort((a, b) => a.timestamp - b.timestamp);
    }

    generateReport(timeframe = '24h') {
        const history = this.getAnalysisHistory(24);
        
        if (history.length === 0) {
            return { error: 'No data available for report generation' };
        }

        return {
            summary: this.generateSummary(history),
            trends: this.generateTrendReport(history),
            recommendations: this.generateRecommendations(history),
            dataQuality: this.assessDataQuality(history),
            generatedAt: Date.now()
        };
    }

    generateSummary(history) {
        const latest = history[history.length - 1];
        
        return {
            energyEngagement: {
                current: latest.energyEngagement.score,
                trend: this.trendAnalyzer.getTrend('energy_engagement')
            },
            usability: {
                current: latest.usabilityMetrics.score,
                trend: this.trendAnalyzer.getTrend('usability')
            },
            performance: {
                current: latest.performanceMetrics.score,
                trend: this.trendAnalyzer.getTrend('performance')
            },
            overallHealth: this.calculateOverallHealth(latest)
        };
    }

    calculateOverallHealth(results) {
        const weights = {
            energyEngagement: 0.4,
            usability: 0.3,
            performance: 0.3
        };
        
        const score = (
            results.energyEngagement.score * weights.energyEngagement +
            results.usabilityMetrics.score * weights.usability +
            results.performanceMetrics.score * weights.performance
        );
        
        return {
            score: Math.round(score),
            status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
        };
    }

    // Event dispatching
    dispatchAnalysisResult(result) {
        document.dispatchEvent(new CustomEvent('wirthforge:analysis-complete', {
            detail: result
        }));
    }

    dispatchAnomalyAlert(anomalies) {
        document.dispatchEvent(new CustomEvent('wirthforge:anomaly-detected', {
            detail: { anomalies, timestamp: Date.now() }
        }));
    }
}

// Supporting classes
class AnomalyDetector {
    constructor() {
        this.thresholds = {
            energyEngagement: { min: 20, max: 95 },
            usability: { min: 30, max: 100 },
            performance: { min: 45, max: 100 }
        };
    }

    detect(results) {
        const anomalies = [];
        
        Object.entries(this.thresholds).forEach(([metric, threshold]) => {
            const value = results[metric]?.score;
            if (value !== undefined) {
                if (value < threshold.min) {
                    anomalies.push({
                        metric,
                        type: 'low_value',
                        value,
                        threshold: threshold.min
                    });
                } else if (value > threshold.max) {
                    anomalies.push({
                        metric,
                        type: 'high_value',
                        value,
                        threshold: threshold.max
                    });
                }
            }
        });
        
        return anomalies;
    }

    detectBehaviorAnomalies(patterns) {
        // Simplified behavior anomaly detection
        const anomalies = [];
        
        if (patterns.clickPatterns.clickRate > 0.8) {
            anomalies.push({
                type: 'excessive_clicking',
                value: patterns.clickPatterns.clickRate
            });
        }
        
        return anomalies;
    }
}

class TrendAnalyzer {
    constructor() {
        this.trends = new Map();
        this.windowSize = 10; // Number of data points for trend calculation
    }

    update(metric, value) {
        if (!this.trends.has(metric)) {
            this.trends.set(metric, []);
        }
        
        const values = this.trends.get(metric);
        values.push({ value, timestamp: Date.now() });
        
        // Keep only recent values
        if (values.length > this.windowSize) {
            values.shift();
        }
    }

    getTrend(metric) {
        const values = this.trends.get(metric);
        if (!values || values.length < 2) {
            return { direction: 'stable', strength: 0 };
        }
        
        const slope = this.calculateSlope(values);
        
        return {
            direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
            strength: Math.abs(slope),
            confidence: values.length / this.windowSize
        };
    }

    calculateSlope(values) {
        const n = values.length;
        const sumX = values.reduce((sum, _, i) => sum + i, 0);
        const sumY = values.reduce((sum, point) => sum + point.value, 0);
        const sumXY = values.reduce((sum, point, i) => sum + (i * point.value), 0);
        const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    analyzeTrend(metric, currentValue) {
        this.update(metric, currentValue);
        return this.getTrend(metric);
    }
}
