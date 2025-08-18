import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventEmitter } from 'events';

// Types based on our JSON schemas
interface Level {
  levelNumber: number;
  levelName: string;
  theme: string;
  description: string;
  unlockCriteria: UnlockCriteria;
  unlockedFeatures: Feature[];
  visualElements: VisualElements;
  skillTreeNodes: SkillNode[];
}

interface UnlockCriteria {
  requiredEnergy: number;
  requiredAchievements: string[];
  requiredActions: RequiredAction[];
  levelUpCost: number;
  minimumSessionTime?: number;
}

interface RequiredAction {
  actionType: 'prompts_completed' | 'tokens_generated' | 'models_used' | 'sessions_completed' | 'feature_used';
  count: number;
  description: string;
}

interface Feature {
  featureId: string;
  featureName: string;
  category: string;
  description: string;
  dependencies?: string[];
  betaFeature?: boolean;
}

interface VisualElements {
  primaryColor: string;
  secondaryColor?: string;
  iconName: string;
  animationTheme: string;
  celebrationEffect?: string;
  backgroundPattern?: string;
}

interface SkillNode {
  nodeId: string;
  nodeName: string;
  cost: number;
  prerequisites: string[];
  category: string;
  description: string;
  unlocks: string[];
}

interface UserProgress {
  currentLevel: number;
  totalEnergy: number;
  availableEnergy: number;
  completedAchievements: string[];
  unlockedFeatures: string[];
  purchasedSkills: string[];
  sessionMetrics: SessionMetrics;
  levelProgress: LevelProgress[];
}

interface SessionMetrics {
  promptsCompleted: number;
  tokensGenerated: number;
  modelsUsed: number;
  sessionsCompleted: number;
  totalSessionTime: number;
  currentSessionTime: number;
  tokensPerSecond: number;
  efficiencyPercentage: number;
}

interface LevelProgress {
  levelNumber: number;
  isUnlocked: boolean;
  canLevelUp: boolean;
  progressPercentage: number;
  missingRequirements: string[];
}

interface ProgressionManagerProps {
  initialProgress?: Partial<UserProgress>;
  onLevelUp?: (newLevel: number) => void;
  onEnergyChange?: (energy: number) => void;
  onAchievementUnlock?: (achievementId: string) => void;
  onFeatureUnlock?: (featureId: string) => void;
  className?: string;
}

// Event emitter for cross-component communication
const progressionEvents = new EventEmitter();

export const ProgressionManager: React.FC<ProgressionManagerProps> = ({
  initialProgress = {},
  onLevelUp,
  onEnergyChange,
  onAchievementUnlock,
  onFeatureUnlock,
  className = ''
}) => {
  // State management
  const [userProgress, setUserProgress] = useState<UserProgress>({
    currentLevel: 1,
    totalEnergy: 0,
    availableEnergy: 0,
    completedAchievements: [],
    unlockedFeatures: ['single_model_chat', 'lightning_visualization', 'energy_meter'],
    purchasedSkills: [],
    sessionMetrics: {
      promptsCompleted: 0,
      tokensGenerated: 0,
      modelsUsed: 1,
      sessionsCompleted: 0,
      totalSessionTime: 0,
      currentSessionTime: 0,
      tokensPerSecond: 0,
      efficiencyPercentage: 0
    },
    levelProgress: [],
    ...initialProgress
  });

  const [levels, setLevels] = useState<Level[]>([]);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const sessionStartTime = useRef<number>(Date.now());
  const metricsUpdateInterval = useRef<NodeJS.Timeout>();

  // Load level definitions (in real app, this would come from API/config)
  useEffect(() => {
    const loadLevels = async () => {
      // Mock level data based on our schema
      const mockLevels: Level[] = [
        {
          levelNumber: 1,
          levelName: "Lightning Strikes",
          theme: "Single Model Mastery",
          description: "Master the basics of AI interaction with lightning-fast single model responses",
          unlockCriteria: {
            requiredEnergy: 0,
            requiredAchievements: [],
            requiredActions: [
              { actionType: 'prompts_completed', count: 1, description: 'Complete the tutorial prompt' }
            ],
            levelUpCost: 100,
            minimumSessionTime: 5
          },
          unlockedFeatures: [
            { featureId: 'single_model_chat', featureName: 'Single Model Chat', category: 'ui_component', description: 'Basic chat interface' },
            { featureId: 'lightning_visualization', featureName: 'Lightning Visualization', category: 'visualization', description: 'Lightning bolt animations' },
            { featureId: 'energy_meter', featureName: 'Energy Meter', category: 'ui_component', description: 'Energy display' }
          ],
          visualElements: {
            primaryColor: '#fbbf24',
            secondaryColor: '#f59e0b',
            iconName: 'lightning_bolt',
            animationTheme: 'golden_sparks',
            celebrationEffect: 'lightning_burst'
          },
          skillTreeNodes: [
            {
              nodeId: 'enhanced_lightning',
              nodeName: 'Enhanced Lightning',
              cost: 100,
              prerequisites: [],
              category: 'visualization',
              description: 'More detailed lightning animations',
              unlocks: ['advanced_lightning_viz']
            }
          ]
        },
        {
          levelNumber: 2,
          levelName: "Parallel Streams",
          theme: "Multi-Model Coordination",
          description: "Harness the power of multiple AI models working in parallel",
          unlockCriteria: {
            requiredEnergy: 100,
            requiredAchievements: ['first_strike'],
            requiredActions: [
              { actionType: 'prompts_completed', count: 5, description: 'Complete 5 prompts' },
              { actionType: 'models_used', count: 2, description: 'Use dual models' }
            ],
            levelUpCost: 500
          },
          unlockedFeatures: [
            { featureId: 'dual_models', featureName: 'Dual Models', category: 'model_control', description: 'Run two models simultaneously' },
            { featureId: 'interference_viz', featureName: 'Interference Visualization', category: 'visualization', description: 'Model disagreement patterns' }
          ],
          visualElements: {
            primaryColor: '#3b82f6',
            secondaryColor: '#1d4ed8',
            iconName: 'parallel_streams',
            animationTheme: 'flowing_streams'
          },
          skillTreeNodes: []
        }
      ];
      setLevels(mockLevels);
    };

    loadLevels();
  }, []);

  // Calculate level progress
  const calculateLevelProgress = useCallback(() => {
    const progress: LevelProgress[] = levels.map(level => {
      const criteria = level.unlockCriteria;
      const metrics = userProgress.sessionMetrics;
      
      // Check energy requirement
      const hasEnergy = userProgress.availableEnergy >= criteria.requiredEnergy;
      
      // Check achievement requirements
      const hasAchievements = criteria.requiredAchievements.every(
        achievementId => userProgress.completedAchievements.includes(achievementId)
      );
      
      // Check action requirements
      const hasActions = criteria.requiredActions.every(action => {
        switch (action.actionType) {
          case 'prompts_completed':
            return metrics.promptsCompleted >= action.count;
          case 'tokens_generated':
            return metrics.tokensGenerated >= action.count;
          case 'models_used':
            return metrics.modelsUsed >= action.count;
          case 'sessions_completed':
            return metrics.sessionsCompleted >= action.count;
          default:
            return false;
        }
      });
      
      // Check session time requirement
      const hasSessionTime = !criteria.minimumSessionTime || 
        metrics.totalSessionTime >= criteria.minimumSessionTime;
      
      const isUnlocked = level.levelNumber <= userProgress.currentLevel;
      const canLevelUp = level.levelNumber === userProgress.currentLevel + 1 && 
        hasEnergy && hasAchievements && hasActions && hasSessionTime &&
        userProgress.availableEnergy >= criteria.levelUpCost;
      
      // Calculate progress percentage
      let progressPercentage = 0;
      if (isUnlocked) {
        progressPercentage = 100;
      } else if (level.levelNumber === userProgress.currentLevel + 1) {
        const requirements = [
          hasEnergy ? 1 : userProgress.availableEnergy / criteria.requiredEnergy,
          hasAchievements ? 1 : userProgress.completedAchievements.length / Math.max(1, criteria.requiredAchievements.length),
          hasActions ? 1 : 0.5, // Simplified calculation
          hasSessionTime ? 1 : (metrics.totalSessionTime / (criteria.minimumSessionTime || 1))
        ];
        progressPercentage = Math.min(100, (requirements.reduce((a, b) => a + b, 0) / requirements.length) * 100);
      }
      
      // Collect missing requirements
      const missingRequirements: string[] = [];
      if (!hasEnergy) missingRequirements.push(`Need ${criteria.requiredEnergy - userProgress.availableEnergy} more EU`);
      if (!hasAchievements) missingRequirements.push('Missing required achievements');
      if (!hasActions) missingRequirements.push('Complete required actions');
      if (!hasSessionTime) missingRequirements.push('More session time needed');
      
      return {
        levelNumber: level.levelNumber,
        isUnlocked,
        canLevelUp,
        progressPercentage,
        missingRequirements
      };
    });
    
    setUserProgress(prev => ({ ...prev, levelProgress: progress }));
  }, [levels, userProgress.availableEnergy, userProgress.completedAchievements, userProgress.sessionMetrics, userProgress.currentLevel]);

  // Update session metrics
  useEffect(() => {
    const updateMetrics = () => {
      const currentTime = Date.now();
      const sessionDuration = Math.floor((currentTime - sessionStartTime.current) / 1000 / 60); // minutes
      
      setUserProgress(prev => ({
        ...prev,
        sessionMetrics: {
          ...prev.sessionMetrics,
          currentSessionTime: sessionDuration,
          totalSessionTime: prev.sessionMetrics.totalSessionTime + (sessionDuration > prev.sessionMetrics.currentSessionTime ? 1 : 0)
        }
      }));
    };

    metricsUpdateInterval.current = setInterval(updateMetrics, 60000); // Update every minute
    
    return () => {
      if (metricsUpdateInterval.current) {
        clearInterval(metricsUpdateInterval.current);
      }
    };
  }, []);

  // Recalculate progress when dependencies change
  useEffect(() => {
    if (levels.length > 0) {
      calculateLevelProgress();
    }
  }, [calculateLevelProgress, levels.length]);

  // Award energy
  const awardEnergy = useCallback((amount: number, source: string) => {
    setUserProgress(prev => {
      const newTotal = prev.totalEnergy + amount;
      const newAvailable = prev.availableEnergy + amount;
      
      // Emit energy change event
      progressionEvents.emit('energyAwarded', { amount, source, newTotal });
      onEnergyChange?.(newTotal);
      
      return {
        ...prev,
        totalEnergy: newTotal,
        availableEnergy: newAvailable
      };
    });
  }, [onEnergyChange]);

  // Spend energy
  const spendEnergy = useCallback((amount: number, purpose: string): boolean => {
    if (userProgress.availableEnergy < amount) {
      return false;
    }
    
    setUserProgress(prev => {
      const newAvailable = prev.availableEnergy - amount;
      
      progressionEvents.emit('energySpent', { amount, purpose, remaining: newAvailable });
      onEnergyChange?.(prev.totalEnergy);
      
      return {
        ...prev,
        availableEnergy: newAvailable
      };
    });
    
    return true;
  }, [userProgress.availableEnergy, onEnergyChange]);

  // Level up function
  const levelUp = useCallback(async (targetLevel: number) => {
    const levelData = levels.find(l => l.levelNumber === targetLevel);
    if (!levelData) return false;
    
    const canLevel = userProgress.levelProgress.find(p => p.levelNumber === targetLevel)?.canLevelUp;
    if (!canLevel) return false;
    
    setIsLevelingUp(true);
    
    try {
      // Spend energy for level up
      const success = spendEnergy(levelData.unlockCriteria.levelUpCost, `Level ${targetLevel} upgrade`);
      if (!success) {
        setIsLevelingUp(false);
        return false;
      }
      
      // Update level and unlock features
      setUserProgress(prev => ({
        ...prev,
        currentLevel: targetLevel,
        unlockedFeatures: [...prev.unlockedFeatures, ...levelData.unlockedFeatures.map(f => f.featureId)]
      }));
      
      // Emit events
      progressionEvents.emit('levelUp', { newLevel: targetLevel, levelData });
      onLevelUp?.(targetLevel);
      
      // Unlock features
      levelData.unlockedFeatures.forEach(feature => {
        progressionEvents.emit('featureUnlocked', feature);
        onFeatureUnlock?.(feature.featureId);
      });
      
      return true;
    } finally {
      setIsLevelingUp(false);
    }
  }, [levels, userProgress.levelProgress, spendEnergy, onLevelUp, onFeatureUnlock]);

  // Update session metrics (called by external components)
  const updateSessionMetrics = useCallback((updates: Partial<SessionMetrics>) => {
    setUserProgress(prev => ({
      ...prev,
      sessionMetrics: {
        ...prev.sessionMetrics,
        ...updates
      }
    }));
  }, []);

  // Purchase skill node
  const purchaseSkill = useCallback((nodeId: string): boolean => {
    const currentLevel = levels.find(l => l.levelNumber === userProgress.currentLevel);
    const skillNode = currentLevel?.skillTreeNodes.find(n => n.nodeId === nodeId);
    
    if (!skillNode) return false;
    
    // Check prerequisites
    const hasPrerequisites = skillNode.prerequisites.every(prereq => 
      userProgress.purchasedSkills.includes(prereq)
    );
    
    if (!hasPrerequisites || userProgress.availableEnergy < skillNode.cost) {
      return false;
    }
    
    const success = spendEnergy(skillNode.cost, `Skill: ${skillNode.nodeName}`);
    if (!success) return false;
    
    setUserProgress(prev => ({
      ...prev,
      purchasedSkills: [...prev.purchasedSkills, nodeId],
      unlockedFeatures: [...prev.unlockedFeatures, ...skillNode.unlocks]
    }));
    
    // Unlock features from skill
    skillNode.unlocks.forEach(featureId => {
      progressionEvents.emit('featureUnlocked', { featureId });
      onFeatureUnlock?.(featureId);
    });
    
    return true;
  }, [levels, userProgress.currentLevel, userProgress.purchasedSkills, userProgress.availableEnergy, spendEnergy, onFeatureUnlock]);

  // Expose methods for external use
  const progressionAPI = {
    awardEnergy,
    spendEnergy,
    levelUp,
    updateSessionMetrics,
    purchaseSkill,
    getUserProgress: () => userProgress,
    getLevels: () => levels,
    events: progressionEvents
  };

  // Store API in window for global access (development only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).progressionManager = progressionAPI;
    }
  }, [progressionAPI]);

  return (
    <div className={`progression-manager ${className}`} data-testid="progression-manager">
      {/* Level Progress Display */}
      <div className="level-progress-container">
        <div className="current-level">
          <span className="level-number">{userProgress.currentLevel}</span>
          <span className="level-name">
            {levels.find(l => l.levelNumber === userProgress.currentLevel)?.levelName || 'Loading...'}
          </span>
        </div>
        
        {/* Energy Display */}
        <div className="energy-display">
          <span className="energy-amount">{userProgress.availableEnergy}</span>
          <span className="energy-label">EU Available</span>
          <span className="energy-total">({userProgress.totalEnergy} Total)</span>
        </div>
        
        {/* Next Level Progress */}
        {userProgress.levelProgress.find(p => p.levelNumber === userProgress.currentLevel + 1) && (
          <div className="next-level-progress">
            {(() => {
              const nextLevel = userProgress.levelProgress.find(p => p.levelNumber === userProgress.currentLevel + 1)!;
              return (
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${nextLevel.progressPercentage}%` }}
                    />
                  </div>
                  <div className="progress-info">
                    <span>Next Level: {nextLevel.progressPercentage.toFixed(1)}%</span>
                    {nextLevel.canLevelUp && (
                      <button 
                        onClick={() => levelUp(nextLevel.levelNumber)}
                        disabled={isLevelingUp}
                        className="level-up-button"
                      >
                        {isLevelingUp ? 'Leveling Up...' : 'Level Up!'}
                      </button>
                    )}
                  </div>
                  {nextLevel.missingRequirements.length > 0 && (
                    <div className="missing-requirements">
                      {nextLevel.missingRequirements.map((req, index) => (
                        <span key={index} className="requirement">{req}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      
      {/* Session Metrics */}
      <div className="session-metrics">
        <div className="metric">
          <span className="metric-value">{userProgress.sessionMetrics.tokensGenerated}</span>
          <span className="metric-label">Tokens</span>
        </div>
        <div className="metric">
          <span className="metric-value">{userProgress.sessionMetrics.tokensPerSecond.toFixed(1)}</span>
          <span className="metric-label">TPS</span>
        </div>
        <div className="metric">
          <span className="metric-value">{userProgress.sessionMetrics.efficiencyPercentage.toFixed(1)}%</span>
          <span className="metric-label">Efficiency</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressionManager;

// Export types and API for external use
export type { 
  UserProgress, 
  Level, 
  SessionMetrics, 
  LevelProgress, 
  ProgressionManagerProps 
};

export { progressionEvents };
