/**
 * AppNavigator - Root Navigation Structure
 *
 * Main navigation container with React Navigation 7 stack navigator.
 * Manages navigation between Home, TrainingMode, Review, and Settings screens.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

// Screen imports
import { HomeScreen } from '../screens/HomeScreen';
import { TrainingModeScreen } from '../screens/TrainingModeScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TutorialLibraryScreen } from '../screens/TutorialLibraryScreen';
import { TutorialScreen } from '../screens/TutorialScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F5F5F7',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Handwriting Math',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="TrainingMode"
        component={TrainingModeScreen}
        options={{
          title: 'Training Mode',
          headerShown: false, // Hide header for immersive fullscreen experience
        }}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          title: 'Review Attempts',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="TutorialLibrary"
        component={TutorialLibraryScreen}
        options={{
          title: 'Tutorial Library',
        }}
      />
      <Stack.Screen
        name="Tutorial"
        component={TutorialScreen}
        options={{
          title: 'Tutorial',
          headerShown: false, // Hide header for immersive video experience
        }}
      />
    </Stack.Navigator>
  );
};
