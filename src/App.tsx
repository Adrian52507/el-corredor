import { useState } from 'react'
import { type StopId } from './data/stops'
import TitleScreen from './components/TitleScreen'
import GameScene from './scenes/GameScene'
import TravelMenu from './components/TravelMenu'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [activeStop, setActiveStop] = useState<StopId>('inicio')
  const [travelMenuOpen, setTravelMenuOpen] = useState(false)
  // Viaje en curso: travelTo dispara la salida en el corredor; cuando el bus deja
  // la escena se cambia de parada y arriving reproduce la llegada en la nueva.
  const [travelTo, setTravelTo] = useState<StopId | null>(null)
  const [arriving, setArriving] = useState(false)

  if (!gameStarted) {
    return <TitleScreen onStart={() => setGameStarted(true)} />
  }

  return (
    <>
      <GameScene
        activeStop={activeStop}
        travelTo={travelTo}
        arriving={arriving}
        onInteractParadero={() => setTravelMenuOpen(true)}
        onDeparted={(stop) => {
          setActiveStop(stop)
          setTravelTo(null)
          setArriving(true)
        }}
        onArrived={() => setArriving(false)}
      />
      {travelMenuOpen && (
        <TravelMenu
          activeStop={activeStop}
          onSelect={setTravelTo}
          onClose={() => setTravelMenuOpen(false)}
        />
      )}
    </>
  )
}

export default App