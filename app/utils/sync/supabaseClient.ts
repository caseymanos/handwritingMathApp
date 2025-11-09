/**
 * Supabase Client
 *
 * Wrapper around @supabase/supabase-js for cloud sync functionality.
 * Handles initialization, authentication, and provides typed client instance.
 */

// IMPORTANT: Import URL polyfill FIRST before any other imports
import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Environment variables (from .env via react-native-dotenv)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ENABLE_CLOUD_SYNC = process.env.ENABLE_CLOUD_SYNC === 'true';

/**
 * Supabase client instance (singleton)
 */
let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
export function initializeSupabase(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Missing URL or anon key, cloud sync disabled');
    throw new Error('Supabase not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env');
  }

  if (!ENABLE_CLOUD_SYNC) {
    console.log('[Supabase] Cloud sync disabled via ENABLE_CLOUD_SYNC=false');
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // React Native doesn't use URL-based auth
      storage: {
        // Custom storage adapter using MMKV (defined below)
        getItem: async (key: string) => {
          const { storage } = await import('../storage');
          return storage.getString(key) || null;
        },
        setItem: async (key: string, value: string) => {
          const { storage } = await import('../storage');
          storage.set(key, value);
        },
        removeItem: async (key: string) => {
          const { storage } = await import('../storage');
          storage.delete(key);
        },
      },
    },
    global: {
      headers: {
        'x-client-platform': Platform.OS,
        'x-client-version': '1.0.0',
      },
    },
  });

  console.log('[Supabase] Client initialized');
  return supabase;
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    return initializeSupabase();
  }
  return supabase;
}

/**
 * Check if cloud sync is enabled
 */
export function isCloudSyncEnabled(): boolean {
  return ENABLE_CLOUD_SYNC && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/**
 * Get current auth session
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      console.error('[Supabase] Error getting session:', error);
      return null;
    }

    return data.session;
  } catch (error) {
    console.error('[Supabase] Failed to get session:', error);
    return null;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await getCurrentSession();
    return session?.user || null;
  } catch (error) {
    console.error('[Supabase] Failed to get user:', error);
    return null;
  }
}

/**
 * Sign in with magic link (passwordless email)
 */
export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: undefined, // React Native doesn't use redirects
      },
    });

    if (error) {
      console.error('[Supabase] Magic link error:', error);
      return { error };
    }

    console.log('[Supabase] Magic link sent to:', email);
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Failed to send magic link:', error);
    return { error: error as Error };
  }
}

/**
 * Sign in with email + password (demo/dev convenience)
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Supabase] Password sign-in error:', error);
      return { error };
    }
    console.log('[Supabase] Signed in with password');
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Failed to sign in with password:', error);
    return { error: error as Error };
  }
}

/**
 * Create an account with email + password
 */
export async function signUpWithPassword(
  email: string,
  password: string
): Promise<{ error: Error | null; pendingEmailConfirmation?: boolean }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      console.error('[Supabase] Sign up error:', error);
      return { error };
    }
    console.log('[Supabase] Sign up success:', !!data.user);

    // Some projects require email confirmation; session may be null.
    if (!data.session) {
      // Try to sign-in immediately in case auto-confirm is allowed
      const { error: signinError } = await client.auth.signInWithPassword({ email, password });
      if (signinError) {
        console.warn('[Supabase] Post-signup sign-in pending confirmation');
        return { error: null, pendingEmailConfirmation: true };
      }
    }
    return { error: null, pendingEmailConfirmation: false };
  } catch (error) {
    console.error('[Supabase] Failed to sign up:', error);
    return { error: error as Error };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    const redirectTo = process.env.SUPABASE_REDIRECT_URL || undefined;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error('[Supabase] Reset password error:', error);
      return { error };
    }
    console.log('[Supabase] Password reset email sent');
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Failed to send password reset:', error);
    return { error: error as Error };
  }
}

/**
 * Resend confirmation email after signup
 */
export async function resendConfirmation(email: string): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    // Supabase v2: resend supports type 'signup'
    const { error } = await client.auth.resend({ type: 'signup', email });
    if (error) {
      console.error('[Supabase] Resend confirmation error:', error);
      return { error };
    }
    console.log('[Supabase] Confirmation email resent');
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Failed to resend confirmation:', error);
    return { error: error as Error };
  }
}

/**
 * Verify OTP from magic link email
 */
export async function verifyOTP(email: string, token: string): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      console.error('[Supabase] OTP verification error:', error);
      return { error };
    }

    console.log('[Supabase] OTP verified successfully');
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Failed to verify OTP:', error);
    return { error: error as Error };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();

    if (error) {
      console.error('[Supabase] Sign out error:', error);
      return { error };
    }

    console.log('[Supabase] Signed out successfully');
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Failed to sign out:', error);
    return { error: error as Error };
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const client = getSupabaseClient();
  const { data } = client.auth.onAuthStateChange(callback);
  return data.subscription.unsubscribe;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}
