# Groups domain

Covers `GROUPS`, `GROUP_MEMBERSHIPS` and `GROUP_STREAKS` from the ERD (Photos/Reactions are a
separate follow-up, not included here). Depends on `app.users` for `get_current_user` and the
`users` table — see the team's parallel-work contract.

`service.record_group_activity()` is the single write-point for `group_streaks`; Module 2
(missions) should call it when a `mission_completion` with a `group_id` is created rather than
writing to `group_streaks` directly.

The owner (`created_by`) can delete a group with `DELETE /groups/{id}`; other members get 403 and
non-members 404, like the other member-only routes.

When a member leaves or their user is deleted (Clerk `user.deleted` webhook):

- if they were the group's only member, the group is deleted (memberships and streak cascade);
- otherwise, if they owned it (`created_by`), ownership passes to the oldest remaining member by
  `joined_at`.

Both paths share `service._delete_groups_left_empty` and `service._transfer_ownership` and lock
the group rows first so concurrent leaves can't leave an empty group behind. User deletion runs
them from an ORM `before_delete` listener on `User`, so it only covers `session.delete(user)`, not
bulk or raw SQL deletes. It also takes a per-user advisory lock that `create_group` and
`join_group` share, so a group the user creates or joins while being deleted isn't left empty
or without an owner. The lock order is in the listener's docstring.

New tables referencing `groups.id` need an `ondelete` rule, or deleting a group fails: `CASCADE`
for rows that belong to the group, or `SET NULL` on a nullable column for rows that should
outlive it (like `mission_completions.group_id`).
