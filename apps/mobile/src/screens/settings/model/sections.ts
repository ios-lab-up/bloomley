import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type SettingsItem = {
  id: string;
  label: string;
  icon: IconName;
} & ({ route: Href } | { action: 'sign-out' });

export type SettingsSection = {
  id: string;
  title: string;
  items: SettingsItem[];
};

export const settingsSections: SettingsSection[] = [
  {
    id: 'perfil',
    title: 'Perfil',
    items: [
      { id: 'foto', label: 'Foto de perfil', icon: 'camera-outline', route: '/profile-photo' },
      { id: 'nombre', label: 'Nombre y usuario', icon: 'person-outline', route: '/edit-profile' },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta',
    items: [
      { id: 'correo', label: 'Correo', icon: 'mail-outline', route: '/edit-email' },
      { id: 'seguridad', label: 'Seguridad', icon: 'shield-checkmark-outline', route: '/settings/security' },
      { id: 'borrar', label: 'Borrar mi cuenta', icon: 'trash-outline', route: '/settings/delete-account' },
    ],
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    items: [
      {
        id: 'preferencias',
        label: 'Preferencias',
        icon: 'notifications-outline',
        route: '/notification-settings',
      },
    ],
  },
  {
    id: 'sesion',
    title: 'Sesión',
    items: [{ id: 'cerrar-sesion', label: 'Cerrar sesión', icon: 'log-out-outline', action: 'sign-out' }],
  },
];
