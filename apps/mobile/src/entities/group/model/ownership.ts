import type { Group } from './types';

/** Owner-only actions (rename, add/remove members, delete) are checked by the
 * API too; this only decides what the UI offers. */
export function isGroupOwner(group: Group, userId: string | undefined): boolean {
  return !!userId && group.created_by === userId;
}
