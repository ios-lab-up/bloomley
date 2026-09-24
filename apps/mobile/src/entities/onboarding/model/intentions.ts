import type { IntentionOption } from './types';

// Chip presets, as designed. Only Físico and Mental y emocional have presets
// in the source design — Social has none, so its screen only shows the
// free-text field.
export const intentionOptions: IntentionOption[] = [
  { id: 'moverme-mas', pillarId: 'fisico', label: 'Moverme más' },
  { id: 'dormir-mejor', pillarId: 'fisico', label: 'Dormir mejor' },
  { id: 'tomar-mas-agua', pillarId: 'fisico', label: 'Tomar más agua' },
  { id: 'comer-mejor', pillarId: 'fisico', label: 'Comer mejor' },
  { id: 'estirarme', pillarId: 'fisico', label: 'Estirarme' },
  { id: 'salir-al-sol', pillarId: 'fisico', label: 'Salir al sol' },
  { id: 'reducir-estres', pillarId: 'mental', label: 'Reducir estrés' },
  { id: 'tener-mas-energia', pillarId: 'mental', label: 'Tener más energía' },
  { id: 'desconectar-de-pantallas', pillarId: 'mental', label: 'Desconectar de pantallas' },
  { id: 'meditar', pillarId: 'mental', label: 'Meditar' },
  { id: 'escribir-como-me-siento', pillarId: 'mental', label: 'Escribir cómo me siento' },
];
