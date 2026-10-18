import { useState } from 'react'
import { type StopId } from './data/stops'
import TitleScreen from './components/TitleScreen'
import GameScene from './scenes/GameScene'
import TravelMenu from './components/TravelMenu'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [activeStop, setActiveStop] = useState<StopId>('inicio')
  const [travelMenuOpen, setTravelMenuOpen] = useState(false)

  if (!gameStarted) {
    return <TitleScreen onStart={() => setGameStarted(true)} />
  }

  return (
    <>
      <GameScene activeStop={activeStop} onInteractParadero={() => setTravelMenuOpen(true)} />
      {travelMenuOpen && (
        <TravelMenu
          activeStop={activeStop}
          onSelect={setActiveStop}
          onClose={() => setTravelMenuOpen(false)}
        />
      )}
    </>
  )
}

export default App