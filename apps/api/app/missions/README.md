# Missions domain (Módulo 2)

Owns `missions`, `mission_completions` and `bloom_feedback`.

- `mission_completions.group_id` is a nullable FK to `groups.id`
  (SET NULL on group delete); groups lives in Módulo 3.
- Rules (inferred): `criteria_met = engaged_minutes >= duration_minutes`;
  XP = `xp_reward` if met, else 0. XP is granted via `app.users.service.add_xp`
  and the streak via `app.wellness.service.bump_streak_for_activity`.
- `bloom_feedback` is generated at completion time with a template message;
  how the message is produced (rules/AI) is TBD per contract §3.5.