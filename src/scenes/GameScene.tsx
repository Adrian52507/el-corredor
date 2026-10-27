import { useEffect, useRef } from 'react'
import { Application, AnimatedSprite, Container, Rectangle, Sprite, Texture, Assets } from 'pixi.js'
import gsap from 'gsap'
import type { StopId } from '../data/stops'
import { sceneProps } from '../data/sceneProps'
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
  contacto: 0.848, // alineado con la base de la cabina telefonica (y=1306)
}

// Todas las medidas de juego se guardan como proporcion del alto del mundo (no como
// pixeles fijos) para que escalen con cualquier fondo/ventana. Los fondos miden
// 1540px de alto y las puertas de las fachadas ~150px, asi que el personaje y el
// paradero van a su tamano nativo (1 px del sprite = 1 px del fondo).
const BG_NATIVE_HEIGHT = 1540
const CHARACTER_HEIGHT_RATIO = 140 / BG_NATIVE_HEIGHT
const PARADERO_HEIGHT_RATIO = 207 / BG_NATIVE_HEIGHT
const PARADERO_REACH = 0.75 // en alturas de personaje
const PARADERO_X_RATIO = 0.6 // posicion horizontal del paradero (fraccion del ancho del fondo)
const BUS_STOP_GAP = 0.15 // espacio entre el frontal del bus detenido y el paradero, en alturas de personaje
const WALK_SPEED_RATIO = 6 / BG_NATIVE_HEIGHT // por tick a 60fps, independiente del framerate real

// Sprites del personaje en pixel art nativo: idle-front.png es 60x140 y
// walk-side.png es una tira de 4 cuadros de 72x142. Ambos tienen el pie en la
// ultima fila del PNG, asi que el ancla inferior es exactamente 1.
const CHAR_NATIVE_HEIGHT = 140
const WALK_CELL_WIDTH = 72
const WALK_CELL_HEIGHT = 142
const WALK_FRAME_COUNT = 4
const WALK_ANIM_SPEED = 8 / 60 // ~8fps de animacion para los 4 cuadros
const CHARACTER_MARGIN = 40 // no dejar que el personaje camine fuera del arte transitable

// corredor.png (900x302) mira a la izquierda, que es hacia donde avanza: entra por
// la derecha y sale por la izquierda, sin voltear. Medidas sobre el PNG fuente: el
// centro de la puerta esta en x=471, el vano de la puerta va de y=45 a y=220 y la
// base de las ruedas es la fila 301. El ancla va en el centro de la puerta a nivel
// de ruedas, asi bus.x es directamente "donde esta la puerta".
const BUS_DOOR_X = 471
const BUS_DOOR_HEIGHT = 175
const BUS_DOOR_BOTTOM = 220
const BUS_WHEEL_BOTTOM = 302
const BUS_FRONT_EXTENT = BUS_DOOR_X // del centro de la puerta al frontal (izquierda)
const BUS_REAR_EXTENT = 900 - BUS_DOOR_X // del centro de la puerta a la cola (derecha)
const BUS_DOOR_TO_CHAR = 1.05 // la puerta un pelin mas alta que el personaje
const BUS_ARRIVE_DURATION = 2.2
const BUS_LEAVE_DURATION = 1.8
const BOARD_DURATION = 0.35
const FADE_DURATION = 0.4

// Contorno blanco de los objetos interactuables. El grosor va en pixeles del sprite:
// con el mundo escalado por alto (~0.7 px de pantalla por px nativo en 1080p), 1 px
// se perderia al reescalar; se usan 4 para que el halo degradado se note.
const OUTLINE_PX = 4
const OUTLINE_REACH = 0.3 // en alturas de personaje, medido desde el borde del objeto
const OUTLINE_FADE = 0.2 // fraccion por tick a 60fps
const OUTLINE_PULSE_SPEED = 0.08
const OUTLINE_INNER_ALPHA = 230 // alfa (0-255) del pixel pegado a la silueta
const OUTLINE_FALLOFF = 1.1 // cuanto se apaga hacia afuera (con 4 px: 230, 167, 104, 40)
const OUTLINE_MAX_ALPHA = 0.85 // opacidad maxima del contorno encendido

type CharState = 'frontal' | 'walk'

// Genera una textura con solo el anillo de pixeles que rodea la silueta del sprite
// (dilatacion del alfa menos el original), en blanco degradado. Mide OUTLINE_PX mas por
// cada lado que la textura original.
function createOutlineTexture(texture: Texture): Texture {
  const w = texture.width
  const h = texture.height
  const pad = OUTLINE_PX
  const src = document.createElement('canvas')
  src.width = w
  src.height = h
  const srcCtx = src.getContext('2d')!
  srcCtx.drawImage(texture.source.resource as CanvasImageSource, 0, 0)
  const alpha = srcCtx.getImageData(0, 0, w, h).data
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[(y * w + x) * 4 + 3] > 0

  const out = document.createElement('canvas')
  out.width = w + pad * 2
  out.height = h + pad * 2
  const outCtx = out.getContext('2d')!
  const img = outCtx.createImageData(out.width, out.height)
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const sx = x - pad
      const sy = y - pad
      if (solid(sx, sy)) continue
      // Vecindad en rombo: esquinas redondeadas, como un contorno dibujado a mano.
      // Se guarda la distancia al pixel solido mas cercano para degradar el alfa.
      let dist = Infinity
      for (let dy = -pad; dy <= pad; dy++) {
        for (let dx = -pad; dx <= pad; dx++) {
          const d = Math.abs(dx) + Math.abs(dy)
          if (d <= pad && d < dist && solid(sx + dx, sy + dy)) dist = d
        }
      }
      if (dist <= pad) {
        // Pegado a la silueta casi opaco, hacia afuera se desvanece.
        const a = Math.round(OUTLINE_INNER_ALPHA * (1 - ((dist - 1) / pad) * OUTLINE_FALLOFF))
        img.data.set([255, 255, 255, a], (y * out.width + x) * 4)
      }
    }
  }
  outCtx.putImageData(img, 0, 0)

  const outline = Texture.from(out)
  outline.source.scaleMode = 'nearest'
  return outline
}

interface Highlight {
  outline: Sprite
  left: number
  right: number
  level: number
}

interface GameSceneProps {
  activeStop: StopId
  travelTo: StopId | null
  arriving: boolean
  inputLocked: boolean
  onInteractParadero: () => void
  onDeparted: (stop: StopId) => void
  onArrived: () => void
}

export default function GameScene({
  activeStop,
  travelTo,
  arriving,
  inputLocked,
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
  const inputLockedRef = useRef(inputLocked)
  const departRef = useRef<((stop: StopId) => void) | null>(null)

  useEffect(() => {
    onInteractRef.current = onInteractParadero
    onDepartedRef.current = onDeparted
    onArrivedRef.current = onArrived
    arrivingRef.current = arriving
    inputLockedRef.current = inputLocked
  }, [onInteractParadero, onDeparted, onArrived, arriving, inputLocked])

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
        // Pixel art: dibujar siempre en pixeles enteros para que el sprite no
        // "parpadee" al caer entre pixeles mientras camina.
        roundPixels: true,
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

      // Props de la parada (afiches, candados...): mismo scaleMode que el fondo para
      // que se vean con la misma nitidez al escalar el mundo.
      const props = (sceneProps[activeStop] ?? []).filter((p) => p.texture !== null)
      const propTextures: Texture[] = await Promise.all(props.map((p) => Assets.load(p.texture!)))
      for (const t of propTextures) t.source.scaleMode = 'nearest'

      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }

      // Hijos de world en coordenadas nativas del fondo: la camara los escala junto
      // con el fondo, asi que siempre quedan alineados. Van antes del personaje.
      const highlights: Highlight[] = []
      const addHighlight = (sprite: Sprite) => {
        const outline = new Sprite(createOutlineTexture(sprite.texture))
        outline.anchor.set(
          (sprite.anchor.x * sprite.texture.width + OUTLINE_PX) / outline.texture.width,
          (sprite.anchor.y * sprite.texture.height + OUTLINE_PX) / outline.texture.height
        )
        outline.scale.copyFrom(sprite.scale)
        outline.position.copyFrom(sprite.position)
        outline.alpha = 0
        world.addChild(outline)
        const left = sprite.x - sprite.anchor.x * sprite.width
        const highlight = { outline, left, right: left + sprite.width, level: 0 }
        highlights.push(highlight)
        return highlight
      }

      props.forEach((p, i) => {
        const sprite = new Sprite(propTextures[i])
        sprite.position.set(p.x, p.y)
        world.addChild(sprite)
        addHighlight(sprite)
      })

      const paradero = new Sprite(paraderoTexture)
      paradero.anchor.set(0.5, 1)
      paradero.scale.set((worldHeight * PARADERO_HEIGHT_RATIO) / paraderoTexture.height)
      paradero.x = worldWidth * PARADERO_X_RATIO
      paradero.y = groundY

      const character = new AnimatedSprite([frontalTexture])
      character.animationSpeed = WALK_ANIM_SPEED
      character.anchor.set(0.5, 1)
      character.scale.set(charScale)
      character.x = worldWidth * 0.25
      character.y = groundY
      world.addChild(character)
      // El paradero va delante del personaje: al pararse junto a el, queda por detras.
      world.addChild(paradero)
      const paraderoHighlight = addHighlight(paradero)

      // El corredor va en la capa superior, delante del paradero y del personaje:
      // al "subir", el personaje se desvanece por detras de la carroceria. La base
      // de la puerta queda alineada con la vereda.
      const busScale = (charHeight * BUS_DOOR_TO_CHAR) / BUS_DOOR_HEIGHT
      const bus = new Sprite(busTexture)
      bus.anchor.set(BUS_DOOR_X / busTexture.width, BUS_WHEEL_BOTTOM / busTexture.height)
      bus.scale.set(busScale)
      bus.y = groundY + (BUS_WHEEL_BOTTOM - BUS_DOOR_BOTTOM) * busScale
      bus.visible = false
      world.addChild(bus)
      const busFront = BUS_FRONT_EXTENT * busScale
      const busRear = BUS_REAR_EXTENT * busScale

      // Punto donde se detiene la puerta: el bus viene de la derecha y frena con el
      // frontal un poquito antes del paradero (sin taparlo), pero sin que la cola
      // se salga del fondo.
      const paraderoRightEdge = paradero.x + paradero.width / 2
      const busStopX = Math.min(
        paraderoRightEdge + charHeight * BUS_STOP_GAP + busFront,
        worldWidth - busRear
      )

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
        world.x = Math.round(-camX * scale)
        world.y = Math.round(worldY)
      }

      // El bus siempre entra y sale justo fuera de lo que ve la camara (no de los
      // bordes del fondo), para que el recorrido en pantalla dure lo mismo
      // independientemente de donde este el paradero.
      const busOffscreenLeft = () => camX - busRear - 20
      const busOffscreenRight = () => camX + viewWorldWidth + busFront + 20

      const busArrive = (tl: gsap.core.Timeline) => {
        tl.call(() => {
          bus.x = busOffscreenRight()
          bus.visible = true
        })
        tl.to(bus, { x: busStopX, duration: BUS_ARRIVE_DURATION, ease: 'power2.out' })
      }

      const busLeave = (tl: gsap.core.Timeline) => {
        tl.to(bus, {
          x: () => busOffscreenLeft(),
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

      let pulseTime = 0

      app.ticker.add(() => {
        const dt = app.ticker.deltaTime
        const canInteract = !cutscene && !inputLockedRef.current
        const isNearParadero = Math.abs(character.x - paradero.x) < charHeight * PARADERO_REACH

        if (canInteract) {
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

          const spacePressed = Boolean(keysPressed.current[' '] || keysPressed.current['TouchInteract'])
          if (spacePressed && !spaceWasPressed && isNearParadero) {
            onInteractRef.current()
          }
          spaceWasPressed = spacePressed
        }

        // Contornos: se encienden con un fundido cuando el personaje esta cerca del
        // objeto y laten suavemente mientras siga ahi. El paradero usa el mismo rango
        // en el que Espacio funciona.
        pulseTime += OUTLINE_PULSE_SPEED * dt
        const pulse = 0.8 + 0.2 * Math.sin(pulseTime)
        const reach = charHeight * OUTLINE_REACH
        for (const h of highlights) {
          const near =
            h === paraderoHighlight
              ? isNearParadero
              : character.x > h.left - reach && character.x < h.right + reach
          const target = canInteract && near ? 1 : 0
          h.level += (target - h.level) * Math.min(1, OUTLINE_FADE * dt)
          h.outline.alpha = h.level * pulse * OUTLINE_MAX_ALPHA
        }

        // Ambos sprites miran a la derecha en el PNG: al quedarse quieto, el
        // frontal sigue mirando hacia donde caminaba por ultima vez.
        character.scale.x = charScale * direction

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
      <div ref={containerRef} className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0D1117]" />

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
