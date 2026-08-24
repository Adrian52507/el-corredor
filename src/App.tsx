import { useState } from 'react'
import { type StopId } from './data/stops'
import PixiTest from './scenes/PixiTest'
import HudMenu from './components/HudMenu'
import ContentPanel from './components/ContentPanel'

function App() {
  const [activeStop, setActiveStop] = useState<StopId>('inicio')
  const [panelOpen, setPanelOpen] = useState(false)

  const handleSelectStop = (id: StopId) => {
    setActiveStop(id)
    setPanelOpen(true)
  }

  return (
    <>
      <HudMenu activeStop={activeStop} onSelectStop={handleSelectStop} />
      {panelOpen && (
        <ContentPanel activeStop={activeStop} onClose={() => setPanelOpen(false)} />
      )}
      <PixiTest />
    </>
  )
}

export default App