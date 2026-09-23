/**
 * Mirrors `app/users/schemas.py` field-for-field (snake_case, no codegen
 * yet) so there's one obvious place to update both sides when the API
 * schema changes.
 */
export type User = {
  id: string;
  email: string;
  display_name: string;
  xp_total: number;
  level: number;
};

export type NotificationSettings = {
  enabled: boolean;
  frequency: string;
};

export type PushTokenPayload = {
  expo_push_token: string;
  device_id: string;
  platform: 'ios' | 'android';
};
