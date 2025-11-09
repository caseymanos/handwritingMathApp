/**
 * Tutorial Store Tests
 *
 * Unit tests for tutorialStore state management and actions.
 */

import { useTutorialStore } from '../../../app/stores/tutorialStore';
import { TutorialLessonStatus, ProblemCategory, ProblemDifficulty } from '../../../app/types/Tutorial';
import * as tutorialSync from '../../../app/utils/sync/tutorialSync';

// Mock tutorialSync module
jest.mock('../../../app/utils/sync/tutorialSync');

// Mock MMKV storage
jest.mock('../../../app/utils/storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock Sentry
jest.mock('../../../app/utils/sentry', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('TutorialStore', () => {
  beforeEach(() => {
    // Reset store state
    useTutorialStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('fetchLessons', () => {
    it('should fetch lessons from sync client', async () => {
      const mockLessons = [
        {
          id: 'lesson-1',
          slug: 'linear-equations-intro',
          title: 'Introduction to Linear Equations',
          description: 'Learn the basics',
          skillCategory: ProblemCategory.LINEAR_EQUATIONS,
          difficulty: ProblemDifficulty.EASY,
          contentType: 'video',
          videoUrl: 'https://youtube.com/watch?v=abc123',
          videoPlatform: 'youtube',
          durationSeconds: 480,
          transcript: null,
          interactiveContent: null,
          sortOrder: 1,
          prerequisites: [],
          tags: ['intro', 'basics'],
          thumbnailUrl: null,
          published: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      (tutorialSync.fetchTutorialLessons as jest.Mock).mockResolvedValue(mockLessons);

      const { fetchLessons } = useTutorialStore.getState();
      await fetchLessons();

      const { lessons, lessonsLoading } = useTutorialStore.getState();
      expect(lessons).toEqual(mockLessons);
      expect(lessonsLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      (tutorialSync.fetchTutorialLessons as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { fetchLessons } = useTutorialStore.getState();
      await fetchLessons();

      const { lessonsError, lessonsLoading } = useTutorialStore.getState();
      expect(lessonsError).toBe('Network error');
      expect(lessonsLoading).toBe(false);
    });
  });

  describe('fetchProgress', () => {
    it('should fetch progress and populate Map', async () => {
      const mockProgress = [
        {
          id: 'progress-1',
          userId: 'user-1',
          lessonId: 'lesson-1',
          status: TutorialLessonStatus.IN_PROGRESS,
          progressPercent: 50,
          videoPositionSeconds: 120,
          startedAt: Date.now(),
          completedAt: null,
          timeSpentSeconds: 240,
          lastWatchedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      (tutorialSync.fetchTutorialProgress as jest.Mock).mockResolvedValue(mockProgress);

      const { fetchProgress } = useTutorialStore.getState();
      await fetchProgress();

      const { progress } = useTutorialStore.getState();
      expect(progress.size).toBe(1);
      expect(progress.get('lesson-1')).toEqual(mockProgress[0]);
    });
  });

  describe('startLesson', () => {
    it('should set currentLesson and resume from saved position', async () => {
      const mockLesson = {
        id: 'lesson-1',
        slug: 'test-lesson',
        title: 'Test Lesson',
        description: 'Test',
        skillCategory: ProblemCategory.LINEAR_EQUATIONS,
        difficulty: ProblemDifficulty.EASY,
        contentType: 'video',
        videoUrl: 'https://youtube.com/watch?v=abc123',
        videoPlatform: 'youtube',
        durationSeconds: 480,
        transcript: null,
        interactiveContent: null,
        sortOrder: 1,
        prerequisites: [],
        tags: [],
        thumbnailUrl: null,
        published: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        lessonId: 'lesson-1',
        status: TutorialLessonStatus.IN_PROGRESS,
        progressPercent: 50,
        videoPositionSeconds: 120,
        startedAt: Date.now(),
        completedAt: null,
        timeSpentSeconds: 240,
        lastWatchedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Set up store state
      useTutorialStore.setState({
        lessons: [mockLesson],
        progress: new Map([['lesson-1', mockProgress]]),
      });

      (tutorialSync.startLesson as jest.Mock).mockResolvedValue(mockProgress);

      const { startLesson } = useTutorialStore.getState();
      await startLesson('lesson-1');

      const { currentLesson, videoPosition } = useTutorialStore.getState();
      expect(currentLesson).toEqual(mockLesson);
      expect(videoPosition).toBe(120);
    });
  });

  describe('updateVideoPosition', () => {
    it('should debounce position updates', (done) => {
      const mockLesson = {
        id: 'lesson-1',
        slug: 'test-lesson',
        title: 'Test Lesson',
        description: 'Test',
        skillCategory: ProblemCategory.LINEAR_EQUATIONS,
        difficulty: ProblemDifficulty.EASY,
        contentType: 'video',
        videoUrl: 'https://youtube.com/watch?v=abc123',
        videoPlatform: 'youtube',
        durationSeconds: 480,
        transcript: null,
        interactiveContent: null,
        sortOrder: 1,
        prerequisites: [],
        tags: [],
        thumbnailUrl: null,
        published: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useTutorialStore.setState({ currentLesson: mockLesson });

      const { updateVideoPosition } = useTutorialStore.getState();
      updateVideoPosition(60);
      updateVideoPosition(90);
      updateVideoPosition(120);

      const { videoPosition } = useTutorialStore.getState();
      expect(videoPosition).toBe(120);

      // Verify sync not called immediately (debounced)
      expect(tutorialSync.updateVideoPosition).not.toHaveBeenCalled();

      // Wait for debounce
      setTimeout(() => {
        expect(tutorialSync.updateVideoPosition).toHaveBeenCalled();
        done();
      }, 5100);
    });
  });

  describe('completeLesson', () => {
    it('should mark lesson as completed', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        lessonId: 'lesson-1',
        status: TutorialLessonStatus.COMPLETED,
        progressPercent: 100,
        videoPositionSeconds: 480,
        startedAt: Date.now(),
        completedAt: Date.now(),
        timeSpentSeconds: 480,
        lastWatchedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (tutorialSync.completeLesson as jest.Mock).mockResolvedValue(mockProgress);

      const { completeLesson } = useTutorialStore.getState();
      await completeLesson('lesson-1');

      const { progress } = useTutorialStore.getState();
      expect(progress.get('lesson-1')?.status).toBe(TutorialLessonStatus.COMPLETED);
      expect(progress.get('lesson-1')?.progressPercent).toBe(100);
    });
  });

  describe('isLessonUnlocked', () => {
    it('should return true for lessons without prerequisites', () => {
      const mockLessons = [
        {
          id: 'lesson-1',
          slug: 'intro',
          prerequisites: [],
        } as any,
      ];

      useTutorialStore.setState({ lessons: mockLessons });
      (tutorialSync.isLessonUnlocked as jest.Mock).mockReturnValue(true);

      const { isLessonUnlocked } = useTutorialStore.getState();
      expect(isLessonUnlocked('lesson-1')).toBe(true);
    });

    it('should return false for lessons with uncompleted prerequisites', () => {
      useTutorialStore.setState({
        lessons: [
          { id: 'lesson-1', slug: 'intro', prerequisites: [] } as any,
          { id: 'lesson-2', slug: 'advanced', prerequisites: ['intro'] } as any,
        ],
        progress: new Map(),
      });

      (tutorialSync.isLessonUnlocked as jest.Mock).mockReturnValue(false);

      const { isLessonUnlocked } = useTutorialStore.getState();
      expect(isLessonUnlocked('lesson-2')).toBe(false);
    });
  });

  describe('getUnlockedProblems', () => {
    it('should unlock EASY problems after 1 lesson', () => {
      const mockLessons = [
        {
          id: 'lesson-1',
          skillCategory: ProblemCategory.LINEAR_EQUATIONS,
        } as any,
      ];

      const mockProgress = new Map([
        [
          'lesson-1',
          {
            status: TutorialLessonStatus.COMPLETED,
          } as any,
        ],
      ]);

      const mockProblems = [
        { id: 'p1', category: ProblemCategory.LINEAR_EQUATIONS, difficulty: 'EASY' },
        { id: 'p2', category: ProblemCategory.LINEAR_EQUATIONS, difficulty: 'MEDIUM' },
        { id: 'p3', category: ProblemCategory.LINEAR_EQUATIONS, difficulty: 'HARD' },
      ] as any[];

      useTutorialStore.setState({ lessons: mockLessons, progress: mockProgress });

      const { getUnlockedProblems } = useTutorialStore.getState();
      const unlocked = getUnlockedProblems(ProblemCategory.LINEAR_EQUATIONS, mockProblems);

      expect(unlocked).toHaveLength(1);
      expect(unlocked[0].difficulty).toBe('EASY');
    });
  });
});