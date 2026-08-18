import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'

export default function PixiTest() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let app: Application | null = null
    let cancelled = false

    const init = async () => {
      const newApp = new Application()
      await newApp.init({ width: 400, height: 300, background: '#0D1117' })

      if (cancelled) {
        // React ya nos desmontó mientras Pixi todavía inicializaba
        newApp.destroy(true, { children: true })
        return
      }

      app = newApp
      containerRef.current?.appendChild(app.canvas)

      const square = new Graphics().rect(0, 0, 50, 50).fill(0x5c7cbf)
      square.x = 175
      square.y = 125
      app.stage.addChild(square)

      app.ticker.add(() => {
        square.rotation += 0.02
      })
    }

    init()

    return () => {
      cancelled = true
      app?.destroy(true, { children: true })
    }
  }, [])

  return <div ref={containerRef} />
}