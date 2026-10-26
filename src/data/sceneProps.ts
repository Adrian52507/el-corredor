import type { StopId } from './stops'
import proyectos0 from '../assets/objects/cuadros/proyectos0.png'
import proyectos1 from '../assets/objects/cuadros/proyectos1.png'
import proyectos2 from '../assets/objects/cuadros/proyectos2.png'
import candados0 from '../assets/objects/candados/candados0.png'
import candados1 from '../assets/objects/candados/candados1.png'
import candados2 from '../assets/objects/candados/candados2.png'
import candados3 from '../assets/objects/candados/candados3.png'
import candados4 from '../assets/objects/candados/candados4.png'
import candados5 from '../assets/objects/candados/candados5.png'
import candados6 from '../assets/objects/candados/candados6.png'
import candados7 from '../assets/objects/candados/candados7.png'

// Un prop es un sprite fijo dibujado sobre el fondo y bajo el personaje. x/y son la
// esquina superior izquierda en pixeles del fondo NATIVO (2825x1540), no del canvas.
// texture null = slot reservado que todavia no dibuja nada.
export interface PropSlot {
  x: number
  y: number
  texture: string | null
  projectId?: string // para abrir la tarjeta del proyecto al interactuar (pendiente)
}

// --- PROYECTOS: afiches (131x182) sobre los 4 cuadros de la fachada del teatro ---
const POSTER_Y = 1057
const POSTER_SLOTS: PropSlot[] = [
  { x: 645, y: POSTER_Y, texture: proyectos0 }, // izq. exterior
  { x: 821, y: POSTER_Y, texture: proyectos1 }, // izq. interior: VERSUSME
  { x: 1852, y: POSTER_Y, texture: proyectos2 }, // der. interior: METAHUMAN
  { x: 2033, y: POSTER_Y, texture: null }, // der. exterior: queda "Mundos paralelos"
]

// --- HABILIDADES: candados (20x28) repartidos sobre la reja de malla ---
export const LOCK_COUNT = 18
export const LOCK_SEED = 0x5eed2026 // cambiala para probar otra distribucion
const LOCK_MIN_DISTANCE = 34
const LOCK_TEXTURES = [candados0, candados1, candados2, candados3, candados4, candados5, candados6, candados7]

// Zonas donde puede ir la esquina superior izquierda de un candado. Excluyen los
// arbustos con flores y los faroles. yMin=1096 deja libres los focos colgantes
// (llegan hasta y~1093) y yMax+28 < 1200 mantiene el candado fuera del muro amarillo.
const LOCK_ZONES = [
  { xMin: 520, xMax: 2270, yMin: 1096, yMax: 1160 },
  { xMin: 2600, xMax: 2770, yMin: 1096, yMax: 1160 },
]

// PRNG con semilla: mismos "aleatorios" en cada recarga.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateLocks(): PropSlot[] {
  const rand = mulberry32(LOCK_SEED)
  const zoneWidths = LOCK_ZONES.map((z) => z.xMax - z.xMin)
  const totalWidth = zoneWidths.reduce((sum, w) => sum + w, 0)
  const points: { x: number; y: number }[] = []

  // Muestreo por rechazo: se descarta cualquier punto demasiado cerca de otro.
  // El tope de intentos evita un bucle infinito si LOCK_COUNT no cabe en las zonas.
  for (let attempt = 0; points.length < LOCK_COUNT && attempt < LOCK_COUNT * 200; attempt++) {
    // Elegir zona proporcional a su ancho para que la densidad sea pareja.
    let pick = rand() * totalWidth
    let zone = LOCK_ZONES[0]
    for (let i = 0; i < LOCK_ZONES.length; i++) {
      zone = LOCK_ZONES[i]
      if (pick < zoneWidths[i]) break
      pick -= zoneWidths[i]
    }
    const x = Math.round(zone.xMin + rand() * (zone.xMax - zone.xMin))
    const y = Math.round(zone.yMin + rand() * (zone.yMax - zone.yMin))
    if (points.every((p) => Math.hypot(p.x - x, p.y - y) >= LOCK_MIN_DISTANCE)) {
      points.push({ x, y })
    }
  }

  // Colores de izquierda a derecha, sin repetir el del vecino anterior.
  points.sort((a, b) => a.x - b.x)
  let prev = -1
  return points.map(({ x, y }) => {
    let color = Math.floor(rand() * LOCK_TEXTURES.length)
    if (color === prev) color = (color + 1) % LOCK_TEXTURES.length
    prev = color
    return { x, y, texture: LOCK_TEXTURES[color] }
  })
}

export const sceneProps: Partial<Record<StopId, PropSlot[]>> = {
  proyectos: POSTER_SLOTS,
  habilidades: generateLocks(),
}
