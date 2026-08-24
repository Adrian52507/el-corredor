export interface Project {
  title: string
  description: string
  tags: string[]
  link?: string
}

export const projects: Project[] = [
  {
    title: 'El Fingidazo',
    description: 'Juego de fiestas construido con Next.js, desplegado en Vercel.',
    tags: ['Next.js', 'Vercel'],
  },
  {
    title: 'MetaHuman Pipeline',
    description: 'Pipeline de escaneo facial a personaje 3D, de Blender a MetaHuman.',
    tags: ['Blender', 'MetaHuman', 'Unreal Engine'],
  },
]