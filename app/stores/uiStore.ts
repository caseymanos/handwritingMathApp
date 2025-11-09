/**
 * UI Store
 *
 * Zustand store for managing UI state, modals, notifications, and loading states.
 * Centralizes all UI-related state to avoid prop drilling and component re-renders.
 * Persists toolbar preferences to MMKV for user experience continuity.
 */

import { create } from 'zustand';
import { ToolbarPosition } from '../types/Canvas';
import { storage } from '../utils/storage';

/**
 * Storage keys for MMKV persistence
 */
const STORAGE_KEYS = {
  TOOLBAR_VISIBLE: '@ui:toolbar_visible',
  TOOLBAR_POSITION: '@ui:toolbar_position',
  WELCOME_SHOWN: '@ui:welcome_shown',
};

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Notification configuration
 */
export interface Notification {
  visible: boolean;
  message: string;
  type: NotificationType;
  duration?: number; // Auto-hide duration in ms (0 = manual dismiss)
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * Modal names (for type safety)
 */
export type ModalName =
  | 'welcome'
  | 'settings'
  | 'help'
  | 'manualInput'
  | 'problemSelector'
  | 'reviewHistory'
  | 'exportData';

/**
 * Loading state
 */
export interface LoadingState {
  isLoading: boolean;
  message: string | null;
  progress?: number; // 0-100 for progress indicators
}

/**
 * UI store state interface
 */
interface UIStoreState {
  // Loading states
  loading: LoadingState;

  // Modal states (keyed by modal name)
  modals: Record<ModalName, boolean>;

  // Notification/toast system
  notification: Notification | null;

  // Toolbar state
  toolbarVisible: boolean;
  toolbarPosition: ToolbarPosition;

  // Line guides toggle
  showLineGuides: boolean;

  // Hint overlay collapsed state
  hintCollapsed: boolean;

  // Keyboard state (for mobile devices)
  keyboardVisible: boolean;
  keyboardHeight: number;

  // Actions: Loading
  setLoading: (loading: boolean, message?: string, progress?: number) => void;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  updateLoadingProgress: (progress: number) => void;

  // Actions: Modals
  showModal: (modalName: ModalName) => void;
  hideModal: (modalName: ModalName) => void;
  toggleModal: (modalName: ModalName) => void;
  hideAllModals: () => void;
  isModalVisible: (modalName: ModalName) => boolean;

  // Actions: Notifications
  showNotification: (
    message: string,
    type?: NotificationType,
    duration?: number,
    action?: Notification['action']
  ) => void;
  hideNotification: () => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;

  // Actions: Toolbar
  toggleToolbar: () => void;
  setToolbarVisible: (visible: boolean) => void;
  setToolbarPosition: (position: ToolbarPosition) => void;

  // Actions: Line guides
  toggleLineGuides: () => void;
  setLineGuides: (show: boolean) => void;

  // Actions: Hint overlay
  setHintCollapsed: (collapsed: boolean) => void;
  toggleHintCollapsed: () => void;

  // Actions: Keyboard
  setKeyboardVisible: (visible: boolean, height?: number) => void;

  // Actions: Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;

  // Actions: Reset
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  loading: {
    isLoading: false,
    message: null,
    progress: undefined,
  },
  modals: {
    welcome: false,
    settings: false,
    help: false,
    manualInput: false,
    problemSelector: false,
    reviewHistory: false,
    exportData: false,
  } as Record<ModalName, boolean>,
  notification: null,
  toolbarVisible: true,
  toolbarPosition: ToolbarPosition.MIDDLE_LEFT,
  showLineGuides: true,
  hintCollapsed: false,
  keyboardVisible: false,
  keyboardHeight: 0,
};

/**
 * Auto-hide timer for notifications
 */
let notificationTimer: NodeJS.Timeout | null = null;

/**
 * UI store
 */
export const useUIStore = create<UIStoreState>((set, get) => ({
  ...initialState,

  // Loading actions
  setLoading: (loading: boolean, message?: string, progress?: number) => {
    set({
      loading: {
        isLoading: loading,
        message: message || null,
        progress,
      },
    });
  },

  startLoading: (message = 'Loading...') => {
    set({
      loading: {
        isLoading: true,
        message,
        progress: undefined,
      },
    });
  },

  stopLoading: () => {
    set({
      loading: {
        isLoading: false,
        message: null,
        progress: undefined,
      },
    });
  },

  updateLoadingProgress: (progress: number) => {
    set(state => ({
      loading: {
        ...state.loading,
        progress: Math.min(100, Math.max(0, progress)),
      },
    }));
  },

  // Modal actions
  showModal: (modalName: ModalName) => {
    set(state => ({
      modals: {
        ...state.modals,
        [modalName]: true,
      },
    }));

    console.log('[UIStore] Showing modal:', modalName);
  },

  hideModal: (modalName: ModalName) => {
    set(state => ({
      modals: {
        ...state.modals,
        [modalName]: false,
      },
    }));

    console.log('[UIStore] Hiding modal:', modalName);
  },

  toggleModal: (modalName: ModalName) => {
    set(state => ({
      modals: {
        ...state.modals,
        [modalName]: !state.modals[modalName],
      },
    }));
  },

  hideAllModals: () => {
    set({
      modals: {
        welcome: false,
        settings: false,
        help: false,
        manualInput: false,
        problemSelector: false,
        reviewHistory: false,
        exportData: false,
      },
    });

    console.log('[UIStore] Hiding all modals');
  },

  isModalVisible: (modalName: ModalName) => {
    return get().modals[modalName];
  },

  // Notification actions
  showNotification: (
    message: string,
    type: NotificationType = 'info',
    duration = 3000,
    action?: Notification['action']
  ) => {
    // Clear existing timer
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    set({
      notification: {
        visible: true,
        message,
        type,
        duration,
        action,
      },
    });

    // Auto-hide after duration (unless duration is 0)
    if (duration > 0) {
      notificationTimer = setTimeout(() => {
        get().hideNotification();
      }, duration);
    }

    console.log('[UIStore] Showing notification:', type, message);
  },

  hideNotification: () => {
    // Clear timer
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    set({ notification: null });
  },

  showSuccess: (message: string, duration = 3000) => {
    get().showNotification(message, 'success', duration);
  },

  showError: (message: string, duration = 5000) => {
    get().showNotification(message, 'error', duration);
  },

  showInfo: (message: string, duration = 3000) => {
    get().showNotification(message, 'info', duration);
  },

  showWarning: (message: string, duration = 4000) => {
    get().showNotification(message, 'warning', duration);
  },

  // Toolbar actions
  toggleToolbar: () => {
    const newVisible = !get().toolbarVisible;
    set({ toolbarVisible: newVisible });
    get().saveToStorage();

    console.log('[UIStore] Toolbar visibility:', newVisible);
  },

  setToolbarVisible: (visible: boolean) => {
    set({ toolbarVisible: visible });
    get().saveToStorage();
  },

  setToolbarPosition: (position: ToolbarPosition) => {
    set({ toolbarPosition: position });
    get().saveToStorage();

    console.log('[UIStore] Toolbar position:', position);
  },

  // Line guides actions
  toggleLineGuides: () => {
    const newShowLineGuides = !get().showLineGuides;
    set({ showLineGuides: newShowLineGuides });

    console.log('[UIStore] Line guides:', newShowLineGuides);
  },

  setLineGuides: (show: boolean) => {
    set({ showLineGuides: show });
  },

  // Hint overlay actions
  setHintCollapsed: (collapsed: boolean) => {
    set({ hintCollapsed: collapsed });
  },

  toggleHintCollapsed: () => {
    set(state => ({ hintCollapsed: !state.hintCollapsed }));
  },

  // Keyboard actions
  setKeyboardVisible: (visible: boolean, height = 0) => {
    set({
      keyboardVisible: visible,
      keyboardHeight: visible ? height : 0,
    });
  },

  // Persistence
  saveToStorage: () => {
    const state = get();

    try {
      storage.set(STORAGE_KEYS.TOOLBAR_VISIBLE, state.toolbarVisible);
      storage.set(STORAGE_KEYS.TOOLBAR_POSITION, state.toolbarPosition);
      storage.set(STORAGE_KEYS.WELCOME_SHOWN, state.modals.welcome);

      console.log('[UIStore] Saved to storage');
    } catch (error) {
      console.error('[UIStore] Failed to save to storage:', error);
    }
  },

  loadFromStorage: () => {
    try {
      const toolbarVisible = storage.getBoolean(STORAGE_KEYS.TOOLBAR_VISIBLE);
      const toolbarPosition = storage.getString(STORAGE_KEYS.TOOLBAR_POSITION);
      const welcomeShown = storage.getBoolean(STORAGE_KEYS.WELCOME_SHOWN);

      set({
        toolbarVisible: toolbarVisible !== undefined ? toolbarVisible : true,
        toolbarPosition: (toolbarPosition as ToolbarPosition) || ToolbarPosition.MIDDLE_LEFT,
        modals: {
          ...initialState.modals,
          welcome: welcomeShown !== undefined ? welcomeShown : false,
        },
      });

      console.log('[UIStore] Loaded from storage');
    } catch (error) {
      console.error('[UIStore] Failed to load from storage:', error);
    }
  },

  // Reset
  reset: () => {
    // Clear notification timer
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    set(initialState);
    console.log('[UIStore] Reset to initial state');
  },
}));

// Load from storage on initialization
useUIStore.getState().loadFromStorage();

/**
 * Selectors for optimized re-renders
 */

// Get loading state
export const selectLoading = (state: UIStoreState) => state.loading;

// Check if loading
export const selectIsLoading = (state: UIStoreState) => state.loading.isLoading;

// Get modal visibility
export const selectModalVisible = (state: UIStoreState, modalName: ModalName) =>
  state.modals[modalName];

// Get notification
export const selectNotification = (state: UIStoreState) => state.notification;

// Get toolbar state
export const selectToolbarState = (state: UIStoreState) => ({
  visible: state.toolbarVisible,
  position: state.toolbarPosition,
});

// Get keyboard state
export const selectKeyboardState = (state: UIStoreState) => ({
  visible: state.keyboardVisible,
  height: state.keyboardHeight,
});
