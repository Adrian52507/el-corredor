import type { Project } from '../data/projects'

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="bg-[#0D1117] border-2 border-[#232a3a] p-4 mb-4">
      <h3 className="text-[#EDEBE6] text-sm mb-2">{project.title}</h3>
      <p className="text-[#9AA1AE] text-sm mb-3">{project.description}</p>
      <div>
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="inline-block text-xs text-[#5C7CBF] border border-[#3E5A94] px-2 py-1 mr-2"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}