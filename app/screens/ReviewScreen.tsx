/**
 * ReviewScreen - Attempt History and Statistics
 *
 * Displays past attempts, progress stats, and allows data export.
 * Uses progressStore to retrieve attempt history.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import type { ReviewScreenProps } from '../navigation/types';
import { useProgressStore } from '../stores/progressStore';
import { getProblemById } from '../utils/problemData';
import { ProblemDifficulty } from '../types/Problem';

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ navigation, route }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'solved' | 'unsolved'>('all');

  // Get data from progressStore - use raw state data to avoid infinite loops
  const allAttempts = useProgressStore(state => state.attempts);
  const attemptCount = useProgressStore(state => state.attemptCount);
  const solvedProblems = useProgressStore(state => state.completedProblems.size);
  const totalCorrectSteps = useProgressStore(state => state.totalCorrectSteps);
  const totalIncorrectSteps = useProgressStore(state => state.totalIncorrectSteps);
  const totalTime = useProgressStore(state => state.totalTime);
  const currentSessionId = useProgressStore(state => state.currentSessionId);
  const exportData = useProgressStore(state => state.exportData);
  const clearHistory = useProgressStore(state => state.clearHistory);

  // Calculate derived data
  const attempts = React.useMemo(() => {
    return allAttempts
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 50);
  }, [allAttempts]);

  const accuracyRate = React.useMemo(() => {
    const totalSteps = totalCorrectSteps + totalIncorrectSteps;
    if (totalSteps === 0) return 0;
    return (totalCorrectSteps / totalSteps) * 100;
  }, [totalCorrectSteps, totalIncorrectSteps]);

  const studentProgress = React.useMemo(() => {
    return {
      totalAttempts: attemptCount,
      solvedProblems,
      totalTime,
    };
  }, [attemptCount, solvedProblems, totalTime]);

  // Calculate session stats
  const sessionStats = React.useMemo(() => {
    const sessionAttempts = allAttempts.filter(
      a => a.metadata?.sessionId === currentSessionId
    );
    const sessionSolved = sessionAttempts.filter(a => a.solved).length;

    // Calculate current streak (consecutive solved problems from most recent)
    let streak = 0;
    const sortedAttempts = [...allAttempts].sort((a, b) => b.startTime - a.startTime);
    for (const attempt of sortedAttempts) {
      if (attempt.solved) {
        streak++;
      } else {
        break;
      }
    }

    const stats = {
      sessionAttempts: sessionAttempts.length,
      sessionSolved,
      streak,
    };

    console.log('[ReviewScreen] Session stats:', stats, 'currentSessionId:', currentSessionId, 'total attempts:', allAttempts.length);

    return stats;
  }, [allAttempts, currentSessionId]);

  // Filter attempts based on selection
  const filteredAttempts = attempts.filter(attempt => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'solved') return attempt.solved;
    if (selectedFilter === 'unsolved') return !attempt.solved;
    return true;
  });

  // Format time duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  // Format difficulty for display
  const formatDifficulty = (difficulty: ProblemDifficulty): string => {
    switch (difficulty) {
      case ProblemDifficulty.EASY:
        return 'Easy';
      case ProblemDifficulty.MEDIUM:
        return 'Medium';
      case ProblemDifficulty.HARD:
        return 'Hard';
      default:
        return '';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const data = exportData();
      await Share.share({
        message: data,
        title: 'Math Practice Progress Data',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Export Failed', 'Could not export progress data');
    }
  };

  // Handle clear history
  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all attempt history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('Success', 'History cleared successfully');
          },
        },
      ]
    );
  };

  // Navigate to attempt detail
  const handleAttemptPress = (attemptId: string) => {
    navigation.navigate('Review', { attemptId });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Statistics Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsSectionHeader}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
        </View>

        {/* Session Stats Card - Always visible */}
        <View style={styles.sessionStatsCard}>
          <Text style={styles.sessionStatsTitle}>📊 CURRENT SESSION</Text>
          <View style={styles.sessionStatsContent}>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>{sessionStats.sessionAttempts}</Text>
              <Text style={styles.sessionStatLabel}>Attempted</Text>
            </View>
            <View style={styles.sessionStatDivider} />
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>{sessionStats.sessionSolved}</Text>
              <Text style={styles.sessionStatLabel}>Solved</Text>
            </View>
            <View style={styles.sessionStatDivider} />
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>🔥 {sessionStats.streak}</Text>
              <Text style={styles.sessionStatLabel}>Streak</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studentProgress.totalAttempts}</Text>
            <Text style={styles.statLabel}>Total Attempts</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studentProgress.solvedProblems}</Text>
            <Text style={styles.statLabel}>Problems Solved</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{accuracyRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Accuracy Rate</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.floor(studentProgress.totalTime / 60000)}m
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All ({attempts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'solved' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('solved')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === 'solved' && styles.filterButtonTextActive,
            ]}
          >
            Solved ({attempts.filter(a => a.solved).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'unsolved' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('unsolved')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === 'unsolved' && styles.filterButtonTextActive,
            ]}
          >
            Unsolved ({attempts.filter(a => !a.solved).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Attempt History Section */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Attempts</Text>

        {filteredAttempts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No attempts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start practicing to see your progress here
            </Text>
          </View>
        ) : (
          filteredAttempts.map(attempt => {
            const problem = getProblemById(attempt.problemId);
            const totalSteps = attempt.steps.length;
            const hasValidation = attempt.steps.some(s => s.validation !== undefined);
            const correctSteps = attempt.steps.filter(s => s.validation?.isCorrect).length;

            // Determine step display text
            let stepText: string;
            if (!hasValidation && totalSteps > 0) {
              stepText = `${totalSteps} ${totalSteps === 1 ? 'step' : 'steps'}`;
            } else if (hasValidation) {
              stepText = `Steps: ${correctSteps}/${totalSteps} correct`;
            } else {
              stepText = 'No steps';
            }

            return (
              <TouchableOpacity
                key={attempt.id}
                style={styles.attemptCard}
                onPress={() => handleAttemptPress(attempt.id)}
              >
                <View style={styles.attemptHeader}>
                  <Text style={styles.attemptProblem} numberOfLines={1}>
                    {problem?.text || `Problem ${attempt.problemId}`}
                  </Text>
                  <View style={styles.attemptHeaderRight}>
                    <View
                      style={[
                        styles.attemptStatusBadge,
                        attempt.solved ? styles.solvedBadge : styles.unsolvedBadge,
                      ]}
                    >
                      <Text style={styles.attemptStatusText}>
                        {attempt.solved ? 'Solved' : 'Unsolved'}
                      </Text>
                    </View>
                    {problem?.difficulty && (
                      <Text
                        style={[
                          styles.difficultyText,
                          problem.difficulty === ProblemDifficulty.EASY && styles.difficultyEasy,
                          problem.difficulty === ProblemDifficulty.MEDIUM && styles.difficultyMedium,
                          problem.difficulty === ProblemDifficulty.HARD && styles.difficultyHard,
                        ]}
                      >
                        {formatDifficulty(problem.difficulty)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.attemptStats}>
                  <Text style={styles.attemptStatText}>
                    {stepText}
                  </Text>
                  <Text style={styles.attemptStatText}>
                    Time: {formatDuration(attempt.totalTime)}
                  </Text>
                  <Text style={styles.attemptStatText}>
                    {formatTimestamp(attempt.startTime)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
          <Text style={styles.actionButtonText}>Export Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleClearHistory}
        >
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Clear History</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  statsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statsSectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  sessionStatsCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sessionStatsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  sessionStatsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  sessionStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  sessionStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sessionStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sessionStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6E6E73',
    textAlign: 'center',
  },
  filterSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6E73',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  historySection: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6E6E73',
    textAlign: 'center',
  },
  attemptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attemptProblem: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 12,
  },
  attemptHeaderRight: {
    alignItems: 'flex-end',
  },
  attemptStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  solvedBadge: {
    backgroundColor: '#34C759',
  },
  unsolvedBadge: {
    backgroundColor: '#FF9500',
  },
  attemptStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  difficultyEasy: {
    color: '#34C759',
  },
  difficultyMedium: {
    color: '#FF9500',
  },
  difficultyHard: {
    color: '#FF3B30',
  },
  attemptStats: {
    flexDirection: 'row',
    gap: 16,
  },
  attemptStatText: {
    fontSize: 14,
    color: '#6E6E73',
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#FF3B30',
  },
  bottomSpacing: {
    height: 40,
  },
});
