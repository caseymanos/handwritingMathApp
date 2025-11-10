/**
 * HomeScreen - Problem Selection and Navigation Hub
 *
 * This is the main landing screen where students:
 * - Browse and select problems by difficulty
 * - View their progress statistics
 * - Navigate to training mode, review, or settings
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { HomeScreenProps } from '../navigation/types';
import { getRandomProblem } from '../utils/problemData';
import { ProblemDifficulty } from '../types/Problem';

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const handleStartProblem = (difficulty?: ProblemDifficulty) => {
    const problem = getRandomProblem(difficulty);
    if (problem) {
      navigation.navigate('TrainingMode', { problemId: problem.id });
    }
  };

  const handleQuickStart = () => {
    handleStartProblem(); // Random easy problem
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.title}>Welcome to Handwriting Math</Text>
        <Text style={styles.subtitle}>Practice solving equations with real-time feedback</Text>
      </View>

      {/* Quick Start Button */}
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleQuickStart}
      >
        <Text style={styles.primaryButtonText}>Quick Start</Text>
        <Text style={styles.buttonSubtext}>Random easy problem</Text>
      </TouchableOpacity>

      {/* Difficulty Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Difficulty</Text>

        <TouchableOpacity
          style={[styles.button, styles.difficultyButton, styles.easyButton]}
          onPress={() => handleStartProblem(ProblemDifficulty.EASY)}
        >
          <Text style={styles.difficultyButtonText}>Easy</Text>
          <Text style={styles.difficultyDescription}>One-step equations (x + 5 = 12)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.difficultyButton, styles.mediumButton]}
          onPress={() => handleStartProblem(ProblemDifficulty.MEDIUM)}
        >
          <Text style={styles.difficultyButtonText}>Medium</Text>
          <Text style={styles.difficultyDescription}>Two-step equations (2x + 3 = 11)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.difficultyButton, styles.hardButton]}
          onPress={() => handleStartProblem(ProblemDifficulty.HARD)}
        >
          <Text style={styles.difficultyButtonText}>Hard</Text>
          <Text style={styles.difficultyDescription}>Variables on both sides (3x + 7 = 2x + 15)</Text>
        </TouchableOpacity>
      </View>

      {/* Learn Section - Tutorial Mode (PR14) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learn</Text>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('TrainingMode', { problemId: 'le_easy_01' })}
        >
          <Text style={styles.secondaryButtonText}>📚 Start Tutorial</Text>
          <Text style={styles.buttonSubtext}>Learn with a simple equation (x + 5 = 12)</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Options</Text>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('Review')}
        >
          <Text style={styles.secondaryButtonText}>Review Attempts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  contentContainer: {
    padding: 24,
  },
  heroSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6E6E73',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  difficultyButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  easyButton: {
    borderColor: '#34C759',
  },
  mediumButton: {
    borderColor: '#FF9500',
  },
  hardButton: {
    borderColor: '#FF3B30',
  },
  difficultyButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  difficultyDescription: {
    fontSize: 14,
    color: '#6E6E73',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
});
