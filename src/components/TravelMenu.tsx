import { stops, type StopId } from '../data/stops'

const availableDestinations: StopId[] = ['inicio', 'sobre-mi']

interface TravelMenuProps {
  onSelect: (id: StopId) => void
  onClose: () => void
}

export default function TravelMenu({ onSelect, onClose }: TravelMenuProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-[#161B26] border-4 border-[#5C7CBF] p-6 min-w-[240px]">
        <h2 className="text-[#EDEBE6] text-sm mb-4">¿A dónde vas?</h2>
        <ul>
          {availableDestinations.map((id) => {
            const stop = stops.find((s) => s.id === id)
            return (
              <li
                key={id}
                onClick={() => {
                  onSelect(id)
                  onClose()
                }}
                className="text-[#5C7CBF] py-2 px-2 cursor-pointer hover:bg-[#232a3a]"
              >
                {stop?.label}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}