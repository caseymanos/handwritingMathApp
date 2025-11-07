/**
 * Unit Tests for Recognition Utilities
 *
 * Tests the recognition manager, pause detection, line splitting,
 * and helper functions for handwriting recognition.
 */

import {
  RecognitionManager,
  DEFAULT_RECOGNITION_CONFIG,
  splitStrokesIntoLines,
  shouldTriggerRecognition,
  formatRecognitionResult,
  getConfidenceLevel,
  getStrokeAverageTimestamp,
} from '../../app/utils/recognitionUtils';
import { Stroke } from '../../app/types/Canvas';
import { RecognitionStatus } from '../../app/types/MyScript';
import { MyScriptClient } from '../../app/utils/myScriptClient';

// Mock MyScriptClient
jest.mock('../../app/utils/myScriptClient');

const mockRecognize = jest.fn();
const mockClient = {
  recognize: mockRecognize,
  getConfig: jest.fn(() => ({ endpoint: 'recognize' })),
} as unknown as jest.Mocked<MyScriptClient>;

// Test data
const createTestStroke = (id: string, yPosition: number = 100): Stroke => ({
  id,
  points: [
    { x: 0, y: yPosition, timestamp: Date.now(), pressure: 1 },
    { x: 10, y: yPosition, timestamp: Date.now() + 10, pressure: 1 },
    { x: 20, y: yPosition, timestamp: Date.now() + 20, pressure: 1 },
  ],
  color: '#000000',
  width: 2,
  timestamp: Date.now(),
});

describe('recognitionUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set default mock return value for recognize
    mockRecognize.mockResolvedValue({
      status: RecognitionStatus.SUCCESS,
      latex: 'x',
      timestamp: Date.now(),
      strokeIds: ['1'],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('RecognitionManager', () => {
    describe('constructor', () => {
      it('should initialize with default config', () => {
        const manager = new RecognitionManager(mockClient);
        expect(manager.getConfig()).toEqual(DEFAULT_RECOGNITION_CONFIG);
      });

      it('should merge custom config with defaults', () => {
        const customConfig = { pauseDuration: 1000 };
        const manager = new RecognitionManager(mockClient, customConfig);

        expect(manager.getConfig().pauseDuration).toBe(1000);
        expect(manager.getConfig().minConfidence).toBe(DEFAULT_RECOGNITION_CONFIG.minConfidence);
      });
    });

    describe('pause detection', () => {
      it('should call callback after pause duration', () => {
        const manager = new RecognitionManager(mockClient);
        const onPauseDetected = jest.fn();

        manager.startPauseDetection(onPauseDetected);

        expect(onPauseDetected).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);

        expect(onPauseDetected).toHaveBeenCalledTimes(1);
      });

      it('should cancel previous timer when starting new detection', () => {
        const manager = new RecognitionManager(mockClient);
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        manager.startPauseDetection(callback1);
        jest.advanceTimersByTime(250);

        manager.startPauseDetection(callback2);
        jest.advanceTimersByTime(500);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledTimes(1);
      });

      it('should cancel pause detection', () => {
        const manager = new RecognitionManager(mockClient);
        const onPauseDetected = jest.fn();

        manager.startPauseDetection(onPauseDetected);
        jest.advanceTimersByTime(250);

        manager.cancelPauseDetection();
        jest.advanceTimersByTime(500);

        expect(onPauseDetected).not.toHaveBeenCalled();
      });
    });

    describe('debouncing', () => {
      it('should allow recognition after debounce duration', () => {
        const manager = new RecognitionManager(mockClient);

        expect(manager.canRecognize()).toBe(true);

        // Simulate a recognition call
        manager.recognizeStrokes([createTestStroke('1')]);

        expect(manager.canRecognize()).toBe(false);

        jest.advanceTimersByTime(500);

        expect(manager.canRecognize()).toBe(true);
      });
    });

    describe('recognizeStrokes', () => {
      it('should validate strokes before recognition', async () => {
        const manager = new RecognitionManager(mockClient);
        const invalidStroke: Stroke = {
          id: '1',
          points: [{ x: 0, y: 0, timestamp: Date.now(), pressure: 1 }], // Only 1 point
          color: '#000000',
          width: 2,
          timestamp: Date.now(),
        };

        const result = await manager.recognizeStrokes([invalidStroke]);

        expect(result.status).toBe(RecognitionStatus.ERROR);
        expect(result.error).toContain('Invalid strokes');
      });

      it('should limit strokes to max configured', async () => {
        const manager = new RecognitionManager(mockClient, { maxStrokesPerRecognition: 2 });
        const strokes = [
          createTestStroke('1'),
          createTestStroke('2'),
          createTestStroke('3'),
        ];

        mockClient.recognize.mockResolvedValue({
          status: RecognitionStatus.SUCCESS,
          latex: 'x',
          timestamp: Date.now(),
          strokeIds: ['1', '2'],
        });

        await manager.recognizeStrokes(strokes);

        expect(mockClient.recognize).toHaveBeenCalled();
      });

      it('should return error for low confidence', async () => {
        const manager = new RecognitionManager(mockClient, { minConfidence: 0.9 });
        const strokes = [createTestStroke('1')];

        mockClient.recognize.mockResolvedValue({
          status: RecognitionStatus.SUCCESS,
          latex: 'x',
          confidence: 0.8,
          timestamp: Date.now(),
          strokeIds: ['1'],
        });

        const result = await manager.recognizeStrokes(strokes);

        expect(result.status).toBe(RecognitionStatus.ERROR);
        expect(result.error).toContain('Low confidence');
      });
    });

    describe('config management', () => {
      it('should update configuration', () => {
        const manager = new RecognitionManager(mockClient);

        manager.updateConfig({ pauseDuration: 1000 });

        expect(manager.getConfig().pauseDuration).toBe(1000);
      });

      it('should return copy of config', () => {
        const manager = new RecognitionManager(mockClient);
        const config1 = manager.getConfig();
        const config2 = manager.getConfig();

        expect(config1).not.toBe(config2);
        expect(config1).toEqual(config2);
      });
    });
  });

  describe('splitStrokesIntoLines', () => {
    it('should return empty array for no strokes', () => {
      const result = splitStrokesIntoLines([]);
      expect(result).toEqual([]);
    });

    it('should group strokes on same line', () => {
      const strokes = [
        createTestStroke('1', 100),
        createTestStroke('2', 105),
        createTestStroke('3', 110),
      ];

      const result = splitStrokesIntoLines(strokes, 50);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it('should split strokes into multiple lines', () => {
      const strokes = [
        createTestStroke('1', 100),
        createTestStroke('2', 200), // Different line
        createTestStroke('3', 105),
      ];

      const result = splitStrokesIntoLines(strokes, 50);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2); // strokes 1 and 3
      expect(result[1]).toHaveLength(1); // stroke 2
    });
  });

  describe('shouldTriggerRecognition', () => {
    it('should return false for null lastStrokeTime', () => {
      expect(shouldTriggerRecognition(null)).toBe(false);
    });

    it('should return false before pause duration', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastStrokeTime = now - 200;

      expect(shouldTriggerRecognition(lastStrokeTime, 500)).toBe(false);
    });

    it('should return true after pause duration', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastStrokeTime = now - 600;

      expect(shouldTriggerRecognition(lastStrokeTime, 500)).toBe(true);
    });
  });

  describe('formatRecognitionResult', () => {
    it('should format error result', () => {
      const result = {
        status: RecognitionStatus.ERROR,
        error: 'Test error',
        timestamp: Date.now(),
        strokeIds: [],
      };

      expect(formatRecognitionResult(result)).toBe('Error: Test error');
    });

    it('should format processing result', () => {
      const result = {
        status: RecognitionStatus.PROCESSING,
        timestamp: Date.now(),
        strokeIds: [],
      };

      expect(formatRecognitionResult(result)).toBe('Processing...');
    });

    it('should format latex result', () => {
      const result = {
        status: RecognitionStatus.SUCCESS,
        latex: 'x + 5 = 12',
        timestamp: Date.now(),
        strokeIds: [],
      };

      expect(formatRecognitionResult(result)).toBe('LaTeX: x + 5 = 12');
    });

    it('should format text result', () => {
      const result = {
        status: RecognitionStatus.SUCCESS,
        text: 'x + 5 = 12',
        timestamp: Date.now(),
        strokeIds: [],
      };

      expect(formatRecognitionResult(result)).toBe('Text: x + 5 = 12');
    });

    it('should return no result for empty success', () => {
      const result = {
        status: RecognitionStatus.SUCCESS,
        timestamp: Date.now(),
        strokeIds: [],
      };

      expect(formatRecognitionResult(result)).toBe('No result');
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return "Very High" for >= 0.95', () => {
      expect(getConfidenceLevel(0.95)).toBe('Very High');
      expect(getConfidenceLevel(1.0)).toBe('Very High');
    });

    it('should return "High" for >= 0.85', () => {
      expect(getConfidenceLevel(0.85)).toBe('High');
      expect(getConfidenceLevel(0.90)).toBe('High');
    });

    it('should return "Medium" for >= 0.70', () => {
      expect(getConfidenceLevel(0.70)).toBe('Medium');
      expect(getConfidenceLevel(0.80)).toBe('Medium');
    });

    it('should return "Low" for >= 0.50', () => {
      expect(getConfidenceLevel(0.50)).toBe('Low');
      expect(getConfidenceLevel(0.60)).toBe('Low');
    });

    it('should return "Very Low" for < 0.50', () => {
      expect(getConfidenceLevel(0.40)).toBe('Very Low');
      expect(getConfidenceLevel(0.10)).toBe('Very Low');
    });
  });

  describe('getStrokeAverageTimestamp', () => {
    it('should return stroke timestamp for empty points', () => {
      const stroke: Stroke = {
        id: '1',
        points: [],
        color: '#000000',
        width: 2,
        timestamp: 12345,
      };

      expect(getStrokeAverageTimestamp(stroke)).toBe(12345);
    });

    it('should calculate average timestamp from points', () => {
      const stroke: Stroke = {
        id: '1',
        points: [
          { x: 0, y: 0, timestamp: 100, pressure: 1 },
          { x: 10, y: 10, timestamp: 200, pressure: 1 },
          { x: 20, y: 20, timestamp: 300, pressure: 1 },
        ],
        color: '#000000',
        width: 2,
        timestamp: 100,
      };

      expect(getStrokeAverageTimestamp(stroke)).toBe(200);
    });
  });
});
