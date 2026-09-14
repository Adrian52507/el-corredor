import { useState } from 'react'
import { type StopId } from './data/stops'
import HudMenu from './components/HudMenu'
import ContentPanel from './components/ContentPanel'
import TitleScreen from './components/TitleScreen'
import GameScene from './scenes/GameScene'
import TravelMenu from './components/TravelMenu'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [activeStop, setActiveStop] = useState<StopId>('inicio')
  const [panelOpen, setPanelOpen] = useState(false)
  const [travelMenuOpen, setTravelMenuOpen] = useState(false)

  const handleSelectStop = (id: StopId) => {
    setActiveStop(id)
    setPanelOpen(id !== 'inicio')
  }

  if (!gameStarted) {
    return <TitleScreen onStart={() => setGameStarted(true)} />
  }

  return (
    <>
      <GameScene activeStop={activeStop} onInteractParadero={() => setTravelMenuOpen(true)} />
      {travelMenuOpen && (
        <TravelMenu
          onSelect={(id) => setActiveStop(id)}
          onClose={() => setTravelMenuOpen(false)}
        />
      )}
      <HudMenu activeStop={activeStop} onSelectStop={handleSelectStop} />
      {panelOpen && (
        <ContentPanel activeStop={activeStop} onClose={() => setPanelOpen(false)} />
      )}
      <HudMenu activeStop={activeStop} onSelectStop={handleSelectStop} />
      {panelOpen && (
        <ContentPanel activeStop={activeStop} onClose={() => setPanelOpen(false)} />
      )}
    </>
  )
}

export default App