/**
 * VideoPlayerWebView Component
 *
 * Alternative YouTube video player using direct WebView with iframe embed.
 * Bypasses react-native-youtube-iframe for better embedding compatibility.
 * Based on approach from React Native WebView documentation.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';

interface VideoPlayerWebViewProps {
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

  console.warn('[VideoPlayerWebView] Could not extract video ID from:', url);
  return url;
}

/**
 * Generate HTML with YouTube iframe embed
 */
function generateHtml(videoId: string, autoplay: boolean = false): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background-color: #000;
      overflow: hidden;
    }
    #player {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="player"></div>

  <script src="https://www.youtube.com/iframe_api"></script>
  <script>
    let player;
    let progressInterval;

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${videoId}',
        playerVars: {
          autoplay: ${autoplay ? 1 : 0},
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          fs: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        }
      });
    }

    function onPlayerReady(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ready'
      }));

      // Start progress tracking
      progressInterval = setInterval(() => {
        if (player && player.getCurrentTime) {
          const currentTime = player.getCurrentTime();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'progress',
            time: Math.floor(currentTime)
          }));
        }
      }, 1000);
    }

    function onPlayerStateChange(event) {
      const states = {
        '-1': 'unstarted',
        '0': 'ended',
        '1': 'playing',
        '2': 'paused',
        '3': 'buffering',
        '5': 'cued'
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'stateChange',
        state: states[event.data] || 'unknown'
      }));

      if (event.data === 0) { // Ended
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'complete'
        }));
      }
    }

    function onPlayerError(event) {
      const errors = {
        2: 'invalid_param',
        5: 'html5_error',
        100: 'video_not_found',
        101: 'embed_not_allowed',
        150: 'embed_not_allowed'
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        error: errors[event.data] || 'unknown_error',
        errorCode: event.data
      }));
    }

    // Expose player controls to React Native
    window.playVideo = () => player && player.playVideo();
    window.pauseVideo = () => player && player.pauseVideo();
    window.seekTo = (seconds) => player && player.seekTo(seconds, true);
    window.setPlaybackRate = (rate) => player && player.setPlaybackRate(rate);
  </script>
</body>
</html>
  `.trim();
}

export const VideoPlayerWebView: React.FC<VideoPlayerWebViewProps> = ({
  videoUrl,
  initialPosition = 0,
  onProgress,
  onComplete,
  playbackRate = 1,
  onPlaybackRateChange,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(playbackRate);
  const webViewRef = useRef<WebView>(null);

  const videoId = extractVideoId(videoUrl);
  const html = generateHtml(videoId, false);

  // 🔍 DEBUG: Log initialization
  console.log('[VideoPlayerWebView] 🎬 Initializing with:', {
    originalUrl: videoUrl,
    extractedVideoId: videoId,
    initialPosition,
  });

  /**
   * Handle messages from WebView
   */
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[VideoPlayerWebView] 📨 Message from WebView:', message);

      switch (message.type) {
        case 'ready':
          setIsLoading(false);
          setError(null);
          // Seek to initial position if needed
          if (initialPosition > 0) {
            webViewRef.current?.injectJavaScript(`window.seekTo(${initialPosition}); true;`);
          }
          break;

        case 'stateChange':
          setIsPlaying(message.state === 'playing');
          break;

        case 'progress':
          if (onProgress) {
            onProgress(message.time);
          }
          break;

        case 'complete':
          setIsPlaying(false);
          if (onComplete) {
            onComplete();
          }
          break;

        case 'error':
          console.error('[VideoPlayerWebView] ❌ ERROR:', message);
          handlePlayerError(message.error);
          break;
      }
    } catch (err) {
      console.error('[VideoPlayerWebView] Failed to parse message:', err);
    }
  }, [initialPosition, onProgress, onComplete]);

  /**
   * Handle player errors
   */
  const handlePlayerError = useCallback((errorCode: string) => {
    let errorMessage = 'Failed to load video. Please try again.';

    if (errorCode === 'embed_not_allowed') {
      errorMessage = 'This video cannot be embedded. Please watch it on YouTube.';
      console.error('[VideoPlayerWebView] 🚫 Embedding disabled for video:', videoId);
    } else if (errorCode === 'video_not_found') {
      errorMessage = 'Video not found. It may have been removed.';
    } else if (errorCode === 'invalid_param') {
      errorMessage = 'Invalid video ID. Please check the URL.';
    }

    setError(errorMessage);
    setErrorType(errorCode);
    setIsLoading(false);
  }, [videoId]);

  /**
   * Toggle playback speed
   */
  const toggleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    const nextSpeed = PLAYBACK_RATES[nextIndex];

    setCurrentSpeed(nextSpeed);
    webViewRef.current?.injectJavaScript(`window.setPlaybackRate(${nextSpeed}); true;`);

    if (onPlaybackRateChange) {
      onPlaybackRateChange(nextSpeed);
    }

    console.log('[VideoPlayerWebView] Playback rate changed:', nextSpeed);
  }, [currentSpeed, onPlaybackRateChange]);

  /**
   * Retry loading video
   */
  const handleRetry = useCallback(() => {
    setError(null);
    setErrorType(null);
    setIsLoading(true);
    // Force WebView reload
    webViewRef.current?.reload();
  }, []);

  /**
   * Open video in YouTube app or browser
   */
  const handleOpenInYouTube = useCallback(async () => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      const canOpen = await Linking.canOpenURL(youtubeUrl);
      if (canOpen) {
        await Linking.openURL(youtubeUrl);
      } else {
        console.error('[VideoPlayerWebView] Cannot open YouTube URL');
      }
    } catch (err) {
      console.error('[VideoPlayerWebView] Failed to open YouTube:', err);
    }
  }, [videoId]);

  return (
    <View style={styles.container}>
      {/* Loading Spinner */}
      {isLoading && !error && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorButtons}>
            {errorType === 'embed_not_allowed' ? (
              <TouchableOpacity style={styles.youtubeButton} onPress={handleOpenInYouTube}>
                <Text style={styles.youtubeButtonText}>Open in YouTube</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* WebView with YouTube iframe */}
      {!error && (
        <WebView
          ref={webViewRef}
          source={{ html, baseUrl: 'https://www.youtube.com' }}
          originWhitelist={['*']}
          style={styles.webView}
          onMessage={handleMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[VideoPlayerWebView] WebView error:', nativeEvent);
            setError('Failed to load video player');
            setIsLoading(false);
          }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          scrollEnabled={false}
          bounces={false}
          scalesPageToFit={false}
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
    flex: 1,
    backgroundColor: '#000',
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
  errorButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  youtubeButton: {
    backgroundColor: '#FF0000', // YouTube red
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.sm,
  },
  youtubeButtonText: {
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
