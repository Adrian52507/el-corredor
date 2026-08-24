export interface Achievement {
  title: string
  description: string
}

export const experience = {
  role: 'Tech Trainee - USIL',
  period: 'Desde enero 2026',
  achievements: [
    {
      title: 'Tao (ex-Centinela)',
      description: 'Agente de IA para filtrar calidad de leads.',
    },
    {
      title: 'Evolution Connect',
      description: 'Juego de networking para evento ejecutivo, adoptado como formato oficial.',
    },
  ] as Achievement[],
}