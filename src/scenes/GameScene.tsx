import { useEffect, useRef } from 'react'
import { Application, Sprite, AnimatedSprite, Texture, Rectangle, Assets } from 'pixi.js'
import type { StopId } from '../data/stops'
import objParadero from '../assets/objects/paradero.png'
import bgInicio from '../assets/backgrounds/inicio.png'
import bgSobreMi from '../assets/backgrounds/sobre-mi.png'
import charIdle from '../assets/character/idle-side.png'
import charWalk from '../assets/character/walk-side.png'

const backgrounds: Record<string, string> = {
  inicio: bgInicio,
  'sobre-mi': bgSobreMi,
}

interface GameSceneProps {
  activeStop: StopId
  onInteractParadero: () => void
}

export default function GameScene({ activeStop, onInteractParadero }: GameSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const keysPressed = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const app = new Application()
      await app.init({ width: 1672, height: 941, background: '#0D1117' })

      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      appRef.current = app
      containerRef.current?.appendChild(app.canvas)

      const bgTexture = await Assets.load(backgrounds[activeStop])
      bgTexture.source.scaleMode = 'nearest'
      const bg = new Sprite(bgTexture)
      app.stage.addChild(bg)

      const idleTexture = await Assets.load(charIdle)
      idleTexture.source.scaleMode = 'nearest'

      const walkSheet = await Assets.load(charWalk)
      walkSheet.source.scaleMode = 'nearest'
      const frameWidth = walkSheet.width / 4
      const walkFrames: Texture[] = []
      for (let i = 0; i < 4; i++) {
        walkFrames.push(
          new Texture({
            source: walkSheet.source,
            frame: new Rectangle(i * frameWidth, 0, frameWidth, walkSheet.height),
          })
        )
      }

      const character = new AnimatedSprite([idleTexture])
      character.animationSpeed = 0.15
      character.x = 400
      character.y = 941 * 0.85 - character.height
      app.stage.addChild(character)

      const paraderoTexture = await Assets.load(objParadero)
      paraderoTexture.source.scaleMode = 'nearest'
      const paradero = new Sprite(paraderoTexture)
      paradero.x = 1296
      paradero.y = 941 * 0.85 - paradero.height
      app.stage.addChild(paradero)

      let isWalking = false
      let spaceWasPressed = false
      const speed = 4
      app.ticker.add(() => {
        const movingRight = keysPressed.current['ArrowRight']
        const movingLeft = keysPressed.current['ArrowLeft']
        const moving = movingRight || movingLeft

        if (movingRight) {
          character.x += speed
          character.scale.x = 1
        }
        if (movingLeft) {
          character.x -= speed
          character.scale.x = -1
        }

        if (moving && !isWalking) {
          character.textures = walkFrames
          character.play()
          isWalking = true
        } else if (!moving && isWalking) {
          character.textures = [idleTexture]
          character.gotoAndStop(0)
          isWalking = false
        }
        const distanceToParadero = Math.abs(character.x - paradero.x)
        const isNear = distanceToParadero < 150

        const spacePressed = keysPressed.current[' ']
        if (spacePressed && !spaceWasPressed && isNear) {
          onInteractParadero()
        }
        spaceWasPressed = spacePressed
      })
    }

    init()

    return () => {
      cancelled = true
      appRef.current?.destroy(true, { children: true })
      appRef.current = null
    }
  }, [activeStop])

  return <div ref={containerRef} />
}