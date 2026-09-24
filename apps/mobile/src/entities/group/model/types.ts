/**
 * Mirrors `app/groups/schemas.py` field-for-field (snake_case, no codegen
 * yet), matching the convention in `entities/user/model/types.ts`.
 */
export type Group = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type GroupStreak = {
  id: string;
  group_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

export type GroupDetail = Group & {
  member_count: number;
  streak: GroupStreak;
};

export type GroupMember = {
  membership_id: string;
  user_id: string;
  display_name: string;
  email: string;
  joined_at: string;
};
