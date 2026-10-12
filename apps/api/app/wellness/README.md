# Wellness domain (Módulo 2)

Owns `wellness_areas`, `user_wellness_areas`, `checkins` and `streaks`.

Streak rule (inferred from docs/USERS_AUTH_CONTRACT.md §3): global, 1:1 with
users — advances one "active day" per mission completed with `criteria_met`.
`bump_streak_for_activity` is the only write path; other domains call it,
they never touch the `streaks` table directly.