import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type SettingsItem = {
  id: string;
  label: string;
  icon: IconName;
} & ({ route: Href | null } | { action: 'sign-out' });

export type SettingsSection = {
  id: string;
  title: string;
  items: SettingsItem[];
};

/**
 * `route: null` = la pantalla de esa fila aun no existe, asi que no se pinta
 * (no queda una fila rota). Quien construya cada historia solo pone aqui su
 * ruta: BLO-19 foto, BLO-20 nombre, BLO-21 correo, BLO-16 seguridad,
 * BLO-17 borrar cuenta, BLO-22 notificaciones.
 */
export const settingsSections: SettingsSection[] = [
  {
    id: 'perfil',
    title: 'Perfil',
    items: [
      { id: 'foto', label: 'Foto de perfil', icon: 'camera-outline', route: '/profile-photo' },
      { id: 'nombre', label: 'Nombre y usuario', icon: 'person-outline', route: null },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta',
    items: [
      { id: 'correo', label: 'Correo', icon: 'mail-outline', route: null },
      { id: 'seguridad', label: 'Seguridad', icon: 'shield-checkmark-outline', route: null },
      { id: 'borrar', label: 'Borrar mi cuenta', icon: 'trash-outline', route: null },
    ],
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    items: [
      { id: 'preferencias', label: 'Preferencias', icon: 'notifications-outline', route: null },
    ],
  },
  {
    id: 'sesion',
    title: 'Sesión',
    items: [{ id: 'cerrar-sesion', label: 'Cerrar sesión', icon: 'log-out-outline', action: 'sign-out' }],
  },
];

export function visibleSections(sections: SettingsSection[]): SettingsSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => 'action' in item || item.route !== null),
    }))
    .filter((section) => section.items.length > 0);
}
