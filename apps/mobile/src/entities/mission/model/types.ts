/**
 * Mirrors `app/missions/schemas.py` field-for-field (snake_case, no codegen
 * yet): MissionRead, MissionCompleteRequest, MissionCompletionRead and
 * BloomFeedbackRead.
 */
export type Mission = {
  id: string;
  wellness_area_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  xp_reward: number;
};

export type MissionCompleteRequest = {
  engaged_minutes: number;
  group_id?: string | null;
};

export type MissionCompletion = {
  id: string;
  mission_id: string;
  group_id: string | null;
  engaged_minutes: number;
  xp_earned: number;
  criteria_met: boolean;
  completed_at: string;
  mission: Mission;
};

export type BloomFeedback = {
  id: string;
  mission_completion_id: string;
  message: string;
  feedback_type: 'congrats' | 'encouragement';
  created_at: string;
};