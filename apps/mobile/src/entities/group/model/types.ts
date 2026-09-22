// Mirrors apps/api/app/groups/schemas.py — kept in sync by hand (no codegen yet).

export type Group = {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
};

export type GroupStreak = {
  id: string;
  groupId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

export type GroupDetail = Group & {
  memberCount: number;
  streak: GroupStreak;
};

export type GroupMember = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  joinedAt: string;
};
