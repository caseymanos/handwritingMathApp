/**
 * ElevenLabs TTS Client
 *
 * Handles text-to-speech API calls for hint narration using ElevenLabs API.
 * Provides audio playback, credit checking, and error handling.
 *
 * API Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

import { Audio } from 'expo-av';

// Import env vars with fallback - use dynamic import to handle cases where @env is not available
let ELEVENLABS_API_KEY: string | undefined;
let ELEVENLABS_VOICE_ID: string | undefined;
let ELEVENLABS_MODEL_ID: string | undefined;

// Try to load from @env (works when react-native-dotenv is properly configured)
try {
  // @ts-ignore - dynamic require for env vars
  const envModule = '@env';
  if (envModule) {
    const envVars = require(envModule);
    ELEVENLABS_API_KEY = envVars?.ELEVENLABS_API_KEY;
    ELEVENLABS_VOICE_ID = envVars?.ELEVENLABS_VOICE_ID;
    ELEVENLABS_MODEL_ID = envVars?.ELEVENLABS_MODEL_ID;
  }
} catch (error) {
  // Silently fail - env vars just won't be available
  // This is expected in some build configurations
}

export interface TTSConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  baseUrl: string;
  timeout: number;
}

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface SubscriptionInfo {
  characterCount: number;
  characterLimit: number;
  canExtendCharacterLimit: boolean;
  allowedToExtendCharacterLimit: boolean;
  nextCharacterCountResetUnix: number;
  voiceLimit: number;
  maxVoiceAddEdits: number;
  voiceAddEditCounter: number;
  professionalVoiceLimit: number;
  canExtendVoiceLimit: boolean;
  canUseInstantVoiceCloning: boolean;
  canUseProfessionalVoiceCloning: boolean;
  currency: string;
  status: string;
  tier: string;
}

// Default configuration
const DEFAULT_CONFIG: TTSConfig = {
  apiKey: ELEVENLABS_API_KEY || '',
  voiceId: ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Default: Sarah (friendly female)
  modelId: ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
  baseUrl: 'https://api.elevenlabs.io/v1',
  timeout: 10000, // 10 seconds
};

let config: TTSConfig = { ...DEFAULT_CONFIG };
let currentSound: Audio.Sound | null = null;

/**
 * Initialize ElevenLabs client with custom configuration
 */
export function initElevenLabsClient(customConfig?: Partial<TTSConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };

  if (!config.apiKey) {
    console.warn('[ElevenLabs] No API key provided. TTS will not work.');
  }

  console.log('[ElevenLabs] Client initialized:', {
    voiceId: config.voiceId,
    modelId: config.modelId,
    hasApiKey: !!config.apiKey,
  });
}

/**
 * Get current configuration
 */
export function getElevenLabsConfig(): TTSConfig {
  return { ...config };
}

/**
 * Check if ElevenLabs is properly configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!config.apiKey;
}

/**
 * Convert text to speech and return audio URL
 */
export async function textToSpeech(options: TTSOptions): Promise<string> {
  if (!config.apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const {
    text,
    voiceId = config.voiceId,
    modelId = config.modelId,
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0,
    useSpeakerBoost = true,
  } = options;

  const url = `${config.baseUrl}/text-to-speech/${voiceId}`;

  console.log('[ElevenLabs] Requesting TTS for text:', text.substring(0, 50) + '...');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': config.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs] TTS API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Convert response to base64 data URL for expo-av
    const audioBlob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('ElevenLabs TTS request timed out');
    }
    console.error('[ElevenLabs] TTS failed:', error);
    throw error;
  }
}

/**
 * Play audio from text using ElevenLabs TTS
 */
export async function playTextToSpeech(
  text: string,
  options?: Partial<TTSOptions>
): Promise<void> {
  try {
    // Stop any currently playing audio
    await stopAudio();

    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    console.log('[ElevenLabs] Generating audio...');

    // Generate audio
    const audioUri = await textToSpeech({ text, ...options });

    // Load and play audio
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true }
    );

    currentSound = sound;

    // Set up completion callback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        console.log('[ElevenLabs] Playback finished');
        sound.unloadAsync();
        currentSound = null;
      }
    });

    console.log('[ElevenLabs] Audio playing...');
  } catch (error) {
    console.error('[ElevenLabs] Failed to play TTS:', error);
    throw error;
  }
}

/**
 * Stop currently playing audio
 */
export async function stopAudio(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
      console.log('[ElevenLabs] Audio stopped');
    } catch (error) {
      console.error('[ElevenLabs] Failed to stop audio:', error);
    }
  }
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(): boolean {
  return currentSound !== null;
}

/**
 * Get subscription info (character quota, limits, etc.)
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  if (!config.apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `${config.baseUrl}/user/subscription`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs] Subscription API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[ElevenLabs] Subscription info retrieved:', {
      tier: data.tier,
      characterCount: data.character_count,
      characterLimit: data.character_limit,
    });

    return {
      characterCount: data.character_count || 0,
      characterLimit: data.character_limit || 0,
      canExtendCharacterLimit: data.can_extend_character_limit || false,
      allowedToExtendCharacterLimit: data.allowed_to_extend_character_limit || false,
      nextCharacterCountResetUnix: data.next_character_count_reset_unix || 0,
      voiceLimit: data.voice_limit || 0,
      maxVoiceAddEdits: data.max_voice_add_edits || 0,
      voiceAddEditCounter: data.voice_add_edit_counter || 0,
      professionalVoiceLimit: data.professional_voice_limit || 0,
      canExtendVoiceLimit: data.can_extend_voice_limit || false,
      canUseInstantVoiceCloning: data.can_use_instant_voice_cloning || false,
      canUseProfessionalVoiceCloning: data.can_use_professional_voice_cloning || false,
      currency: data.currency || 'usd',
      status: data.status || 'unknown',
      tier: data.tier || 'free',
    };
  } catch (error) {
    console.error('[ElevenLabs] Failed to get subscription info:', error);
    throw error;
  }
}

/**
 * Get remaining character quota
 */
export async function getRemainingCharacters(): Promise<{
  remaining: number;
  limit: number;
  percentage: number;
}> {
  const info = await getSubscriptionInfo();
  const remaining = Math.max(0, info.characterLimit - info.characterCount);
  const percentage = info.characterLimit > 0
    ? (remaining / info.characterLimit) * 100
    : 0;

  return {
    remaining,
    limit: info.characterLimit,
    percentage,
  };
}

/**
 * Strip LaTeX from text for cleaner TTS
 */
export function stripLatexForTTS(text: string): string {
  // Replace $...$ with spoken math
  return text.replace(/\$(.+?)\$/g, (match, latex) => {
    // Basic LaTeX to speech conversions
    let spoken = latex
      .replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '$1 over $2')
      .replace(/\^(\d+)/g, ' to the power of $1')
      .replace(/_(\d+)/g, ' subscript $1')
      .replace(/\\times/g, ' times ')
      .replace(/\\div/g, ' divided by ')
      .replace(/\\pm/g, ' plus or minus ')
      .replace(/=/g, ' equals ')
      .replace(/</g, ' less than ')
      .replace(/>/g, ' greater than ')
      .replace(/\\/g, ' ');

    return spoken;
  });
}

// Initialize client with env config on import
initElevenLabsClient();
