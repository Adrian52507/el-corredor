export type StopId = 'inicio' | 'sobre-mi' | 'experiencia' | 'proyectos' | 'habilidades' | 'contacto'

export interface Stop {
  id: StopId
  label: string
  labelEn: string
}

export const stops: Stop[] = [
  { id: 'inicio', label: 'Inicio', labelEn: 'Home' },
  { id: 'sobre-mi', label: 'Sobre mí', labelEn: 'About' },
  { id: 'experiencia', label: 'Experiencia', labelEn: 'Experience' },
  { id: 'proyectos', label: 'Proyectos', labelEn: 'Projects' },
  { id: 'habilidades', label: 'Habilidades', labelEn: 'Skills' },
  { id: 'contacto', label: 'Contacto', labelEn: 'Contact' },
]