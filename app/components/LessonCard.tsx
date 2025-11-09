/**
 * LessonCard Component
 *
 * Displays a tutorial lesson with status, progress, duration, and lock state.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TutorialLesson, TutorialProgress, TutorialLessonStatus } from '../types/Tutorial';
import { Colors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';

interface LessonCardProps {
  lesson: TutorialLesson;
  progress?: TutorialProgress | null;
  isLocked: boolean;
  onPress: () => void;
}

/**
 * Get status icon based on lesson state
 */
function getStatusIcon(
  progress: TutorialProgress | null | undefined,
  isLocked: boolean
): string {
  if (isLocked) return '🔒';
  if (!progress) return '○';
  if (progress.status === TutorialLessonStatus.COMPLETED) return '✅';
  if (progress.status === TutorialLessonStatus.IN_PROGRESS) return '▶️';
  return '○';
}

/**
 * Format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get difficulty badge color
 */
function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toUpperCase()) {
    case 'EASY':
      return Colors.success;
    case 'MEDIUM':
      return Colors.warning;
    case 'HARD':
      return Colors.error;
    default:
      return Colors.textSecondary;
  }
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  progress,
  isLocked,
  onPress,
}) => {
  const statusIcon = getStatusIcon(progress, isLocked);
  const isCompleted = progress?.status === TutorialLessonStatus.COMPLETED;
  const isInProgress = progress?.status === TutorialLessonStatus.IN_PROGRESS;
  const progressPercent = progress?.progressPercent || 0;

  // Get first prerequisite for lock message
  const prerequisiteName = lesson.prerequisites?.[0] || 'previous lesson';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isLocked && styles.containerLocked,
        isCompleted && styles.containerCompleted,
        isInProgress && styles.containerInProgress,
      ]}
      onPress={onPress}
      disabled={isLocked}
      activeOpacity={0.7}
    >
      {/* Status Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.statusIcon}>{statusIcon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text
          style={[styles.title, isLocked && styles.titleLocked]}
          numberOfLines={2}
        >
          {lesson.title}
        </Text>

        {/* Description */}
        {lesson.description && (
          <Text
            style={[styles.description, isLocked && styles.descriptionLocked]}
            numberOfLines={2}
          >
            {lesson.description}
          </Text>
        )}

        {/* Lock Message */}
        {isLocked && (
          <Text style={styles.lockMessage}>
            Complete "{prerequisiteName}" to unlock
          </Text>
        )}

        {/* Progress Bar (In Progress) */}
        {isInProgress && progressPercent > 0 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        )}

        {/* Metadata Row */}
        <View style={styles.metadataRow}>
          {/* Duration */}
          {lesson.durationSeconds && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataIcon}>⏱️</Text>
              <Text style={[styles.metadataText, isLocked && styles.metadataTextLocked]}>
                {formatDuration(lesson.durationSeconds)}
              </Text>
            </View>
          )}

          {/* Difficulty Badge */}
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(lesson.difficulty) + '20' },
            ]}
          >
            <Text
              style={[
                styles.difficultyText,
                { color: getDifficultyColor(lesson.difficulty) },
              ]}
            >
              {lesson.difficulty}
            </Text>
          </View>

          {/* Progress Percent (In Progress) */}
          {isInProgress && progressPercent > 0 && (
            <Text style={styles.progressText}>{progressPercent}%</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerLocked: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  containerCompleted: {
    borderColor: Colors.success,
  },
  containerInProgress: {
    borderColor: Colors.primary,
  },
  iconContainer: {
    marginRight: Spacing.md,
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  titleLocked: {
    color: Colors.textSecondary,
  },
  description: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  descriptionLocked: {
    color: Colors.textTertiary,
  },
  lockMessage: {
    ...TextStyles.caption,
    color: Colors.error,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metadataIcon: {
    fontSize: 14,
  },
  metadataText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  metadataTextLocked: {
    color: Colors.textTertiary,
  },
  difficultyBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: Spacing.xs,
  },
  difficultyText: {
    ...TextStyles.caption,
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  progressText: {
    ...TextStyles.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 'auto',
  },
});