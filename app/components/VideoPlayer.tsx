/**
 * VideoPlayer Component
 *
 * YouTube video player using react-native-youtube-iframe.
 * Supports playback controls, speed adjustment, progress tracking, and auto-resume.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { Colors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';

interface VideoPlayerProps {
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
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url: string): string {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  console.warn('[VideoPlayer] Could not extract video ID from:', url);
  return url; // Return as-is and hope it's a valid ID
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  initialPosition = 0,
  onProgress,
  onComplete,
  playbackRate = 1,
  onPlaybackRateChange,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(playbackRate);
  const playerRef = useRef<YoutubeIframeRef>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoId = extractVideoId(videoUrl);

  /**
   * Start progress tracking interval
   */
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(async () => {
      if (playerRef.current && onProgress) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          onProgress(Math.floor(currentTime));
        } catch (err) {
          console.warn('[VideoPlayer] Failed to get current time:', err);
        }
      }
    }, 1000); // Update every second
  }, [onProgress]);

  /**
   * Stop progress tracking
   */
  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle player ready
   */
  const handleReady = useCallback(() => {
    setIsLoading(false);
    setError(null);
    console.log('[VideoPlayer] Player ready, seeking to:', initialPosition);

    // Seek to initial position
    if (initialPosition > 0 && playerRef.current) {
      playerRef.current.seekTo(initialPosition, true);
    }
  }, [initialPosition]);

  /**
   * Handle state change (playing, paused, ended)
   */
  const handleStateChange = useCallback(
    (state: string) => {
      console.log('[VideoPlayer] State changed:', state);

      switch (state) {
        case 'playing':
          setIsPlaying(true);
          startProgressTracking();
          break;

        case 'paused':
        case 'buffering':
          setIsPlaying(false);
          stopProgressTracking();
          break;

        case 'ended':
          setIsPlaying(false);
          stopProgressTracking();
          if (onComplete) {
            onComplete();
          }
          break;

        default:
          break;
      }
    },
    [startProgressTracking, stopProgressTracking, onComplete]
  );

  /**
   * Handle player error
   */
  const handleError = useCallback((errorMsg: string) => {
    console.error('[VideoPlayer] Error:', errorMsg);
    setError('Failed to load video. Please try again.');
    setIsLoading(false);
  }, []);

  /**
   * Toggle playback speed
   */
  const toggleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    const nextSpeed = PLAYBACK_RATES[nextIndex];

    setCurrentSpeed(nextSpeed);
    if (onPlaybackRateChange) {
      onPlaybackRateChange(nextSpeed);
    }

    console.log('[VideoPlayer] Playback rate changed:', nextSpeed);
  }, [currentSpeed, onPlaybackRateChange]);

  /**
   * Retry loading video
   */
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopProgressTracking();
    };
  }, [stopProgressTracking]);

  return (
    <View style={styles.container}>
      {/* Loading Spinner */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* YouTube Player */}
      {!error && (
        <YoutubePlayer
          ref={playerRef}
          height={300}
          videoId={videoId}
          play={isPlaying}
          onReady={handleReady}
          onChangeState={handleStateChange}
          onError={handleError}
          initialPlayerParams={{
            preventFullScreen: false,
            controls: true,
            modestbranding: true,
            playbackRate: currentSpeed,
          }}
          webViewStyle={styles.webView}
        />
      )}

      {/* Speed Control */}
      {!error && !isLoading && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.speedButton} onPress={toggleSpeed}>
            <Text style={styles.speedText}>{currentSpeed}x</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    zIndex: 10,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    padding: Spacing.lg,
    zIndex: 10,
  },
  errorText: {
    ...TextStyles.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.sm,
  },
  retryText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  controls: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    zIndex: 5,
  },
  speedButton: {
    backgroundColor: Colors.primary + 'CC',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Spacing.xs,
  },
  speedText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: '600',
  },
});