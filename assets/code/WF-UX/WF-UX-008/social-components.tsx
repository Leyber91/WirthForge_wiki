/**
 * WF-UX-008 Social Components
 * React components for WIRTHFORGE social features and community integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Share2, 
  Trophy, 
  Users, 
  MessageCircle, 
  Eye, 
  EyeOff, 
  Shield, 
  Settings,
  Award,
  Target,
  BookOpen,
  Heart
} from 'lucide-react';

// Types
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'progression' | 'efficiency' | 'collaboration' | 'creation' | 'exploration';
  level: number;
  energyReward: number;
  earnedDate: string;
  shared: boolean;
}

interface Challenge {
  challengeId: string;
  title: string;
  description: string;
  category: string;
  type: 'personal_best' | 'community_goal' | 'head_to_head';
  startDate: string;
  endDate: string;
  metrics: {
    primaryMetric: string;
    targetValue: number;
    unit: string;
  };
}

interface SocialSettings {
  participationLevel: 'anonymous' | 'pseudonymous' | 'identified';
  sharingEnabled: boolean;
  challengesEnabled: boolean;
  mentorshipEnabled: boolean;
  privacyLevel: 'minimal' | 'standard' | 'enhanced';
}

// Achievement Sharing Component
export const AchievementCard: React.FC<{
  achievement: Achievement;
  onShare?: (achievement: Achievement) => void;
  showShareButton?: boolean;
}> = ({ achievement, onShare, showShareButton = true }) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!onShare) return;
    
    setIsSharing(true);
    try {
      await onShare(achievement);
    } finally {
      setIsSharing(false);
    }
  };

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'progression': return <Trophy className="w-5 h-5" />;
      case 'efficiency': return <Target className="w-5 h-5" />;
      case 'collaboration': return <Users className="w-5 h-5" />;
      case 'creation': return <Award className="w-5 h-5" />;
      case 'exploration': return <BookOpen className="w-5 h-5" />;
      default: return <Trophy className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-blue-600">
            {getCategoryIcon(achievement.category)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {achievement.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {achievement.description}
            </p>
          </div>
        </div>
        
        {showShareButton && onShare && (
          <button
            onClick={handleShare}
            disabled={isSharing || achievement.shared}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              achievement.shared
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>
              {isSharing ? 'Sharing...' : achievement.shared ? 'Shared' : 'Share'}
            </span>
          </button>
        )}
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>Level {achievement.level}</span>
          <span>+{achievement.energyReward} EU</span>
          <span className="capitalize">{achievement.category}</span>
        </div>
        <span>{new Date(achievement.earnedDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

// Challenge Card Component
export const ChallengeCard: React.FC<{
  challenge: Challenge;
  onJoin?: (challengeId: string) => void;
  userParticipating?: boolean;
}> = ({ challenge, onJoin, userParticipating = false }) => {
  const [isJoining, setIsJoining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(challenge.endDate);
      const diff = endDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else {
        setTimeRemaining(`${hours}h remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [challenge.endDate]);

  const handleJoin = async () => {
    if (!onJoin) return;
    
    setIsJoining(true);
    try {
      await onJoin(challenge.challengeId);
    } finally {
      setIsJoining(false);
    }
  };

  const getTypeColor = (type: Challenge['type']) => {
    switch (type) {
      case 'personal_best': return 'bg-blue-100 text-blue-800';
      case 'community_goal': return 'bg-green-100 text-green-800';
      case 'head_to_head': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {challenge.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(challenge.type)}`}>
              {challenge.type.replace('_', ' ')}
            </span>
          </div>
          
          <p className="text-gray-600 mb-4">
            {challenge.description}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Target: {challenge.metrics.targetValue} {challenge.metrics.unit}</span>
            <span>{timeRemaining}</span>
          </div>
        </div>
        
        {onJoin && !userParticipating && timeRemaining !== 'Ended' && (
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Join Challenge'}
          </button>
        )}
        
        {userParticipating && (
          <div className="ml-4 px-4 py-2 bg-green-100 text-green-700 rounded-md">
            Participating
          </div>
        )}
      </div>
    </div>
  );
};

// Privacy Status Indicator
export const PrivacyStatusIndicator: React.FC<{
  settings: SocialSettings;
  onSettingsClick?: () => void;
}> = ({ settings, onSettingsClick }) => {
  const getPrivacyIcon = () => {
    switch (settings.participationLevel) {
      case 'anonymous': return <EyeOff className="w-4 h-4" />;
      case 'pseudonymous': return <Eye className="w-4 h-4" />;
      case 'identified': return <Users className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getPrivacyColor = () => {
    switch (settings.privacyLevel) {
      case 'minimal': return 'text-red-600 bg-red-100';
      case 'standard': return 'text-yellow-600 bg-yellow-100';
      case 'enhanced': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPrivacyColor()}`}>
        {getPrivacyIcon()}
        <span className="capitalize">{settings.participationLevel}</span>
      </div>
      
      <div className="text-xs text-gray-500">
        Privacy: {settings.privacyLevel}
      </div>
      
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Social Dashboard Component
export const SocialDashboard: React.FC<{
  achievements: Achievement[];
  challenges: Challenge[];
  settings: SocialSettings;
  onShareAchievement?: (achievement: Achievement) => void;
  onJoinChallenge?: (challengeId: string) => void;
  onSettingsChange?: (settings: SocialSettings) => void;
}> = ({ 
  achievements, 
  challenges, 
  settings, 
  onShareAchievement, 
  onJoinChallenge,
  onSettingsChange 
}) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'challenges' | 'community'>('achievements');
  const [showSettings, setShowSettings] = useState(false);

  const recentAchievements = achievements
    .sort((a, b) => new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime())
    .slice(0, 5);

  const activeChallenges = challenges.filter(c => new Date(c.endDate) > new Date());

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Community Dashboard
          </h2>
          <PrivacyStatusIndicator 
            settings={settings}
            onSettingsClick={() => setShowSettings(!showSettings)}
          />
        </div>
        
        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-1">
          {(['achievements', 'challenges', 'community'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Achievements
            </h3>
            {recentAchievements.length > 0 ? (
              recentAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onShare={settings.sharingEnabled ? onShareAchievement : undefined}
                  showShareButton={settings.sharingEnabled}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No achievements yet. Keep exploring to earn your first achievement!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Active Challenges
            </h3>
            {activeChallenges.length > 0 ? (
              activeChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.challengeId}
                  challenge={challenge}
                  onJoin={settings.challengesEnabled ? onJoinChallenge : undefined}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No active challenges. Check back later for new opportunities!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Community Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium">Mentorship</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Connect with experienced users or help newcomers learn.
                </p>
                <button
                  disabled={!settings.mentorshipEnabled}
                  className={`text-sm px-3 py-1 rounded ${
                    settings.mentorshipEnabled
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {settings.mentorshipEnabled ? 'Find Mentor' : 'Enable in Settings'}
                </button>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium">Community Forum</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Ask questions, share knowledge, and discuss with the community.
                </p>
                <button className="text-sm px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                  Browse Forum
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Social Settings</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Achievement Sharing
                </label>
                <p className="text-xs text-gray-500">
                  Allow sharing achievements with the community
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.sharingEnabled}
                onChange={(e) => onSettingsChange?.({
                  ...settings,
                  sharingEnabled: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Challenge Participation
                </label>
                <p className="text-xs text-gray-500">
                  Participate in community challenges
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.challengesEnabled}
                onChange={(e) => onSettingsChange?.({
                  ...settings,
                  challengesEnabled: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mentorship Features
                </label>
                <p className="text-xs text-gray-500">
                  Enable mentoring and being mentored
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.mentorshipEnabled}
                onChange={(e) => onSettingsChange?.({
                  ...settings,
                  mentorshipEnabled: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Share Confirmation Modal
export const ShareConfirmationModal: React.FC<{
  isOpen: boolean;
  achievement: Achievement | null;
  onConfirm: () => void;
  onCancel: () => void;
  platforms: string[];
}> = ({ isOpen, achievement, onConfirm, onCancel, platforms }) => {
  if (!isOpen || !achievement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <Share2 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Share Achievement</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            You are about to share:
          </p>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="font-medium">{achievement.name}</p>
            <p className="text-sm text-gray-600">+{achievement.energyReward} EU</p>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            This will be shared to:
          </p>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <p className="text-xs text-yellow-800">
            <Shield className="w-4 h-4 inline mr-1" />
            Only achievement name and energy stats will be shared. No personal information will be included.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default {
  AchievementCard,
  ChallengeCard,
  PrivacyStatusIndicator,
  SocialDashboard,
  ShareConfirmationModal
};
