# Groups domain

Covers `GROUPS`, `GROUP_MEMBERSHIPS` and `GROUP_STREAKS` from the ERD (Photos/Reactions are a
separate follow-up, not included here). Depends on `app.users` for `get_current_user` and the
`users` table — see the team's parallel-work contract.

`service.record_group_activity()` is the single write-point for `group_streaks`; Module 2
(missions) should call it when a `mission_completion` with a `group_id` is created rather than
writing to `group_streaks` directly.
