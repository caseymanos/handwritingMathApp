/**
 * TutorialLibraryScreen
 *
 * Browse and filter tutorial lessons by category.
 * Shows lock states, completion status, and category progress.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTutorialStore } from '../stores/tutorialStore';
import { LessonCard } from '../components/LessonCard';
import { ProblemCategory } from '../types/Problem';
import { Colors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'TutorialLibrary'>;

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: ProblemCategory.LINEAR_EQUATIONS, label: 'Linear Equations' },
  { id: ProblemCategory.BASIC_ALGEBRA, label: 'Basic Algebra' },
  { id: ProblemCategory.QUADRATIC, label: 'Quadratic' },
  { id: ProblemCategory.GEOMETRY, label: 'Geometry' },
];

export const TutorialLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const {
    lessons,
    lessonsLoading,
    lessonsError,
    fetchLessons,
    fetchProgress,
    isLessonUnlocked,
    getLessonProgress,
    getCategoryProgress,
  } = useTutorialStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch lessons and progress on mount
  useEffect(() => {
    fetchLessons();
    fetchProgress();
  }, []);

  // Filter lessons by selected category
  const filteredLessons = lessons.filter((lesson) => {
    if (selectedCategory === 'all') return true;
    return lesson.skillCategory === selectedCategory;
  });

  // Group lessons by category
  const lessonsByCategory: Record<string, typeof filteredLessons> = {};
  filteredLessons.forEach((lesson) => {
    if (!lessonsByCategory[lesson.skillCategory]) {
      lessonsByCategory[lesson.skillCategory] = [];
    }
    lessonsByCategory[lesson.skillCategory].push(lesson);
  });

  // Sort lessons within each category by sort_order
  Object.values(lessonsByCategory).forEach((categoryLessons) => {
    categoryLessons.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  // Handle lesson press
  const handleLessonPress = (lessonId: string) => {
    const unlocked = isLessonUnlocked(lessonId);
    if (!unlocked) {
      console.log('[TutorialLibrary] Lesson locked:', lessonId);
      return;
    }

    navigation.navigate('Tutorial', { lessonId });
  };

  // Render loading state
  if (lessonsLoading && lessons.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading lessons...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (lessonsError && lessons.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load lessons</Text>
          <Text style={styles.errorSubtext}>{lessonsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLessons}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tutorial Library</Text>
        <Text style={styles.headerSubtitle}>
          Learn new skills with video lessons
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
        showsHorizontalScrollIndicator={false}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.categoryButtonTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lesson List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Object.entries(lessonsByCategory).map(([category, categoryLessons]) => {
          const progress = getCategoryProgress(category as ProblemCategory);
          const progressPercent =
            progress.total > 0
              ? Math.round((progress.completed / progress.total) * 100)
              : 0;

          return (
            <View key={category} style={styles.categorySection}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                  {category.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={styles.categoryProgress}>
                  Progress: {progress.completed}/{progress.total} ({progressPercent}%)
                </Text>
              </View>

              {/* Lesson Cards */}
              {categoryLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  progress={getLessonProgress(lesson.id)}
                  isLocked={!isLessonUnlocked(lesson.id)}
                  onPress={() => handleLessonPress(lesson.id)}
                />
              ))}
            </View>
          );
        })}

        {filteredLessons.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No lessons available for this category yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...TextStyles.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  categoryScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    ...TextStyles.body,
    color: Colors.text,
  },
  categoryButtonTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryHeader: {
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    ...TextStyles.h3,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  categoryProgress: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    ...TextStyles.h3,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorSubtext: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.sm,
  },
  retryButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});