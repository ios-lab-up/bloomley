import type { IntentionOption } from './types';

// Chip presets per pillar. Social presets were added beyond the source design.
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
  { id: 'llamar-a-alguien', pillarId: 'social', label: 'Llamar a alguien' },
  { id: 'escribir-a-un-amigo', pillarId: 'social', label: 'Escribir a un amigo' },
  { id: 'dar-las-gracias', pillarId: 'social', label: 'Dar las gracias' },
  { id: 'quedar-con-alguien', pillarId: 'social', label: 'Quedar con alguien' },
  { id: 'ayudar-a-alguien', pillarId: 'social', label: 'Ayudar a alguien' },
  { id: 'tiempo-en-familia', pillarId: 'social', label: 'Tiempo en familia' },
];
