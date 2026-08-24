import { useState } from 'react'
import { type StopId } from './data/stops'
import PixiTest from './scenes/PixiTest'
import HudMenu from './components/HudMenu'
import ContentPanel from './components/ContentPanel'

function App() {
  const [activeStop, setActiveStop] = useState<StopId>('inicio')

  return (
    <>
      <HudMenu activeStop={activeStop} onSelectStop={setActiveStop} />
      <ContentPanel activeStop={activeStop} />
      <PixiTest />
    </>
  )
}

export default App