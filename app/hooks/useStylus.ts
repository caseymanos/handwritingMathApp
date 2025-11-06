/**
 * useStylus Hook
 *
 * Custom hook for detecting stylus capabilities and input device type.
 * Handles pressure sensitivity detection and device type identification.
 */

import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { InputDevice, StylusCapabilities } from '../types/Canvas';
import {
  hasPressureSensitivity,
  normalizePressureFromForce,
} from '../utils/pressureUtils';

/**
 * Hook for managing stylus detection and capabilities
 *
 * @returns Stylus capabilities and helper functions
 */
export function useStylus() {
  const [capabilities, setCapabilities] = useState<StylusCapabilities>({
    hasPressureSensitivity: false,
    hasTiltSupport: false,
    deviceType: InputDevice.UNKNOWN,
  });

  // Track last detected device type to avoid unnecessary updates
  const lastDeviceType = useRef<InputDevice>(InputDevice.UNKNOWN);

  /**
   * Detect input device type based on touch event properties
   *
   * @param event - Touch event from gesture handler
   * @returns Detected input device type
   */
  const detectInputDevice = useCallback(
    (event: {
      force?: number;
      pressure?: number;
      touches?: any[];
      nativeEvent?: any;
    }): InputDevice => {
      // iOS detection
      if (Platform.OS === 'ios') {
        const force = event.force ?? event.nativeEvent?.force ?? 0;

        // Apple Pencil typically provides force > 0 even at rest
        if (force > 0 && force < 1) {
          return InputDevice.STYLUS;
        }

        // Check if we have multiple touches (likely finger)
        const touchCount =
          event.touches?.length ?? event.nativeEvent?.touches?.length ?? 1;
        if (touchCount > 1) {
          return InputDevice.FINGER;
        }

        // Single touch with force = 0 or 1 is likely finger
        return InputDevice.FINGER;
      }

      // Android detection
      if (Platform.OS === 'android') {
        // Android provides toolType in nativeEvent
        const toolType = event.nativeEvent?.toolType;

        if (toolType === 'stylus' || toolType === 2) {
          return InputDevice.STYLUS;
        }

        if (toolType === 'finger' || toolType === 1) {
          return InputDevice.FINGER;
        }

        if (toolType === 'mouse' || toolType === 3) {
          return InputDevice.MOUSE;
        }

        // Check pressure as fallback
        const pressure = event.pressure ?? event.nativeEvent?.pressure ?? 1;
        if (hasPressureSensitivity(pressure)) {
          return InputDevice.STYLUS;
        }

        return InputDevice.FINGER;
      }

      return InputDevice.UNKNOWN;
    },
    [],
  );

  /**
   * Extract normalized pressure from touch event
   *
   * @param event - Touch event
   * @param deviceType - Detected device type
   * @returns Normalized pressure (0-1)
   */
  const getPressure = useCallback(
    (
      event: {
        force?: number;
        pressure?: number;
        nativeEvent?: any;
      },
      _deviceType: InputDevice,
    ): number => {
      // iOS uses 'force'
      if (Platform.OS === 'ios') {
        const force = event.force ?? event.nativeEvent?.force ?? 0;

        // No force means no pressure sensitivity (finger touch)
        if (force === 0) {
          return 1; // Default to full pressure for finger
        }

        // Normalize force to 0-1 range
        return normalizePressureFromForce(force);
      }

      // Android uses 'pressure'
      if (Platform.OS === 'android') {
        const pressure = event.pressure ?? event.nativeEvent?.pressure ?? 1;

        // Android pressure is already 0-1
        return pressure;
      }

      // Default to full pressure
      return 1;
    },
    [],
  );

  /**
   * Update stylus capabilities based on detected input
   *
   * @param deviceType - Detected device type
   * @param pressure - Pressure value
   */
  const updateCapabilities = useCallback(
    (deviceType: InputDevice, pressure: number) => {
      // Only update if device type changed
      if (deviceType !== lastDeviceType.current) {
        lastDeviceType.current = deviceType;

        setCapabilities({
          hasPressureSensitivity: hasPressureSensitivity(pressure),
          hasTiltSupport: false, // Tilt support not implemented in MVP
          deviceType,
        });
      }
    },
    [],
  );

  /**
   * Process touch event and extract device info and pressure
   *
   * @param event - Touch event from gesture handler
   * @returns Device type and normalized pressure
   */
  const processTouchEvent = useCallback(
    (event: any): { deviceType: InputDevice; pressure: number } => {
      const deviceType = detectInputDevice(event);
      const pressure = getPressure(event, deviceType);

      updateCapabilities(deviceType, pressure);

      return { deviceType, pressure };
    },
    [detectInputDevice, getPressure, updateCapabilities],
  );

  return {
    capabilities,
    detectInputDevice,
    getPressure,
    processTouchEvent,
  };
}
