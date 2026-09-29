/**
 * Mirrors `app/wellness/schemas.py` field-for-field (snake_case, no codegen
 * yet): CheckinCreate and CheckinRead.
 */
export type CheckinEnergyLevel = 'low' | 'medium' | 'high';

export type CheckinInput = {
  energy_level: CheckinEnergyLevel;
  intention?: string | null;
};

export type Checkin = {
  id: string;
  energy_level: string;
  intention: string | null;
  created_at: string;
};