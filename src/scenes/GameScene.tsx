import { useEffect, useRef } from 'react'
import { Application, AnimatedSprite, Container, Rectangle, Sprite, Texture, Assets } from 'pixi.js'
import type { StopId } from '../data/stops'
import objParadero from '../assets/objects/paradero.png'
import bgInicio from '../assets/backgrounds/inicio.png'
import bgSobreMi from '../assets/backgrounds/sobre-mi.png'
import bgExperiencia from '../assets/backgrounds/experiencia.png'
import bgProyectos from '../assets/backgrounds/proyectos.png'
import bgHabilidades from '../assets/backgrounds/habilidades.png'
import bgContacto from '../assets/backgrounds/contacto.png'
import charFrontal from '../assets/character/idle-front.png'
import charSide from '../assets/character/idle-side.png'
import charWalk from '../assets/character/walk-side.png'

const backgrounds: Record<StopId, string> = {
  inicio: bgInicio,
  'sobre-mi': bgSobreMi,
  experiencia: bgExperiencia,
  proyectos: bgProyectos,
  habilidades: bgHabilidades,
  contacto: bgContacto,
}

// Linea de vereda/calzada medida a ojo en cada fondo (fraccion del alto del PNG).
// Son ilustraciones independientes: no comparten el mismo horizonte, asi que cada
// stop necesita su propio valor para que el personaje no "flote" sobre la calle.
const GROUND_RATIO: Record<StopId, number> = {
  inicio: 0.871,
  'sobre-mi': 0.843,
  experiencia: 0.854,
  proyectos: 0.824,
  habilidades: 0.784,
  contacto: 0.838,
}

// Prueba de referencia: con un fondo de ~1672x941 el personaje se veia bien a ~260px
// de alto. Se guarda como proporcion del alto del mundo, no como pixeles fijos, para
// que escale con cualquier fondo/ventana.
const CHARACTER_HEIGHT_RATIO = 200 / 941

// Las 3 artes del personaje (frontal, perfil quieto y hoja de caminata) comparten el
// mismo lienzo nativo de 1184px de alto, pero cada una trae un margen inferior propio
// (distinto recorte de exportacion). Los valores de abajo son la fila real del pie de
// cada pose dentro de ese lienzo, medida sobre el PNG fuente - no una suposicion.
const CHAR_NATIVE_HEIGHT = 1184
const CHAR_CELL_WIDTH = 1333 // walk-side.png (10664px) / 8 cuadros
const WALK_FRAME_COUNT = 8
const ANCHOR_X = 0.5
const FRONTAL_ANCHOR_Y = 1182 / CHAR_NATIVE_HEIGHT
const SIDE_ANCHOR_Y = 1180 / CHAR_NATIVE_HEIGHT
const WALK_ANCHOR_Y = 1145 / CHAR_NATIVE_HEIGHT

const WALK_SPEED = 5 // world-px por tick a 60fps (~300 world-px/s), independiente del framerate real
const WALK_ANIM_SPEED = 16 / 60 // ~16fps de animacion para los 8 cuadros
const CHARACTER_MARGIN = 40 // no dejar que el personaje camine fuera del arte transitable

type CharState = 'frontal' | 'idle' | 'walk'

interface GameSceneProps {
  activeStop: StopId
  onInteractParadero: () => void
}

export default function GameScene({ activeStop, onInteractParadero }: GameSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const keysPressed = useRef<Record<string, boolean>>({})
  const onInteractRef = useRef(onInteractParadero)

  useEffect(() => {
    onInteractRef.current = onInteractParadero
  }, [onInteractParadero])

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

  const setTouchKey = (key: string, pressed: boolean) => {
    keysPressed.current[key] = pressed
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const app = new Application()
      await app.init({
        resizeTo: containerRef.current ?? window,
        background: '#0D1117',
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })

      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      appRef.current = app
      containerRef.current?.appendChild(app.canvas)

      // "world" vive en coordenadas de pixel del fondo (worldWidth x worldHeight).
      // La camara mueve/escala este contenedor completo; nada dentro de el necesita
      // saber en que tamano de ventana esta corriendo.
      const world = new Container()
      app.stage.addChild(world)

      const bgTexture = await Assets.load(backgrounds[activeStop])
      bgTexture.source.scaleMode = 'nearest'
      const bg = new Sprite(bgTexture)
      world.addChild(bg)

      const worldWidth = bgTexture.width
      const worldHeight = bgTexture.height
      const groundY = worldHeight * GROUND_RATIO[activeStop]
      const charScale = (worldHeight * CHARACTER_HEIGHT_RATIO) / CHAR_NATIVE_HEIGHT

      const frontalTexture = await Assets.load(charFrontal)
      frontalTexture.source.scaleMode = 'nearest'
      const sideTexture = await Assets.load(charSide)
      sideTexture.source.scaleMode = 'nearest'

      const walkSheet = await Assets.load(charWalk)
      walkSheet.source.scaleMode = 'nearest'
      const walkFrames: Texture[] = []
      for (let i = 0; i < WALK_FRAME_COUNT; i++) {
        walkFrames.push(
          new Texture({
            source: walkSheet.source,
            frame: new Rectangle(i * CHAR_CELL_WIDTH, 0, CHAR_CELL_WIDTH, CHAR_NATIVE_HEIGHT),
          })
        )
      }

      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      const character = new AnimatedSprite([frontalTexture])
      character.animationSpeed = WALK_ANIM_SPEED
      character.anchor.set(ANCHOR_X, FRONTAL_ANCHOR_Y)
      character.scale.set(charScale)
      character.x = worldWidth * 0.25
      character.y = groundY
      world.addChild(character)

      const paraderoTexture = await Assets.load(objParadero)
      paraderoTexture.source.scaleMode = 'nearest'
      const paradero = new Sprite(paraderoTexture)
      paradero.anchor.set(0.5, 1)
      paradero.x = worldWidth * 0.775
      paradero.y = groundY
      world.addChild(paradero)

      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      let charState: CharState = 'frontal'
      let direction: 1 | -1 = 1
      let spaceWasPressed = false

      const setCharState = (next: CharState) => {
        if (charState === next) return
        charState = next
        if (next === 'frontal') {
          character.anchor.set(ANCHOR_X, FRONTAL_ANCHOR_Y)
          character.textures = [frontalTexture]
          character.gotoAndStop(0)
        } else if (next === 'idle') {
          character.anchor.set(ANCHOR_X, SIDE_ANCHOR_Y)
          character.textures = [sideTexture]
          character.gotoAndStop(0)
        } else {
          character.anchor.set(ANCHOR_X, WALK_ANCHOR_Y)
          character.textures = walkFrames
          character.play()
        }
      }

      // Encaja el mundo en la ventana sin deformar. Por defecto ajusta por alto
      // (side-scroller clasico: siempre se ve el cielo y la calle completos) y la
      // camara recorre el ancho que sobre seguiendo al personaje. Si la ventana es
      // mas ancha que lo que el fondo puede cubrir a esa escala, cambia a modo
      // "cover": escala tambien por ancho y recorta verticalmente desde arriba
      // (el cielo/fachadas altas, nunca la calle) para no mostrar bordes vacios.
      const applyCamera = () => {
        const viewW = app.screen.width
        const viewH = app.screen.height
        if (viewW === 0 || viewH === 0) return

        const fitHeightScale = viewH / worldHeight
        const worldWidthAtFitHeight = worldWidth * fitHeightScale

        let scale: number
        let worldY: number
        if (worldWidthAtFitHeight >= viewW) {
          scale = fitHeightScale
          worldY = 0
        } else {
          scale = viewW / worldWidth
          worldY = Math.min(0, viewH - worldHeight * scale)
        }

        const viewWorldWidth = viewW / scale
        const maxCamX = Math.max(0, worldWidth - viewWorldWidth)
        const desiredCamX = character.x - viewWorldWidth / 2
        const camX = Math.min(maxCamX, Math.max(0, desiredCamX))

        world.scale.set(scale)
        world.x = -camX * scale
        world.y = worldY
      }

      app.ticker.add(() => {
        const dt = app.ticker.deltaTime
        const movingRight = Boolean(keysPressed.current['ArrowRight'] || keysPressed.current['TouchRight'])
        const movingLeft = Boolean(keysPressed.current['ArrowLeft'] || keysPressed.current['TouchLeft'])
        const moving = movingRight !== movingLeft

        if (movingRight && !movingLeft) {
          character.x = Math.min(worldWidth - CHARACTER_MARGIN, character.x + WALK_SPEED * dt)
          direction = 1
        } else if (movingLeft && !movingRight) {
          character.x = Math.max(CHARACTER_MARGIN, character.x - WALK_SPEED * dt)
          direction = -1
        }
        character.scale.x = charScale * direction

        if (moving) {
          setCharState('walk')
        } else if (charState !== 'frontal') {
          setCharState('idle')
        }

        applyCamera()

        const distanceToParadero = Math.abs(character.x - paradero.x)
        const isNear = distanceToParadero < 150
        const spacePressed = Boolean(keysPressed.current[' '] || keysPressed.current['TouchInteract'])
        if (spacePressed && !spaceWasPressed && isNear) {
          onInteractRef.current()
        }
        spaceWasPressed = spacePressed
      })

      applyCamera()
    }

    init()

    return () => {
      cancelled = true
      appRef.current?.destroy(true, { children: true })
      appRef.current = null
    }
  }, [activeStop])

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 w-screen h-screen overflow-hidden" />

      {/* Controles tactiles: solo aparecen en dispositivos con puntero "coarse" (tactil) */}
      <div className="hidden [@media(pointer:coarse)]:flex fixed bottom-6 left-6 gap-3 z-10 select-none">
        <button
          aria-label="Izquierda"
          style={{ touchAction: 'none' }}
          onPointerDown={() => setTouchKey('TouchLeft', true)}
          onPointerUp={() => setTouchKey('TouchLeft', false)}
          onPointerLeave={() => setTouchKey('TouchLeft', false)}
          onPointerCancel={() => setTouchKey('TouchLeft', false)}
          className="w-14 h-14 bg-[#161B26]/90 border-2 border-[#232a3a] text-[#EDEBE6] text-xl flex items-center justify-center active:bg-[#232a3a]"
        >
          ←
        </button>
        <button
          aria-label="Derecha"
          style={{ touchAction: 'none' }}
          onPointerDown={() => setTouchKey('TouchRight', true)}
          onPointerUp={() => setTouchKey('TouchRight', false)}
          onPointerLeave={() => setTouchKey('TouchRight', false)}
          onPointerCancel={() => setTouchKey('TouchRight', false)}
          className="w-14 h-14 bg-[#161B26]/90 border-2 border-[#232a3a] text-[#EDEBE6] text-xl flex items-center justify-center active:bg-[#232a3a]"
        >
          →
        </button>
      </div>
      <div className="hidden [@media(pointer:coarse)]:flex fixed bottom-6 right-6 z-10 select-none">
        <button
          aria-label="Interactuar"
          style={{ touchAction: 'none' }}
          onPointerDown={() => setTouchKey('TouchInteract', true)}
          onPointerUp={() => setTouchKey('TouchInteract', false)}
          onPointerLeave={() => setTouchKey('TouchInteract', false)}
          onPointerCancel={() => setTouchKey('TouchInteract', false)}
          className="w-16 h-16 rounded-full bg-[#5C7CBF]/90 border-2 border-[#3E5A94] text-[#0D1117] text-xs font-bold flex items-center justify-center active:bg-[#3E5A94]"
        >
          OK
        </button>
      </div>
    </>
  )
}
