import { stops, type StopId } from '../data/stops'
import { projects } from '../data/projects'
import ProjectCard from './ProjectCard'
import { experience } from '../data/experience'
import { skills } from '../data/skills'
import { about } from '../data/about'
import { contactLinks } from '../data/contact'

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

            {activeStop === 'sobre-mi' && (
                <div>
                    <p className="text-[#EDEBE6] leading-relaxed mb-4">{about.bio}</p>
                    <ul>
                        {about.highlights.map((h) => (
                            <li key={h} className="text-[#9AA1AE] text-sm mb-1">— {h}</li>
                        ))}
                    </ul>
                </div>
            )}

            {activeStop === 'contacto' && (
                <div>
                    {contactLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="block bg-[#0D1117] border-2 border-[#232a3a] text-[#5C7CBF] p-3 mb-3"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            )
            }

            {
                activeStop === 'habilidades' && (
                    <div>
                        {skills.map((skill) => (
                            <div key={skill.title} className="bg-[#0D1117] border-2 border-[#232a3a] p-4 mb-3">
                                <h3 className="text-[#EDEBE6] text-sm mb-1">{skill.title}</h3>
                                <p className="text-[#9AA1AE] text-sm">{skill.description}</p>
                            </div>
                        ))}
                    </div>
                )
            }

            {
                activeStop === 'proyectos' && (
                    projects.map((project) => <ProjectCard key={project.title} project={project} />)
                )
            }

            {
                activeStop === 'experiencia' && (
                    <div>
                        <p className="text-[#EDEBE6] mb-1">{experience.role}</p>
                        <p className="text-[#9AA1AE] text-sm mb-4">{experience.period}</p>
                        {experience.achievements.map((a) => (
                            <div key={a.title} className="bg-[#0D1117] border-2 border-[#232a3a] p-4 mb-3">
                                <h3 className="text-[#EDEBE6] text-sm mb-1">{a.title}</h3>
                                <p className="text-[#9AA1AE] text-sm">{a.description}</p>
                            </div>
                        ))}
                    </div>
                )
            }

        </div >
    )
}