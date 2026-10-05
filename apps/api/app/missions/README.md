# Missions domain (Módulo 2)

Owns `missions`, `mission_completions` and `bloom_feedback`.

- `mission_completions.group_id` is a nullable FK to `groups.id`
  (SET NULL on group delete); groups lives in Módulo 3. If the client sends a
  `group_id`, the server validates the group exists (404) and that the user
  is a member (403) before recording the completion.
- Rules (inferred): `criteria_met = engaged_minutes >= duration_minutes`;
  XP = `xp_reward` if met, else 0. XP is granted via `app.users.service.grant_xp`
  (non-committing variant of `add_xp`) and the streak via
  `app.wellness.service.bump_streak_for_activity`.
- **Idempotent completion**: `(user_id, mission_id, completed_on)` is unique,
  so a mission is rewarded at most once per user per UTC day. A double-tap on
  "complete" returns the existing completion instead of duplicating it or
  awarding XP twice (review 2026-09-25).
- **One transaction**: completion + bloom_feedback + streak + XP are
  committed together at the end of `complete_mission`; if a concurrent
  duplicate hits the unique constraint, the transaction is rolled back and
  the existing completion is returned.
- `bloom_feedback` is generated at completion time with a template message;
  how the message is produced (rules/AI) is TBD per contract §3.5.