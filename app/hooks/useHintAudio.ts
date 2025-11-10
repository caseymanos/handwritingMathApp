/**
 * useHintAudio Hook
 *
 * Handles automatic text-to-speech narration of hints using ElevenLabs API.
 * Monitors hint changes and plays audio when enabled.
 */

import { useEffect, useRef } from 'react';
import { useHintStore } from '../stores/hintStore';
import { useUIStore, selectAudioEnabled } from '../stores/uiStore';
import { 
  playTextToSpeech, 
  stopAudio, 
  isElevenLabsConfigured,
  stripLatexForTTS 
} from '../utils/elevenLabsClient';

export function useHintAudio() {
  const currentHint = useHintStore(state => state.currentHint);
  const audioEnabled = useUIStore(selectAudioEnabled);
  const setAudioPlaying = useUIStore(state => state.setAudioPlaying);
  
  // Track last played hint to avoid replaying
  const lastPlayedHintId = useRef<string | null>(null);

  useEffect(() => {
    // Don't play if audio is disabled or ElevenLabs not configured
    if (!audioEnabled || !isElevenLabsConfigured()) {
      return;
    }

    // Don't play if no hint or same hint as before
    if (!currentHint || currentHint.id === lastPlayedHintId.current) {
      return;
    }

    // Play the hint audio
    const playHint = async () => {
      try {
        console.log('[useHintAudio] Playing hint:', currentHint.id);
        
        // Strip LaTeX formatting for cleaner speech
        const spokenText = stripLatexForTTS(currentHint.text);
        
        setAudioPlaying(true);
        await playTextToSpeech(spokenText, {
          stability: 0.6, // Slightly more expressive for educational content
          similarityBoost: 0.8, // Higher for clarity
          style: 0.3, // Moderate style
        });
        
        lastPlayedHintId.current = currentHint.id;
        console.log('[useHintAudio] Finished playing hint');
      } catch (error) {
        console.error('[useHintAudio] Failed to play hint audio:', error);
      } finally {
        setAudioPlaying(false);
      }
    };

    playHint();

    // Cleanup: stop audio when component unmounts or hint changes
    return () => {
      stopAudio();
      setAudioPlaying(false);
    };
  }, [currentHint, audioEnabled, setAudioPlaying]);

  // Stop audio when audio is disabled
  useEffect(() => {
    if (!audioEnabled) {
      stopAudio();
      setAudioPlaying(false);
    }
  }, [audioEnabled, setAudioPlaying]);

  return {
    isPlaying: useUIStore(state => state.audioPlaying),
  };
}
