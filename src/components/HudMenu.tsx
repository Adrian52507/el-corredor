import { useState } from 'react'
import { stops, type StopId } from '../data/stops'

interface HudMenuProps {
  activeStop: StopId
  onSelectStop: (id: StopId) => void
}

export default function HudMenu({ activeStop, onSelectStop }: HudMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="absolute top-4 right-4">
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="w-11 h-11 bg-[#161B26] border-2 border-[#232a3a] text-[#EDEBE6] flex items-center justify-center"
      >
        ☰
      </button>

      {menuOpen && (
        <ul className="mt-2 bg-[#161B26] border-2 border-[#232a3a] p-2 min-w-[160px]">
          {stops.map((stop) => (
            <li
              key={stop.id}
              onClick={() => {
                onSelectStop(stop.id)
                setMenuOpen(false)
              }}
              className={`px-2 py-1 cursor-pointer text-[#EDEBE6] hover:bg-[#232a3a] ${
                activeStop === stop.id ? 'font-bold text-[#5C7CBF]' : ''
              }`}
            >
              {stop.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}