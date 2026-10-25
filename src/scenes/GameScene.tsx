import { useEffect, useRef } from 'react'
import { Application, AnimatedSprite, Container, Rectangle, Sprite, Texture, Assets } from 'pixi.js'
import gsap from 'gsap'
import type { StopId } from '../data/stops'
import objParadero from '../assets/objects/paradero.png'
import objCorredor from '../assets/objects/corredor.png'
import bgInicio from '../assets/backgrounds/inicio.png'
import bgSobreMi from '../assets/backgrounds/sobre-mi.png'
import bgExperiencia from '../assets/backgrounds/experiencia.png'
import bgProyectos from '../assets/backgrounds/proyectos.png'
import bgHabilidades from '../assets/backgrounds/habilidades.png'
import bgContacto from '../assets/backgrounds/contacto.png'
import charFrontal from '../assets/character/idle-front.png'
import charWalk from '../assets/character/walk-side.png'

const backgrounds: Record<StopId, string> = {
  inicio: bgInicio,
  'sobre-mi': bgSobreMi,
  experiencia: bgExperiencia,
  proyectos: bgProyectos,
  habilidades: bgHabilidades,
  contacto: bgContacto,
}

// Linea de vereda medida a ojo en cada fondo (fraccion del alto del PNG, 2825x1540).
// Son ilustraciones independientes: no comparten el mismo horizonte, asi que cada
// stop necesita su propio valor para que el personaje no "flote" sobre la calle.
const GROUND_RATIO: Record<StopId, number> = {
  inicio: 0.849,
  'sobre-mi': 0.867,
  experiencia: 0.853,
  proyectos: 0.849,
  habilidades: 0.837,
  contacto: 0.853,
}

// Todas las medidas de juego se guardan como proporcion del alto del mundo (no como
// pixeles fijos) para que escalen con cualquier fondo/ventana. Las referencias
// originales se tomaron sobre un fondo de 941px de alto.
const CHARACTER_HEIGHT_RATIO = 200 / 941
const PARADERO_HEIGHT_RATIO = 260 / 941
const PARADERO_REACH_RATIO = 150 / 941
const WALK_SPEED_RATIO = 5 / 941 // por tick a 60fps, independiente del framerate real

// Sprites del personaje en pixel art nativo: idle-front.png es 60x140 y
// walk-side.png es una tira de 4 cuadros de 72x142. Ambos tienen el pie en la
// ultima fila del PNG, asi que el ancla inferior es exactamente 1.
const CHAR_NATIVE_HEIGHT = 140
const WALK_CELL_WIDTH = 72
const WALK_CELL_HEIGHT = 142
const WALK_FRAME_COUNT = 4
const WALK_ANIM_SPEED = 8 / 60 // ~8fps de animacion para los 4 cuadros
const CHARACTER_MARGIN = 40 // no dejar que el personaje camine fuera del arte transitable

// corredor.png (1544x392) mira a la izquierda. Medidas sobre el PNG fuente: el
// centro de la puerta esta en x=803, el vano de la puerta va de y=60 a y=270 y la
// base de las ruedas es la fila 375. El ancla va en el centro de la puerta a nivel
// de ruedas, asi bus.x es directamente "donde esta la puerta" aunque se voltee.
const BUS_DOOR_X = 803
const BUS_DOOR_HEIGHT = 210
const BUS_DOOR_BOTTOM = 270
const BUS_WHEEL_BOTTOM = 376
const BUS_FRONT_EXTENT = BUS_DOOR_X - 216 // del centro de la puerta al frontal
const BUS_REAR_EXTENT = 1335 - BUS_DOOR_X // del centro de la puerta a la cola
const BUS_DOOR_TO_CHAR = 1.05 // la puerta un pelin mas alta que el personaje
const BUS_ARRIVE_DURATION = 2.2
const BUS_LEAVE_DURATION = 1.8
const BOARD_DURATION = 0.35
const FADE_DURATION = 0.4

type CharState = 'frontal' | 'walk'

interface GameSceneProps {
  activeStop: StopId
  travelTo: StopId | null
  arriving: boolean
  onInteractParadero: () => void
  onDeparted: (stop: StopId) => void
  onArrived: () => void
}

export default function GameScene({
  activeStop,
  travelTo,
  arriving,
  onInteractParadero,
  onDeparted,
  onArrived,
}: GameSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const keysPressed = useRef<Record<string, boolean>>({})
  const onInteractRef = useRef(onInteractParadero)
  const onDepartedRef = useRef(onDeparted)
  const onArrivedRef = useRef(onArrived)
  // Solo se lee al montar la escena: indica si llegamos en el corredor o a pie.
  const arrivingRef = useRef(arriving)
  const departRef = useRef<((stop: StopId) => void) | null>(null)

  useEffect(() => {
    onInteractRef.current = onInteractParadero
    onDepartedRef.current = onDeparted
    onArrivedRef.current = onArrived
    arrivingRef.current = arriving
  }, [onInteractParadero, onDeparted, onArrived, arriving])

  useEffect(() => {
    if (travelTo) departRef.current?.(travelTo)
  }, [travelTo])

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
    let timeline: gsap.core.Timeline | null = null

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
      const charHeight = worldHeight * CHARACTER_HEIGHT_RATIO
      const charScale = charHeight / CHAR_NATIVE_HEIGHT
      const walkSpeed = worldHeight * WALK_SPEED_RATIO

      const frontalTexture = await Assets.load(charFrontal)
      frontalTexture.source.scaleMode = 'nearest'

      const walkSheet = await Assets.load(charWalk)
      walkSheet.source.scaleMode = 'nearest'
      const walkFrames: Texture[] = []
      for (let i = 0; i < WALK_FRAME_COUNT; i++) {
        walkFrames.push(
          new Texture({
            source: walkSheet.source,
            frame: new Rectangle(i * WALK_CELL_WIDTH, 0, WALK_CELL_WIDTH, WALK_CELL_HEIGHT),
          })
        )
      }

      const paraderoTexture = await Assets.load(objParadero)
      paraderoTexture.source.scaleMode = 'nearest'
      const busTexture = await Assets.load(objCorredor)
      busTexture.source.scaleMode = 'nearest'

      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      // El corredor va detras del paradero y del personaje: asi, al detenerse, la
      // puerta queda enmarcando al personaje y "subir" es simplemente desvanecerse
      // dentro de ella. La base de la puerta queda alineada con la vereda.
      const busScale = (charHeight * BUS_DOOR_TO_CHAR) / BUS_DOOR_HEIGHT
      const bus = new Sprite(busTexture)
      bus.anchor.set(BUS_DOOR_X / busTexture.width, BUS_WHEEL_BOTTOM / busTexture.height)
      bus.scale.set(-busScale, busScale) // volteado: el arte mira a la izquierda
      bus.y = groundY + (BUS_WHEEL_BOTTOM - BUS_DOOR_BOTTOM) * busScale
      bus.visible = false
      world.addChild(bus)
      const busFront = BUS_FRONT_EXTENT * busScale
      const busRear = BUS_REAR_EXTENT * busScale

      const paradero = new Sprite(paraderoTexture)
      paradero.anchor.set(0.5, 1)
      paradero.scale.set((worldHeight * PARADERO_HEIGHT_RATIO) / paraderoTexture.height)
      paradero.x = worldWidth * 0.775
      paradero.y = groundY
      world.addChild(paradero)

      // Punto donde se detiene la puerta: un poco antes del paradero, pero sin
      // que el frontal del bus se salga del fondo.
      const busStopX = Math.min(paradero.x - charHeight * 0.7, worldWidth - busFront)

      const character = new AnimatedSprite([frontalTexture])
      character.animationSpeed = WALK_ANIM_SPEED
      character.anchor.set(0.5, 1)
      character.scale.set(charScale)
      character.x = worldWidth * 0.25
      character.y = groundY
      world.addChild(character)

      let charState: CharState = 'frontal'
      let direction: 1 | -1 = 1
      let spaceWasPressed = false
      let cutscene = false
      let camX = 0
      let viewWorldWidth = worldWidth

      const setCharState = (next: CharState) => {
        if (charState === next) return
        charState = next
        if (next === 'frontal') {
          character.textures = [frontalTexture]
          character.gotoAndStop(0)
        } else {
          character.textures = walkFrames
          character.play()
        }
      }

      // Encaja el mundo en la ventana sin deformar. Por defecto ajusta por alto
      // (side-scroller clasico: siempre se ve el cielo y la calle completos) y la
      // camara recorre el ancho que sobre siguiendo al personaje. Si la ventana es
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

        viewWorldWidth = viewW / scale
        const maxCamX = Math.max(0, worldWidth - viewWorldWidth)
        const desiredCamX = character.x - viewWorldWidth / 2
        camX = Math.min(maxCamX, Math.max(0, desiredCamX))

        world.scale.set(scale)
        world.x = -camX * scale
        world.y = worldY
      }

      // El bus siempre entra y sale justo fuera de lo que ve la camara (no de los
      // bordes del fondo), para que el recorrido en pantalla dure lo mismo
      // independientemente de donde este el paradero.
      const busOffscreenLeft = () => camX - busFront - 20
      const busOffscreenRight = () => camX + viewWorldWidth + busRear + 20

      const busArrive = (tl: gsap.core.Timeline) => {
        tl.call(() => {
          bus.x = busOffscreenLeft()
          bus.visible = true
        })
        tl.to(bus, { x: busStopX, duration: BUS_ARRIVE_DURATION, ease: 'power2.out' })
      }

      const busLeave = (tl: gsap.core.Timeline) => {
        tl.to(bus, {
          x: () => busOffscreenRight(),
          duration: BUS_LEAVE_DURATION,
          ease: 'power2.in',
          onComplete: () => {
            bus.visible = false
          },
        })
      }

      const depart = (stop: StopId) => {
        if (cutscene) return
        cutscene = true
        setCharState('frontal')

        const tl = gsap.timeline()
        timeline = tl
        busArrive(tl)

        // Camina hasta la puerta y "sube": un saltito hacia dentro mientras se desvanece.
        const walkDistance = Math.abs(busStopX - character.x)
        if (walkDistance > 1) {
          tl.call(() => {
            direction = busStopX > character.x ? 1 : -1
            setCharState('walk')
          })
          tl.to(character, { x: busStopX, duration: walkDistance / (walkSpeed * 60), ease: 'none' })
          tl.call(() => setCharState('frontal'))
        }
        tl.to(character, {
          y: groundY - charHeight * 0.06,
          alpha: 0,
          duration: BOARD_DURATION,
          ease: 'power1.out',
        })
        tl.to({}, { duration: 0.3 })
        busLeave(tl)
        tl.to(world, { alpha: 0, duration: FADE_DURATION }, `-=${FADE_DURATION}`)
        tl.call(() => onDepartedRef.current(stop))
      }
      departRef.current = depart

      const arrive = () => {
        cutscene = true
        character.x = busStopX
        character.y = groundY - charHeight * 0.06
        character.alpha = 0
        world.alpha = 0
        applyCamera()

        const tl = gsap.timeline()
        timeline = tl
        tl.to(world, { alpha: 1, duration: FADE_DURATION })
        busArrive(tl)
        tl.to({}, { duration: 0.2 })
        tl.to(character, { y: groundY, alpha: 1, duration: BOARD_DURATION, ease: 'power1.in' })
        tl.to({}, { duration: 0.3 })
        busLeave(tl)
        tl.call(() => {
          cutscene = false
          onArrivedRef.current()
        })
      }

      app.ticker.add(() => {
        const dt = app.ticker.deltaTime

        if (!cutscene) {
          const movingRight = Boolean(keysPressed.current['ArrowRight'] || keysPressed.current['TouchRight'])
          const movingLeft = Boolean(keysPressed.current['ArrowLeft'] || keysPressed.current['TouchLeft'])
          const moving = movingRight !== movingLeft

          if (movingRight && !movingLeft) {
            character.x = Math.min(worldWidth - CHARACTER_MARGIN, character.x + walkSpeed * dt)
            direction = 1
          } else if (movingLeft && !movingRight) {
            character.x = Math.max(CHARACTER_MARGIN, character.x - walkSpeed * dt)
            direction = -1
          }
          setCharState(moving ? 'walk' : 'frontal')

          const distanceToParadero = Math.abs(character.x - paradero.x)
          const isNear = distanceToParadero < worldHeight * PARADERO_REACH_RATIO
          const spacePressed = Boolean(keysPressed.current[' '] || keysPressed.current['TouchInteract'])
          if (spacePressed && !spaceWasPressed && isNear) {
            onInteractRef.current()
          }
          spaceWasPressed = spacePressed
        }

        // El frontal es simetrico: solo se voltea la caminata.
        character.scale.x = charScale * (charState === 'walk' ? direction : 1)

        applyCamera()
      })

      applyCamera()
      if (arrivingRef.current) arrive()
    }

    init()

    return () => {
      cancelled = true
      timeline?.kill()
      departRef.current = null
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
