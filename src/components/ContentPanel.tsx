import { stops, type StopId } from '../data/stops'
import { projects } from '../data/projects'
import ProjectCard from './ProjectCard'

interface ContentPanelProps {
  activeStop: StopId
  onClose: () => void
}

export default function ContentPanel({ activeStop, onClose }: ContentPanelProps) {
  const stop = stops.find((s) => s.id === activeStop)

  return (
    <div className="absolute top-0 right-0 w-1/2 h-full bg-[#161B26] border-l-4 border-[#232a3a] p-6 overflow-y-auto">
      <button
        onClick={onClose}
        className="mb-4 w-8 h-8 bg-[#0D1117] border-2 border-[#232a3a] text-[#EDEBE6]"
      >
        ✕
      </button>
      <h2 className="text-[#5C7CBF] text-lg mb-4">{stop?.label}</h2>

      {activeStop === 'proyectos' ? (
        projects.map((project) => <ProjectCard key={project.title} project={project} />)
      ) : (
        <p className="text-[#EDEBE6] leading-relaxed">
          Contenido de "{stop?.label}" va aquí — lo llenamos con datos reales pronto.
        </p>
      )}
    </div>
  )
}