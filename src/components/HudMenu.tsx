import { stops } from '../data/stops'

export default function HudMenu() {
  return (
    <ul>
      {stops.map((stop) => (
        <li key={stop.id}>{stop.label}</li>
      ))}
    </ul>
  )
}