import { stops, type StopId } from '../data/stops'

interface TravelMenuProps {
  activeStop: StopId
  onSelect: (id: StopId) => void
  onClose: () => void
}

export default function TravelMenu({ activeStop, onSelect, onClose }: TravelMenuProps) {
  const destinations = stops.filter((s) => s.id !== activeStop)

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-[#161B26] border-4 border-[#5C7CBF] p-6 min-w-[240px] max-w-[90vw]">
        <h2 className="text-[#EDEBE6] text-sm mb-4">¿A dónde vas?</h2>
        <ul>
          {destinations.map((stop) => (
            <li
              key={stop.id}
              onClick={() => {
                onSelect(stop.id)
                onClose()
              }}
              className="text-[#5C7CBF] py-2 px-2 cursor-pointer hover:bg-[#232a3a]"
            >
              {stop.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
