import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { progressionEvents } from './WF-UX-002-progression-manager';

// Achievement types based on our JSON schema
interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: 'performance' | 'efficiency' | 'feature_mastery' | 'milestone' | 'community' | 'discovery';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  energyReward: number;
  unlockCriteria: UnlockCriteria;
  prerequisites: string[];
  levelRequirement: number;
  isSecret: boolean;
  visualElements: AchievementVisuals;
  progressTracking: ProgressTracking;
}

interface UnlockCriteria {
  metricType: string;
  targetValue: number;
  timeframe: 'single_session' | 'daily' | 'weekly' | 'monthly' | 'lifetime';
  conditions?: Condition[];
  streakRequired?: number;
}

interface Condition {
  conditionType: 'minimum_value' | 'maximum_value' | 'exact_value' | 'feature_enabled' | 'level_requirement';
  parameter: string;
  value: string | number | boolean;
}

interface AchievementVisuals {
  iconName: string;
  primaryColor: string;
  secondaryColor?: string;
  badgeShape: 'circle' | 'hexagon' | 'star' | 'shield' | 'crown';
  animationEffect?: string;
  glowEffect?: boolean;
}

interface ProgressTracking {
  showProgress: boolean;
  progressFormat: 'percentage' | 'fraction' | 'count' | 'time';
  milestones?: Array<{
    percentage: number;
    message: string;
  }>;
}

interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  canUnlock: boolean;
  nextMilestone?: string;
}

interface AchievementTrackerProps {
  onAchievementUnlock?: (achievement: Achievement) => void;
  onProgressUpdate?: (progress: AchievementProgress[]) => void;
  showSecretAchievements?: boolean;
  filterByCategory?: string[];
  className?: string;
}

export const AchievementTracker: React.FC<AchievementTrackerProps> = ({
  onAchievementUnlock,
  onProgressUpdate,
  showSecretAchievements = false,
  filterByCategory = [],
  className = ''
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<any>({});
  const [userLevel, setUserLevel] = useState(1);
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);

  // Load achievements data
  useEffect(() => {
    const loadAchievements = async () => {
      // Mock achievement data based on our schema
      const mockAchievements: Achievement[] = [
        {
          achievementId: 'first_strike',
          name: 'First Strike',
          description: 'Complete your first prompt and witness the lightning',
          category: 'milestone',
          rarity: 'bronze',
          energyReward: 50,
          unlockCriteria: {
            metricType: 'prompts_completed',
            targetValue: 1,
            timeframe: 'lifetime'
          },
          prerequisites: [],
          levelRequirement: 1,
          isSecret: false,
          visualElements: {
            iconName: 'lightning_bolt',
            primaryColor: '#fbbf24',
            secondaryColor: '#f59e0b',
            badgeShape: 'circle',
            animationEffect: 'lightning_flash',
            glowEffect: true
          },
          progressTracking: {
            showProgress: true,
            progressFormat: 'fraction',
            milestones: [
              { percentage: 100, message: 'Lightning strikes! You\'ve completed your first prompt!' }
            ]
          }
        },
        {
          achievementId: 'speed_demon_1',
          name: 'Speed Demon I',
          description: 'Sustain 10 tokens per second for at least 30 seconds',
          category: 'performance',
          rarity: 'bronze',
          energyReward: 25,
          unlockCriteria: {
            metricType: 'tokens_per_second',
            targetValue: 10,
            timeframe: 'single_session',
            conditions: [
              { conditionType: 'minimum_value', parameter: 'sustained_duration_seconds', value: 30 }
            ]
          },
          prerequisites: ['first_strike'],
          levelRequirement: 1,
          isSecret: false,
          visualElements: {
            iconName: 'speedometer',
            primaryColor: '#ef4444',
            secondaryColor: '#dc2626',
            badgeShape: 'hexagon',
            animationEffect: 'speed_burst'
          },
          progressTracking: {
            showProgress: true,
            progressFormat: 'time',
            milestones: [
              { percentage: 33, message: 'Building speed...' },
              { percentage: 66, message: 'Almost there!' },
              { percentage: 100, message: 'Speed demon unleashed!' }
            ]
          }
        },
        {
          achievementId: 'council_initiate',
          name: 'Council Initiate',
          description: 'Run your first parallel session with multiple AI models',
          category: 'feature_mastery',
          rarity: 'silver',
          energyReward: 75,
          unlockCriteria: {
            metricType: 'models_used_simultaneously',
            targetValue: 2,
            timeframe: 'single_session'
          },
          prerequisites: ['first_strike'],
          levelRequirement: 2,
          isSecret: false,
          visualElements: {
            iconName: 'council_table',
            primaryColor: '#3b82f6',
            secondaryColor: '#1d4ed8',
            badgeShape: 'shield',
            animationEffect: 'council_assembly',
            glowEffect: true
          },
          progressTracking: {
            showProgress: true,
            progressFormat: 'count'
          }
        },
        {
          achievementId: 'efficiency_expert',
          name: 'Efficiency Expert',
          description: 'Maintain 95% efficiency for an entire session',
          category: 'efficiency',
          rarity: 'gold',
          energyReward: 150,
          unlockCriteria: {
            metricType: 'efficiency_percentage',
            targetValue: 95,
            timeframe: 'single_session'
          },
          prerequisites: ['speed_demon_1'],
          levelRequirement: 3,
          isSecret: false,
          visualElements: {
            iconName: 'efficiency_gauge',
            primaryColor: '#10b981',
            secondaryColor: '#059669',
            badgeShape: 'star',
            animationEffect: 'efficiency_glow'
          },
          progressTracking: {
            showProgress: true,
            progressFormat: 'percentage'
          }
        },
        {
          achievementId: 'hidden_feature_finder',
          name: 'Hidden Feature Finder',
          description: 'Discover a secret feature through experimentation',
          category: 'discovery',
          rarity: 'platinum',
          energyReward: 200,
          unlockCriteria: {
            metricType: 'feature_usage',
            targetValue: 1,
            timeframe: 'lifetime'
          },
          prerequisites: [],
          levelRequirement: 1,
          isSecret: true,
          visualElements: {
            iconName: 'magnifying_glass',
            primaryColor: '#8b5cf6',
            secondaryColor: '#7c3aed',
            badgeShape: 'crown',
            animationEffect: 'mystery_reveal',
            glowEffect: true
          },
          progressTracking: {
            showProgress: false,
            progressFormat: 'count'
          }
        }
      ];
      
      setAchievements(mockAchievements);
    };

    loadAchievements();
  }, []);

  // Filter achievements based on props
  const filteredAchievements = useMemo(() => {
    return achievements.filter(achievement => {
      // Filter out secret achievements if not showing them
      if (achievement.isSecret && !showSecretAchievements && !unlockedAchievements.includes(achievement.achievementId)) {
        return false;
      }
      
      // Filter by category if specified
      if (filterByCategory.length > 0 && !filterByCategory.includes(achievement.category)) {
        return false;
      }
      
      return true;
    });
  }, [achievements, showSecretAchievements, unlockedAchievements, filterByCategory]);

  // Calculate achievement progress
  const calculateProgress = useCallback((achievement: Achievement): AchievementProgress => {
    const { unlockCriteria } = achievement;
    let currentValue = 0;
    let canUnlock = true;
    
    // Check level requirement
    if (userLevel < achievement.levelRequirement) {
      canUnlock = false;
    }
    
    // Check prerequisites
    const hasPrerequisites = achievement.prerequisites.every(prereq => 
      unlockedAchievements.includes(prereq)
    );
    if (!hasPrerequisites) {
      canUnlock = false;
    }
    
    // Calculate current value based on metric type
    switch (unlockCriteria.metricType) {
      case 'prompts_completed':
        currentValue = sessionMetrics.promptsCompleted || 0;
        break;
      case 'tokens_generated':
        currentValue = sessionMetrics.tokensGenerated || 0;
        break;
      case 'tokens_per_second':
        currentValue = sessionMetrics.tokensPerSecond || 0;
        break;
      case 'models_used_simultaneously':
        currentValue = sessionMetrics.modelsUsed || 1;
        break;
      case 'efficiency_percentage':
        currentValue = sessionMetrics.efficiencyPercentage || 0;
        break;
      case 'session_duration':
        currentValue = sessionMetrics.currentSessionTime || 0;
        break;
      case 'feature_usage':
        // This would be tracked separately in a real implementation
        currentValue = 0;
        break;
      default:
        currentValue = 0;
    }
    
    // Check additional conditions
    if (unlockCriteria.conditions) {
      for (const condition of unlockCriteria.conditions) {
        switch (condition.conditionType) {
          case 'minimum_value':
            if (sessionMetrics[condition.parameter] < condition.value) {
              canUnlock = false;
            }
            break;
          case 'feature_enabled':
            // This would check if a feature is enabled
            break;
        }
      }
    }
    
    const progressPercentage = Math.min(100, (currentValue / unlockCriteria.targetValue) * 100);
    const isUnlocked = unlockedAchievements.includes(achievement.achievementId);
    
    // Determine next milestone
    let nextMilestone: string | undefined;
    if (achievement.progressTracking.milestones && !isUnlocked) {
      const nextMilestoneData = achievement.progressTracking.milestones.find(
        milestone => progressPercentage < milestone.percentage
      );
      nextMilestone = nextMilestoneData?.message;
    }
    
    return {
      achievementId: achievement.achievementId,
      currentValue,
      targetValue: unlockCriteria.targetValue,
      progressPercentage,
      isUnlocked,
      canUnlock: canUnlock && currentValue >= unlockCriteria.targetValue && !isUnlocked,
      nextMilestone
    };
  }, [sessionMetrics, userLevel, unlockedAchievements]);

  // Update progress for all achievements
  useEffect(() => {
    const newProgress = filteredAchievements.map(calculateProgress);
    setAchievementProgress(newProgress);
    onProgressUpdate?.(newProgress);
  }, [filteredAchievements, calculateProgress, onProgressUpdate]);

  // Check for newly unlocked achievements
  useEffect(() => {
    const newlyUnlocked = achievementProgress.filter(progress => 
      progress.canUnlock && !unlockedAchievements.includes(progress.achievementId)
    );
    
    if (newlyUnlocked.length > 0) {
      const newUnlockedIds = newlyUnlocked.map(p => p.achievementId);
      setUnlockedAchievements(prev => [...prev, ...newUnlockedIds]);
      
      // Trigger unlock events
      newlyUnlocked.forEach(progress => {
        const achievement = achievements.find(a => a.achievementId === progress.achievementId);
        if (achievement) {
          setRecentUnlocks(prev => [achievement, ...prev.slice(0, 4)]); // Keep last 5
          onAchievementUnlock?.(achievement);
          
          // Award energy through progression manager
          progressionEvents.emit('awardEnergy', {
            amount: achievement.energyReward,
            source: `Achievement: ${achievement.name}`
          });
        }
      });
    }
  }, [achievementProgress, unlockedAchievements, achievements, onAchievementUnlock]);

  // Listen to progression events
  useEffect(() => {
    const handleMetricsUpdate = (metrics: any) => {
      setSessionMetrics(metrics);
    };
    
    const handleLevelUp = (data: any) => {
      setUserLevel(data.newLevel);
    };
    
    progressionEvents.on('metricsUpdate', handleMetricsUpdate);
    progressionEvents.on('levelUp', handleLevelUp);
    
    return () => {
      progressionEvents.off('metricsUpdate', handleMetricsUpdate);
      progressionEvents.off('levelUp', handleLevelUp);
    };
  }, []);

  // Format progress value based on tracking format
  const formatProgressValue = (achievement: Achievement, progress: AchievementProgress): string => {
    const { progressFormat } = achievement.progressTracking;
    
    switch (progressFormat) {
      case 'percentage':
        return `${progress.progressPercentage.toFixed(1)}%`;
      case 'fraction':
        return `${progress.currentValue}/${progress.targetValue}`;
      case 'count':
        return `${progress.currentValue}`;
      case 'time':
        return `${Math.floor(progress.currentValue)}s`;
      default:
        return `${progress.currentValue}`;
    }
  };

  // Get rarity color
  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
      case 'legendary': return '#ff6347';
      default: return '#6b7280';
    }
  };

  return (
    <div className={`achievement-tracker ${className}`} data-testid="achievement-tracker">
      {/* Recent Unlocks Banner */}
      {recentUnlocks.length > 0 && (
        <div className="recent-unlocks-banner">
          <h3>Recent Achievements</h3>
          <div className="recent-unlocks-list">
            {recentUnlocks.slice(0, 3).map(achievement => (
              <div key={achievement.achievementId} className="recent-unlock">
                <div 
                  className="achievement-badge recent"
                  style={{ 
                    backgroundColor: achievement.visualElements.primaryColor,
                    borderColor: achievement.visualElements.secondaryColor 
                  }}
                >
                  <span className="achievement-icon">{achievement.visualElements.iconName}</span>
                </div>
                <div className="achievement-info">
                  <span className="achievement-name">{achievement.name}</span>
                  <span className="energy-reward">+{achievement.energyReward} EU</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Categories */}
      <div className="achievement-categories">
        {['performance', 'efficiency', 'feature_mastery', 'milestone', 'community', 'discovery'].map(category => {
          const categoryAchievements = filteredAchievements.filter(a => a.category === category);
          if (categoryAchievements.length === 0) return null;
          
          return (
            <div key={category} className="achievement-category">
              <h4 className="category-title">
                {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                <span className="category-count">
                  {categoryAchievements.filter(a => unlockedAchievements.includes(a.achievementId)).length}/
                  {categoryAchievements.length}
                </span>
              </h4>
              
              <div className="achievements-grid">
                {categoryAchievements.map(achievement => {
                  const progress = achievementProgress.find(p => p.achievementId === achievement.achievementId);
                  if (!progress) return null;
                  
                  return (
                    <div 
                      key={achievement.achievementId} 
                      className={`achievement-card ${progress.isUnlocked ? 'unlocked' : ''} ${progress.canUnlock ? 'can-unlock' : ''}`}
                      data-rarity={achievement.rarity}
                    >
                      <div 
                        className="achievement-badge"
                        style={{ 
                          backgroundColor: progress.isUnlocked ? achievement.visualElements.primaryColor : '#6b7280',
                          borderColor: getRarityColor(achievement.rarity)
                        }}
                      >
                        <span className="achievement-icon">{achievement.visualElements.iconName}</span>
                        {achievement.visualElements.glowEffect && progress.isUnlocked && (
                          <div className="glow-effect" />
                        )}
                      </div>
                      
                      <div className="achievement-details">
                        <div className="achievement-header">
                          <h5 className="achievement-name">{achievement.name}</h5>
                          <span className={`rarity-badge ${achievement.rarity}`}>
                            {achievement.rarity}
                          </span>
                        </div>
                        
                        <p className="achievement-description">{achievement.description}</p>
                        
                        {achievement.progressTracking.showProgress && !progress.isUnlocked && (
                          <div className="progress-container">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ 
                                  width: `${progress.progressPercentage}%`,
                                  backgroundColor: achievement.visualElements.primaryColor
                                }}
                              />
                            </div>
                            <div className="progress-text">
                              <span>{formatProgressValue(achievement, progress)}</span>
                              {progress.nextMilestone && (
                                <span className="next-milestone">{progress.nextMilestone}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="achievement-footer">
                          <span className="energy-reward">+{achievement.energyReward} EU</span>
                          {progress.isUnlocked && (
                            <span className="unlock-date">Unlocked!</span>
                          )}
                          {progress.canUnlock && (
                            <span className="can-unlock">Ready to unlock!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Achievement Statistics */}
      <div className="achievement-stats">
        <div className="stat">
          <span className="stat-value">{unlockedAchievements.length}</span>
          <span className="stat-label">Unlocked</span>
        </div>
        <div className="stat">
          <span className="stat-value">{achievements.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {achievements.reduce((total, a) => 
              unlockedAchievements.includes(a.achievementId) ? total + a.energyReward : total, 0
            )}
          </span>
          <span className="stat-label">EU Earned</span>
        </div>
      </div>
    </div>
  );
};

export default AchievementTracker;

// Export types for external use
export type { 
  Achievement, 
  AchievementProgress, 
  AchievementTrackerProps 
};
