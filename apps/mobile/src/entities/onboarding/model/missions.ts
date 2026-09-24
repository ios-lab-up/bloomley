import type { EnergyLevel, Mission, PillarId } from './types';

const durationByEnergy: Record<EnergyLevel, number> = {
  low: 5,
  normal: 10,
  high: 20,
};

const missionCopyByPillar: Record<PillarId, Record<EnergyLevel, { title: string; description: string }>> = {
  fisico: {
    low: { title: 'Estírate 5 minutos', description: 'Solo brazos, cuello y espalda. Sin prisa.' },
    normal: {
      title: 'Camina 10 minutos',
      description: 'Sal a la calle o da vueltas en casa. Sin ritmo, sin meta de pasos. Solo moverte.',
    },
    high: { title: 'Muévete 20 minutos', description: 'Camina, baila o sube escaleras. Lo que te dé más ganas.' },
  },
  mental: {
    low: { title: 'Respira 5 minutos', description: 'Cierra los ojos y solo respira. Nada más.' },
    normal: { title: 'Escribe cómo te sientes', description: 'Diez minutos, sin corregir, solo dejar salir.' },
    high: { title: 'Medita 20 minutos', description: 'Encuentra un lugar tranquilo y desconecta un rato.' },
  },
  social: {
    low: { title: 'Manda un mensaje', description: 'Escríbele a alguien que quieras. Solo eso.' },
    normal: { title: 'Llama a alguien 10 minutos', description: 'Ponte al día con una persona que quieras.' },
    high: { title: 'Comparte un rato con alguien', description: 'Veinte minutos de tiempo real, sin pantallas de por medio.' },
  },
};

export function resolveFirstMission(pillarId: PillarId, energyLevel: EnergyLevel): Mission {
  const copy = missionCopyByPillar[pillarId][energyLevel];
  return {
    ...copy,
    pillarId,
    durationMinutes: durationByEnergy[energyLevel],
    xp: durationByEnergy[energyLevel],
  };
}
