import { useEffect, useState } from 'react'
import { stops, type StopId } from '../data/stops'

interface TravelMenuProps {
  activeStop: StopId
  onSelect: (id: StopId) => void
  onClose: () => void
}

export default function TravelMenu({ activeStop, onSelect, onClose }: TravelMenuProps) {
  const destinations = stops.filter((s) => s.id !== activeStop)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % destinations.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + destinations.length) % destinations.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(destinations[selectedIndex].id)
        onClose()
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [destinations, selectedIndex, onSelect, onClose])

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
      <div className="bg-black border-4 border-white p-6 min-w-[260px] max-w-[90vw]">
        <h2 className="text-white text-[10px] sm:text-xs mb-6 leading-relaxed">¿A DÓNDE VAS?</h2>
        <ul>
          {destinations.map((stop, i) => (
            <li
              key={stop.id}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => {
                onSelect(stop.id)
                onClose()
              }}
              className={`text-[9px] sm:text-[11px] py-3 px-3 mb-1 cursor-pointer leading-relaxed transition-colors ${
                i === selectedIndex ? 'bg-white text-black' : 'text-white'
              }`}
            >
              {i === selectedIndex ? '> ' : '  '}
              {stop.label}
            </li>
          ))}
        </ul>
        <p className="text-white/40 text-[8px] mt-6 leading-relaxed">
          ↑↓ MOVER · ENTER ELEGIR · ESC VOLVER
        </p>
      </div>
    </div>
  )
}
