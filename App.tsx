/**
 * Handwriting Math App
 * Main application entry point
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CanvasDemoScreen } from './app/screens/CanvasDemoScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <CanvasDemoScreen />
    </SafeAreaProvider>
  );
}

export default App;
