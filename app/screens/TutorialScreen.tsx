/**
 * TutorialScreen
 *
 * Full lesson view with video player, transcript, and completion controls.
 * Supports auto-resume, progress tracking, and navigation to practice problems.
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
import { VideoPlayer } from '../components/VideoPlayer';
import { SuccessAnimation } from '../components/SuccessAnimation';
import { Colors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Tutorial'>;

export const TutorialScreen: React.FC<Props> = ({ route, navigation }) => {
  const { lessonId } = route.params;
  const {
    currentLesson,
    videoPosition,
    playbackRate,
    progress,
    startLesson,
    updateVideoPosition,
    setPlaybackRate,
    completeLesson,
    getLessonProgress,
  } = useTutorialStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'notes' | 'practice'>('transcript');
  const [isCompleting, setIsCompleting] = useState(false);

  const lessonProgress = getLessonProgress(lessonId);
  const progressPercent = lessonProgress?.progressPercent || 0;
  const isCompleted = lessonProgress?.status === 'completed';
  const canMarkComplete = progressPercent >= 80;

  // Load lesson on mount
  useEffect(() => {
    startLesson(lessonId);
  }, [lessonId]);

  // Handle video completion
  const handleVideoComplete = () => {
    console.log('[TutorialScreen] Video completed');
    // Auto-mark as complete if not already
    if (!isCompleted && canMarkComplete) {
      handleMarkComplete();
    }
  };

  // Handle video progress updates
  const handleVideoProgress = (seconds: number) => {
    updateVideoPosition(seconds);
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  // Mark lesson as complete
  const handleMarkComplete = async () => {
    if (!canMarkComplete || isCompleting) return;

    setIsCompleting(true);
    try {
      await completeLesson(lessonId);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('[TutorialScreen] Failed to complete lesson:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Navigate to practice problems
  const handlePracticeProblems = () => {
    if (!currentLesson) return;
    navigation.navigate('TrainingMode', {
      category: currentLesson.skillCategory,
    });
  };

  if (!currentLesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{currentLesson.title}</Text>
            {!isCompleted && (
              <Text style={styles.progressText}>Progress: {progressPercent}%</Text>
            )}
            {isCompleted && (
              <Text style={styles.completedBadge}>✅ Completed</Text>
            )}
          </View>
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <VideoPlayer
            videoUrl={currentLesson.videoUrl}
            initialPosition={videoPosition}
            onProgress={handleVideoProgress}
            onComplete={handleVideoComplete}
            playbackRate={playbackRate}
            onPlaybackRateChange={handlePlaybackRateChange}
          />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'transcript' && styles.tabActive]}
            onPress={() => setActiveTab('transcript')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'transcript' && styles.tabTextActive,
              ]}
            >
              Transcript
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
            onPress={() => setActiveTab('notes')}
          >
            <Text
              style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}
            >
              Notes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'practice' && styles.tabActive]}
            onPress={() => setActiveTab('practice')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'practice' && styles.tabTextActive,
              ]}
            >
              Practice
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'transcript' && (
            <View style={styles.transcriptContainer}>
              {currentLesson.transcript ? (
                <Text style={styles.transcriptText}>{currentLesson.transcript}</Text>
              ) : (
                <Text style={styles.placeholderText}>
                  Transcript not available for this lesson.
                </Text>
              )}
            </View>
          )}

          {activeTab === 'notes' && (
            <View style={styles.notesContainer}>
              {currentLesson.description ? (
                <Text style={styles.notesText}>{currentLesson.description}</Text>
              ) : (
                <Text style={styles.placeholderText}>
                  No notes available for this lesson.
                </Text>
              )}
            </View>
          )}

          {activeTab === 'practice' && (
            <View style={styles.practiceContainer}>
              <Text style={styles.practiceTitle}>Ready to practice?</Text>
              <Text style={styles.practiceDescription}>
                Test your understanding with practice problems for{' '}
                {currentLesson.skillCategory.replace(/_/g, ' ').toLowerCase()}.
              </Text>
              <TouchableOpacity
                style={styles.practiceButton}
                onPress={handlePracticeProblems}
              >
                <Text style={styles.practiceButtonText}>Go to Practice Problems</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {!isCompleted && progressPercent < 80 && (
            <Text style={styles.footerHint}>
              Watch at least 80% to mark as complete
            </Text>
          )}

          {!isCompleted && canMarkComplete && (
            <TouchableOpacity
              style={[styles.completeButton, isCompleting && styles.buttonDisabled]}
              onPress={handleMarkComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.completeButtonText}>Mark as Complete</Text>
              )}
            </TouchableOpacity>
          )}

          {isCompleted && (
            <TouchableOpacity
              style={styles.practiceButton}
              onPress={handlePracticeProblems}
            >
              <Text style={styles.practiceButtonText}>Practice Problems</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Success Animation */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <SuccessAnimation onComplete={() => setShowSuccess(false)} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
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
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginBottom: Spacing.sm,
  },
  backButtonText: {
    ...TextStyles.body,
    color: Colors.primary,
  },
  headerContent: {
    gap: Spacing.xs,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.text,
  },
  progressText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  completedBadge: {
    ...TextStyles.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  videoContainer: {
    padding: Spacing.lg,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    padding: Spacing.lg,
    minHeight: 200,
  },
  transcriptContainer: {
    gap: Spacing.sm,
  },
  transcriptText: {
    ...TextStyles.body,
    color: Colors.text,
    lineHeight: 24,
  },
  notesContainer: {
    gap: Spacing.sm,
  },
  notesText: {
    ...TextStyles.body,
    color: Colors.text,
    lineHeight: 24,
  },
  practiceContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  practiceTitle: {
    ...TextStyles.h3,
    color: Colors.text,
  },
  practiceDescription: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  placeholderText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  footer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  footerHint: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  completeButton: {
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  completeButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  practiceButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  practiceButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black + '40',
  },
});