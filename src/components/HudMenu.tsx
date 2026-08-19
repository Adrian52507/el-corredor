import { useState } from 'react'
import { stops, type StopId } from '../data/stops'

export default function HudMenu() {
  const [activeStop, setActiveStop] = useState<StopId>('inicio')

  return (
    <ul>
      {stops.map((stop) => (
        <li
          key={stop.id}
          onClick={() => setActiveStop(stop.id)}
          style={{
            fontWeight: activeStop === stop.id ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          {stop.label}
        </li>
      ))}
    </ul>
  )
}