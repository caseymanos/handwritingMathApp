/**
 * Assessment Sync Client
 *
 * Handles assessment submission, validation, and scoring.
 * Write-heavy workload with batch operations.
 */

import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from './supabaseClient';
import { enqueue, QueueItemType } from './queue';
import { serializeStroke } from './serializer';
import { captureException, addBreadcrumb } from '../sentry';
import {
  Assessment,
  AssessmentStep,
  AssessmentStroke,
  AssessmentStatus,
  AssessmentScore,
  BatchValidationRequest,
  BatchValidationResponse,
} from '../../types/Assessment';
import { Stroke } from '../../types/Canvas';

/**
 * Create new assessment attempt
 */
export async function createAssessment(assessment: Assessment): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[AssessmentSync] Cloud sync disabled, skipping assessment creation');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated, enqueueing assessment for later');
      enqueue(QueueItemType.ASSESSMENT, assessment);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.from('assessments').insert({
      id: assessment.id,
      user_id: assessment.userId,
      problem_id: assessment.problemId,
      started_at: new Date(assessment.startedAt).toISOString(),
      submitted_at: null,
      status: assessment.status,
      steps: assessment.steps,
      validation_results: null,
      score: null,
      correct_steps: 0,
      useful_steps: 0,
      total_steps: 0,
      time_spent_seconds: assessment.timeSpentSeconds,
      time_limit_seconds: assessment.timeLimitSeconds,
      metadata: assessment.metadata,
    });

    if (error) {
      console.error('[AssessmentSync] Assessment creation failed:', error);
      enqueue(QueueItemType.ASSESSMENT, assessment);
      captureException(new Error(`Assessment creation failed: ${error.message}`), {
        assessmentId: assessment.id,
      });
    } else {
      addBreadcrumb('Assessment created', 'sync', { assessmentId: assessment.id });
      console.log('[AssessmentSync] Assessment created:', assessment.id);
    }
  } catch (error) {
    console.error('[AssessmentSync] Assessment creation error:', error);
    enqueue(QueueItemType.ASSESSMENT, assessment);
    captureException(error as Error, { assessmentId: assessment.id });
  }
}

/**
 * Submit assessment for grading
 * NOTE: Batch validation is handled separately via validateAssessmentBatch
 */
export async function submitAssessment(
  assessmentId: string,
  steps: AssessmentStep[],
  timeSpent: number
): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[AssessmentSync] Cloud sync disabled, skipping submission');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated');
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('assessments')
      .update({
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        steps: steps,
        total_steps: steps.length,
        time_spent_seconds: timeSpent,
      })
      .eq('id', assessmentId);

    if (error) {
      console.error('[AssessmentSync] Assessment submission failed:', error);
      captureException(new Error(`Assessment submission failed: ${error.message}`), {
        assessmentId,
      });
    } else {
      addBreadcrumb('Assessment submitted', 'assessment', {
        assessmentId,
        stepCount: steps.length,
      });
      console.log('[AssessmentSync] Assessment submitted:', assessmentId);
    }
  } catch (error) {
    console.error('[AssessmentSync] Assessment submission error:', error);
    captureException(error as Error, { assessmentId });
  }
}

/**
 * Update assessment with validation results and score
 */
export async function updateAssessmentScore(
  assessmentId: string,
  validationResponse: BatchValidationResponse
): Promise<void> {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('assessments')
      .update({
        status: 'graded',
        validation_results: validationResponse.results,
        score: validationResponse.score.total,
        correct_steps: validationResponse.score.correctSteps,
        useful_steps: validationResponse.score.usefulSteps,
      })
      .eq('id', assessmentId);

    if (error) {
      console.error('[AssessmentSync] Score update failed:', error);
      captureException(new Error(`Score update failed: ${error.message}`), { assessmentId });
    } else {
      addBreadcrumb('Assessment graded', 'assessment', {
        assessmentId,
        score: validationResponse.score.total,
      });
      console.log('[AssessmentSync] Assessment graded:', assessmentId, validationResponse.score.total);
    }
  } catch (error) {
    console.error('[AssessmentSync] Score update error:', error);
    captureException(error as Error, { assessmentId });
  }
}

/**
 * Upload assessment stroke data (compressed)
 */
export async function uploadAssessmentStroke(
  stroke: Stroke,
  assessmentId: string,
  stepIndex: number
): Promise<void> {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated, enqueueing stroke');
      enqueue(QueueItemType.ASSESSMENT_STROKE, { stroke, assessmentId, stepIndex });
      return;
    }

    // Reuse existing stroke compression from serializer.ts
    const serialized = serializeStroke(stroke);

    const client = getSupabaseClient();
    const { error } = await client.from('assessment_strokes').insert({
      id: stroke.id,
      assessment_id: assessmentId,
      user_id: user.id,
      step_index: stepIndex,
      line_number: null, // TODO: Extract from stroke metadata
      point_count: serialized.metadata.pointCount,
      bbox: serialized.metadata.bbox,
      bytes_compressed: serialized.metadata.bytesCompressed,
      bytes_original: serialized.metadata.bytesOriginal,
      encoding: serialized.encoding,
      data: serialized.data,
    });

    if (error) {
      console.error('[AssessmentSync] Stroke upload failed:', error);
      enqueue(QueueItemType.ASSESSMENT_STROKE, { stroke, assessmentId, stepIndex });
      captureException(new Error(`Stroke upload failed: ${error.message}`), {
        strokeId: stroke.id,
      });
    } else {
      console.log('[AssessmentSync] Stroke uploaded:', stroke.id);
    }
  } catch (error) {
    console.error('[AssessmentSync] Stroke upload error:', error);
    enqueue(QueueItemType.ASSESSMENT_STROKE, { stroke, assessmentId, stepIndex });
    captureException(error as Error, { strokeId: stroke.id });
  }
}

/**
 * Batch upload multiple assessment strokes
 */
export async function batchUploadAssessmentStrokes(
  strokes: Array<{ stroke: Stroke; stepIndex: number }>,
  assessmentId: string
): Promise<void> {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated');
      return;
    }

    // Serialize all strokes
    const strokeData = strokes.map(({ stroke, stepIndex }) => {
      const serialized = serializeStroke(stroke);
      return {
        id: stroke.id,
        assessment_id: assessmentId,
        user_id: user.id,
        step_index: stepIndex,
        line_number: null,
        point_count: serialized.metadata.pointCount,
        bbox: serialized.metadata.bbox,
        bytes_compressed: serialized.metadata.bytesCompressed,
        bytes_original: serialized.metadata.bytesOriginal,
        encoding: serialized.encoding,
        data: serialized.data,
      };
    });

    const client = getSupabaseClient();
    const { error } = await client.from('assessment_strokes').insert(strokeData);

    if (error) {
      console.error('[AssessmentSync] Batch stroke upload failed:', error);
      // Enqueue individual strokes on failure
      strokes.forEach(({ stroke, stepIndex }) => {
        enqueue(QueueItemType.ASSESSMENT_STROKE, { stroke, assessmentId, stepIndex });
      });
      captureException(new Error(`Batch stroke upload failed: ${error.message}`), {
        assessmentId,
        count: strokes.length,
      });
    } else {
      addBreadcrumb('Assessment strokes uploaded', 'sync', {
        assessmentId,
        count: strokes.length,
      });
      console.log('[AssessmentSync] Batch uploaded', strokes.length, 'strokes');
    }
  } catch (error) {
    console.error('[AssessmentSync] Batch stroke upload error:', error);
    strokes.forEach(({ stroke, stepIndex }) => {
      enqueue(QueueItemType.ASSESSMENT_STROKE, { stroke, assessmentId, stepIndex });
    });
    captureException(error as Error, { assessmentId });
  }
}

/**
 * Fetch assessment history for user
 */
export async function fetchAssessmentHistory(limit: number = 20): Promise<Assessment[]> {
  if (!isCloudSyncEnabled()) {
    console.log('[AssessmentSync] Cloud sync disabled, returning empty history');
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated');
      return [];
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('[AssessmentSync] Fetch history failed:', error);
      captureException(new Error(`Fetch history failed: ${error.message}`));
      return [];
    }

    // Transform database rows to Assessment type
    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      problemId: row.problem_id,
      startedAt: new Date(row.started_at).getTime(),
      submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
      status: row.status as AssessmentStatus,
      steps: row.steps || [],
      validationResults: row.validation_results,
      score: row.score,
      correctSteps: row.correct_steps,
      usefulSteps: row.useful_steps,
      totalSteps: row.total_steps,
      timeSpentSeconds: row.time_spent_seconds,
      timeLimitSeconds: row.time_limit_seconds,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));
  } catch (error) {
    console.error('[AssessmentSync] Fetch history error:', error);
    captureException(error as Error);
    return [];
  }
}

/**
 * Fetch single assessment by ID
 */
export async function fetchAssessmentById(assessmentId: string): Promise<Assessment | null> {
  if (!isCloudSyncEnabled()) {
    console.log('[AssessmentSync] Cloud sync disabled');
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated');
      return null;
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[AssessmentSync] Fetch assessment failed:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      problemId: data.problem_id,
      startedAt: new Date(data.started_at).getTime(),
      submittedAt: data.submitted_at ? new Date(data.submitted_at).getTime() : null,
      status: data.status as AssessmentStatus,
      steps: data.steps || [],
      validationResults: data.validation_results,
      score: data.score,
      correctSteps: data.correct_steps,
      usefulSteps: data.useful_steps,
      totalSteps: data.total_steps,
      timeSpentSeconds: data.time_spent_seconds,
      timeLimitSeconds: data.time_limit_seconds,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  } catch (error) {
    console.error('[AssessmentSync] Fetch assessment error:', error);
    captureException(error as Error, { assessmentId });
    return null;
  }
}

/**
 * Fetch assessment strokes for a specific assessment
 */
export async function fetchAssessmentStrokes(assessmentId: string): Promise<AssessmentStroke[]> {
  if (!isCloudSyncEnabled()) {
    console.log('[AssessmentSync] Cloud sync disabled');
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[AssessmentSync] Not authenticated');
      return [];
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('assessment_strokes')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('user_id', user.id)
      .order('step_index', { ascending: true });

    if (error) {
      console.error('[AssessmentSync] Fetch strokes failed:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      assessmentId: row.assessment_id,
      userId: row.user_id,
      stepIndex: row.step_index,
      lineNumber: row.line_number,
      pointCount: row.point_count,
      bbox: row.bbox,
      bytesCompressed: row.bytes_compressed,
      bytesOriginal: row.bytes_original,
      encoding: row.encoding as 'delta-gzip-base64',
      data: row.data,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));
  } catch (error) {
    console.error('[AssessmentSync] Fetch strokes error:', error);
    captureException(error as Error, { assessmentId });
    return [];
  }
}

/**
 * Calculate assessment score from validation results
 * Formula: 70% correctness + 30% usefulness
 */
export function calculateAssessmentScore(
  validationResults: any[],
  totalSteps: number
): AssessmentScore {
  let correctSteps = 0;
  let usefulSteps = 0;

  const breakdown = validationResults.map((result, index) => {
    const isCorrect = result.isCorrect || false;
    const isUseful = result.isUseful || false;

    if (isCorrect) correctSteps++;
    if (isUseful) usefulSteps++;

    return {
      stepIndex: index,
      latex: result.recognizedText || '',
      isCorrect,
      isUseful,
      feedback: result.feedback || '',
      errorType: result.errorType || null,
      pointsAwarded: isCorrect && isUseful ? 1 : isCorrect ? 0.7 : 0,
    };
  });

  const correctnessScore = totalSteps > 0 ? (correctSteps / totalSteps) * 70 : 0;
  const usefulnessScore = totalSteps > 0 ? (usefulSteps / totalSteps) * 30 : 0;
  const total = Math.round(correctnessScore + usefulnessScore);

  return {
    total,
    correctnessScore: Math.round(correctnessScore),
    usefulnessScore: Math.round(usefulnessScore),
    correctSteps,
    usefulSteps,
    totalSteps,
    breakdown,
  };
}

// TODO: Implement batch validation API integration
// This would call UpStudy/CameraMath API with all steps at once
// export async function validateAssessmentBatch(
//   request: BatchValidationRequest
// ): Promise<BatchValidationResponse> {
//   // Implementation pending - will integrate with existing mathValidation.ts
// }
