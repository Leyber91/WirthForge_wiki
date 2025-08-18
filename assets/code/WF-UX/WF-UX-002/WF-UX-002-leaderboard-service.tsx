import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { progressionEvents } from './WF-UX-002-progression-manager';

// Leaderboard types
interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  level: number;
  totalEnergy: number;
  achievements: string[];
  performanceMetrics: PerformanceMetrics;
  lastActive: Date;
  rank: number;
  isCurrentUser?: boolean;
}

interface PerformanceMetrics {
  averageTokensPerSecond: number;
  averageEfficiency: number;
  totalTokensGenerated: number;
  totalSessionTime: number;
  longestStreak: number;
  perfectSessions: number;
  modelsUsed: number;
  chainsCreated: number;
}

interface LeaderboardFilter {
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time';
  category: 'overall' | 'speed' | 'efficiency' | 'achievements' | 'level';
  levelRange?: [number, number];
  minLevel?: number;
}

interface LeaderboardServiceProps {
  currentUserId: string;
  showUserRank?: boolean;
  entriesPerPage?: number;
  enableFilters?: boolean;
  enableSearch?: boolean;
  enableOptOut?: boolean;
  className?: string;
  onRankChange?: (newRank: number) => void;
}

// Mock data generator for development
const generateMockLeaderboardData = (currentUserId: string): LeaderboardEntry[] => {
  const usernames = [
    'LightningMaster', 'QuantumCoder', 'AIWhisperer', 'TokenRacer', 'EfficiencyGuru',
    'CouncilLord', 'ChainArchitect', 'ResonanceKing', 'SpeedDemon', 'WirthForgeHero',
    'ModelMaestro', 'EnergyAdept', 'ProgressPioneer', 'AchievementHunter', 'PerformancePro'
  ];

  return usernames.map((username, index) => {
    const isCurrentUser = username === 'CurrentUser' || index === 0;
    const userId = isCurrentUser ? currentUserId : `user_${index}`;
    
    // Generate realistic but varied metrics
    const level = Math.max(1, Math.min(5, Math.floor(Math.random() * 6) + (isCurrentUser ? 2 : 0)));
    const totalEnergy = Math.floor(Math.random() * 10000) + level * 500;
    const achievementCount = Math.floor(Math.random() * 20) + level * 3;
    
    return {
      userId,
      username: isCurrentUser ? 'You' : username,
      displayName: isCurrentUser ? 'You' : username,
      level,
      totalEnergy,
      achievements: Array.from({ length: achievementCount }, (_, i) => `achievement_${i}`),
      performanceMetrics: {
        averageTokensPerSecond: Math.random() * 50 + 5,
        averageEfficiency: Math.random() * 30 + 70,
        totalTokensGenerated: Math.floor(Math.random() * 100000) + 1000,
        totalSessionTime: Math.floor(Math.random() * 500) + 50,
        longestStreak: Math.floor(Math.random() * 30) + 1,
        perfectSessions: Math.floor(Math.random() * 10),
        modelsUsed: Math.min(level + 1, Math.floor(Math.random() * 5) + 1),
        chainsCreated: level >= 3 ? Math.floor(Math.random() * 20) : 0
      },
      lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      rank: 0, // Will be calculated
      isCurrentUser
    };
  });
};

export const LeaderboardService: React.FC<LeaderboardServiceProps> = ({
  currentUserId,
  showUserRank = true,
  entriesPerPage = 10,
  enableFilters = true,
  enableSearch = true,
  enableOptOut = true,
  className = '',
  onRankChange
}) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<LeaderboardFilter>({
    timeframe: 'weekly',
    category: 'overall'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isOptedIn, setIsOptedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Load initial leaderboard data
  useEffect(() => {
    const loadLeaderboardData = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would be an API call
        const mockData = generateMockLeaderboardData(currentUserId);
        setLeaderboardData(mockData);
        setLastUpdateTime(new Date());
      } catch (error) {
        console.error('Failed to load leaderboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboardData();
  }, [currentUserId]);

  // Sort and rank leaderboard entries
  const sortedAndRankedData = useMemo(() => {
    let sortedData = [...leaderboardData];

    // Apply sorting based on category
    switch (filter.category) {
      case 'overall':
        sortedData.sort((a, b) => {
          // Composite score: level weight + energy + achievements
          const scoreA = a.level * 1000 + a.totalEnergy + a.achievements.length * 50;
          const scoreB = b.level * 1000 + b.totalEnergy + b.achievements.length * 50;
          return scoreB - scoreA;
        });
        break;
      case 'speed':
        sortedData.sort((a, b) => b.performanceMetrics.averageTokensPerSecond - a.performanceMetrics.averageTokensPerSecond);
        break;
      case 'efficiency':
        sortedData.sort((a, b) => b.performanceMetrics.averageEfficiency - a.performanceMetrics.averageEfficiency);
        break;
      case 'achievements':
        sortedData.sort((a, b) => b.achievements.length - a.achievements.length);
        break;
      case 'level':
        sortedData.sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return b.totalEnergy - a.totalEnergy; // Tiebreaker
        });
        break;
    }

    // Apply level filter
    if (filter.levelRange) {
      sortedData = sortedData.filter(entry => 
        entry.level >= filter.levelRange![0] && entry.level <= filter.levelRange![1]
      );
    }
    if (filter.minLevel) {
      sortedData = sortedData.filter(entry => entry.level >= filter.minLevel!);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      sortedData = sortedData.filter(entry =>
        entry.username.toLowerCase().includes(query) ||
        entry.displayName.toLowerCase().includes(query)
      );
    }

    // Assign ranks
    return sortedData.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }, [leaderboardData, filter, searchQuery]);

  // Get current user's rank
  const currentUserRank = useMemo(() => {
    const userEntry = sortedAndRankedData.find(entry => entry.isCurrentUser);
    return userEntry?.rank || null;
  }, [sortedAndRankedData]);

  // Notify rank changes
  useEffect(() => {
    if (currentUserRank && onRankChange) {
      onRankChange(currentUserRank);
    }
  }, [currentUserRank, onRankChange]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    return sortedAndRankedData.slice(startIndex, endIndex);
  }, [sortedAndRankedData, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(sortedAndRankedData.length / entriesPerPage);

  // Update user's own data when progression events occur
  useEffect(() => {
    const handleProgressUpdate = (data: any) => {
      setLeaderboardData(prev => prev.map(entry => {
        if (entry.isCurrentUser) {
          return {
            ...entry,
            level: data.level || entry.level,
            totalEnergy: data.totalEnergy || entry.totalEnergy,
            achievements: data.achievements || entry.achievements,
            performanceMetrics: {
              ...entry.performanceMetrics,
              ...data.metrics
            },
            lastActive: new Date()
          };
        }
        return entry;
      }));
    };

    progressionEvents.on('userProgressUpdate', handleProgressUpdate);
    return () => progressionEvents.off('userProgressUpdate', handleProgressUpdate);
  }, []);

  // Refresh leaderboard data
  const refreshLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData = generateMockLeaderboardData(currentUserId);
      setLeaderboardData(mockData);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Get rank change indicator
  const getRankChangeIndicator = (entry: LeaderboardEntry): string => {
    // In a real implementation, this would compare with previous rankings
    const change = Math.floor(Math.random() * 6) - 3; // -3 to +3
    if (change > 0) return `↑${change}`;
    if (change < 0) return `↓${Math.abs(change)}`;
    return '—';
  };

  // Get category display value
  const getCategoryDisplayValue = (entry: LeaderboardEntry): string => {
    switch (filter.category) {
      case 'overall':
        return `${entry.level * 1000 + entry.totalEnergy + entry.achievements.length * 50}`;
      case 'speed':
        return `${entry.performanceMetrics.averageTokensPerSecond.toFixed(1)} TPS`;
      case 'efficiency':
        return `${entry.performanceMetrics.averageEfficiency.toFixed(1)}%`;
      case 'achievements':
        return `${entry.achievements.length}`;
      case 'level':
        return `Level ${entry.level}`;
      default:
        return '';
    }
  };

  // Opt out of leaderboard
  const handleOptOut = useCallback(() => {
    setIsOptedIn(false);
    // In real implementation, this would update user preferences
  }, []);

  if (!isOptedIn) {
    return (
      <div className={`leaderboard-service opted-out ${className}`}>
        <div className="opt-out-message">
          <h3>Leaderboard Disabled</h3>
          <p>You have opted out of leaderboard participation.</p>
          <button onClick={() => setIsOptedIn(true)} className="opt-in-button">
            Rejoin Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`leaderboard-service ${className}`} data-testid="leaderboard-service">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-title">
          <h2>Leaderboard</h2>
          <span className="last-updated">
            Updated {lastUpdateTime.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={refreshLeaderboard} 
            disabled={isLoading}
            className="refresh-button"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {enableOptOut && (
            <button onClick={handleOptOut} className="opt-out-button">
              Opt Out
            </button>
          )}
        </div>
      </div>

      {/* Current User Rank Display */}
      {showUserRank && currentUserRank && (
        <div className="user-rank-display">
          <div className="rank-badge">
            <span className="rank-number">#{currentUserRank}</span>
            <span className="rank-label">Your Rank</span>
          </div>
          <div className="rank-details">
            <span>in {filter.category} ({filter.timeframe})</span>
          </div>
        </div>
      )}

      {/* Filters */}
      {enableFilters && (
        <div className="leaderboard-filters">
          <div className="filter-group">
            <label>Timeframe:</label>
            <select 
              value={filter.timeframe} 
              onChange={(e) => setFilter(prev => ({ ...prev, timeframe: e.target.value as any }))}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={filter.category} 
              onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value as any }))}
            >
              <option value="overall">Overall</option>
              <option value="speed">Speed</option>
              <option value="efficiency">Efficiency</option>
              <option value="achievements">Achievements</option>
              <option value="level">Level</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Min Level:</label>
            <select 
              value={filter.minLevel || ''} 
              onChange={(e) => setFilter(prev => ({ 
                ...prev, 
                minLevel: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
            >
              <option value="">All Levels</option>
              <option value="1">Level 1+</option>
              <option value="2">Level 2+</option>
              <option value="3">Level 3+</option>
              <option value="4">Level 4+</option>
              <option value="5">Level 5</option>
            </select>
          </div>
        </div>
      )}

      {/* Search */}
      {enableSearch && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="leaderboard-table">
        <div className="table-header">
          <div className="header-cell rank">Rank</div>
          <div className="header-cell user">User</div>
          <div className="header-cell level">Level</div>
          <div className="header-cell metric">
            {filter.category === 'overall' ? 'Score' : 
             filter.category === 'speed' ? 'Speed' :
             filter.category === 'efficiency' ? 'Efficiency' :
             filter.category === 'achievements' ? 'Achievements' : 'Level'}
          </div>
          <div className="header-cell change">Change</div>
          <div className="header-cell active">Last Active</div>
        </div>
        
        <div className="table-body">
          {paginatedData.map((entry) => (
            <div 
              key={entry.userId} 
              className={`table-row ${entry.isCurrentUser ? 'current-user' : ''}`}
            >
              <div className="cell rank">
                <span className="rank-number">#{entry.rank}</span>
                {entry.rank <= 3 && (
                  <span className={`medal medal-${entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'}`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>
              
              <div className="cell user">
                <div className="user-info">
                  <span className="username">{entry.displayName}</span>
                  {entry.isCurrentUser && <span className="you-badge">You</span>}
                </div>
              </div>
              
              <div className="cell level">
                <span className={`level-badge level-${entry.level}`}>
                  Level {entry.level}
                </span>
              </div>
              
              <div className="cell metric">
                <span className="metric-value">
                  {getCategoryDisplayValue(entry)}
                </span>
              </div>
              
              <div className="cell change">
                <span className={`rank-change ${getRankChangeIndicator(entry).startsWith('↑') ? 'up' : 
                  getRankChangeIndicator(entry).startsWith('↓') ? 'down' : 'same'}`}>
                  {getRankChangeIndicator(entry)}
                </span>
              </div>
              
              <div className="cell active">
                <span className="last-active">
                  {entry.lastActive.toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <p>
          Leaderboard participation is optional. Your data is anonymized and you can opt out at any time.
          Rankings update every 15 minutes.
        </p>
      </div>
    </div>
  );
};

export default LeaderboardService;

// Export types for external use
export type { 
  LeaderboardEntry, 
  PerformanceMetrics, 
  LeaderboardFilter, 
  LeaderboardServiceProps 
};
