/**
 * Mirrors `app/wellness/schemas.py::StreakRead` field-for-field (snake_case,
 * no codegen yet). `last_active_date` is a UTC calendar date or null when
 * the user has no activity yet.
 */
export type Streak = {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};