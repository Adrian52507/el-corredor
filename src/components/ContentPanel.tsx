import { stops, type StopId } from '../data/stops'

interface ContentPanelProps {
  activeStop: StopId
}

export default function ContentPanel({ activeStop }: ContentPanelProps) {
  const stop = stops.find((s) => s.id === activeStop)

  return (
    <div>
      <h2>{stop?.label}</h2>
      <p>Contenido de "{stop?.label}" va aquí - lo llenamos con datos reales pronto.</p>
    </div>
  )
}