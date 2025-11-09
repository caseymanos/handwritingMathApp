/**
 * VideoPlayerHybrid Component
 *
 * Intelligent video player that automatically falls back between different approaches:
 * 1. Try react-native-youtube-iframe first
 * 2. Fall back to direct WebView iframe on embed_not_allowed
 * 3. Offer "Open in YouTube" as final fallback
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { VideoPlayer } from './VideoPlayer';
import { VideoPlayerWebView } from './VideoPlayerWebView';

interface VideoPlayerHybridProps {
  /** YouTube video URL or ID */
  videoUrl: string;
  /** Initial playback position in seconds */
  initialPosition?: number;
  /** Callback when video progress updates (every second) */
  onProgress?: (seconds: number) => void;
  /** Callback when video completes */
  onComplete?: () => void;
  /** Playback speed (1, 1.25, 1.5, 2) */
  playbackRate?: number;
  /** Callback when playback rate changes */
  onPlaybackRateChange?: (rate: number) => void;
  /** Force specific player type (for testing) */
  forcePlayer?: 'youtube-iframe' | 'webview' | 'auto';
}

type PlayerType = 'youtube-iframe' | 'webview';

export const VideoPlayerHybrid: React.FC<VideoPlayerHybridProps> = ({
  videoUrl,
  initialPosition = 0,
  onProgress,
  onComplete,
  playbackRate = 1,
  onPlaybackRateChange,
  forcePlayer = 'auto',
}) => {
  const [currentPlayer, setCurrentPlayer] = useState<PlayerType>(() => {
    if (forcePlayer === 'youtube-iframe') return 'youtube-iframe';
    if (forcePlayer === 'webview') return 'webview';
    return 'youtube-iframe'; // Default: try iframe first
  });

  const [embedFailures, setEmbedFailures] = useState<Set<PlayerType>>(new Set());

  console.log('[VideoPlayerHybrid] 🎬 Using player:', currentPlayer, 'for video:', videoUrl);

  /**
   * Handle embed_not_allowed error - switch to fallback player
   */
  const handleEmbedError = useCallback(() => {
    console.log('[VideoPlayerHybrid] ⚠️ Embed failed with:', currentPlayer);

    const newFailures = new Set(embedFailures);
    newFailures.add(currentPlayer);
    setEmbedFailures(newFailures);

    // Try fallback player
    if (currentPlayer === 'youtube-iframe' && !newFailures.has('webview')) {
      console.log('[VideoPlayerHybrid] 🔄 Falling back to WebView iframe');
      setCurrentPlayer('webview');
    } else {
      console.log('[VideoPlayerHybrid] ❌ All players failed, showing error');
      // Both failed - let the error UI show
    }
  }, [currentPlayer, embedFailures]);

  /**
   * Wrapper for onComplete to track player success
   */
  const handleComplete = useCallback(() => {
    console.log('[VideoPlayerHybrid] ✅ Video completed successfully with:', currentPlayer);
    if (onComplete) {
      onComplete();
    }
  }, [currentPlayer, onComplete]);

  // Render current player
  const renderPlayer = () => {
    const commonProps = {
      videoUrl,
      initialPosition,
      onProgress,
      onComplete: handleComplete,
      playbackRate,
      onPlaybackRateChange,
    };

    if (currentPlayer === 'youtube-iframe') {
      return (
        <VideoPlayer
          {...commonProps}
          // Intercept errors to trigger fallback
          onError={(errorType: string) => {
            if (errorType === 'embed_not_allowed') {
              handleEmbedError();
            }
          }}
        />
      );
    }

    return <VideoPlayerWebView {...commonProps} />;
  };

  return <View style={styles.container}>{renderPlayer()}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
