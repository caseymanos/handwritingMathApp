/**
 * Navigation Types
 *
 * Type definitions for React Navigation 7 stack navigator.
 * Defines all screens and their route parameters for type-safe navigation.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProblemDifficulty } from '../types/Problem';

/**
 * Root Stack Parameter List
 * Defines all screens in the app and their route parameters
 */
export type RootStackParamList = {
  Home: undefined; // No params needed for home screen
  TrainingMode: {
    problemId: string; // Required: ID of the problem to solve
  };
  Review: {
    attemptId?: string; // Optional: specific attempt to review
  };
  Settings: undefined; // No params needed for settings
  // Tutorial Mode (PR14)
  TutorialLibrary: undefined; // No params needed for tutorial library
  Tutorial: {
    lessonId: string; // Required: ID of the lesson to display
  };
};

/**
 * Screen Props Types
 * Helper types for each screen component
 */
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type TrainingModeScreenProps = NativeStackScreenProps<RootStackParamList, 'TrainingMode'>;
export type ReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'Review'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export type TutorialLibraryScreenProps = NativeStackScreenProps<RootStackParamList, 'TutorialLibrary'>;
export type TutorialScreenProps = NativeStackScreenProps<RootStackParamList, 'Tutorial'>;

/**
 * Navigation Prop Types
 * Helper types for accessing navigation in hooks or components
 */
export type RootStackNavigationProp = HomeScreenProps['navigation'];

/**
 * Declare global navigation types for useNavigation hook
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
