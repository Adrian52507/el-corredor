import { useEffect, useRef, useState } from 'react'

interface BootScreenProps {
  onFinished: () => void
}

const BOOT_LINES = [
  'CORREDOR BIOS v2.0.1',
  '(C) 2026 EL CORREDOR SYSTEMS',
  '',
  'CPU: BUS-201 PROCESSOR',
  'MEMORY TEST: 640K OK',
  '',
  'Loading route-map........... OK',
  'Loading pixel-engine........ OK',
  'Loading passengers........... OK',
  'Loading corredor-201......... OK',
  '',
  'BOOT SEQUENCE COMPLETE',
]

const CHAR_DELAY = 5
const LINE_PAUSE = 35
const END_PAUSE = 250

export default function BootScreen({ onFinished }: BootScreenProps) {
  const [lines, setLines] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [done, setDone] = useState(false)
  const skippedRef = useRef(false)

  useEffect(() => {
    let lineIndex = 0
    let charIndex = 0
    let timeoutId: number

    const finish = () => {
      if (skippedRef.current) return
      skippedRef.current = true
      onFinished()
    }

    const typeNext = () => {
      if (skippedRef.current) return
      const line = BOOT_LINES[lineIndex]

      if (charIndex <= line.length) {
        setCurrent(line.slice(0, charIndex))
        charIndex += 1
        timeoutId = window.setTimeout(typeNext, CHAR_DELAY)
        return
      }

      setLines((prev) => [...prev, line])
      setCurrent('')
      lineIndex += 1
      charIndex = 0

      if (lineIndex < BOOT_LINES.length) {
        timeoutId = window.setTimeout(typeNext, LINE_PAUSE)
      } else {
        setDone(true)
        timeoutId = window.setTimeout(finish, END_PAUSE)
      }
    }

    timeoutId = window.setTimeout(typeNext, 300)

    const skip = () => {
      window.clearTimeout(timeoutId)
      finish()
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('click', skip)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('click', skip)
    }
  }, [onFinished])

  return (
    <div className="relative w-full h-screen bg-black text-white select-none cursor-pointer overflow-hidden">
      <div className="h-full flex flex-col justify-center px-4 sm:px-10">
        <div className="max-w-3xl">
          {lines.map((line, i) => (
            <p key={i} className="text-[8px] sm:text-xs leading-relaxed whitespace-pre">
              {line || ' '}
            </p>
          ))}
          {!done && (
            <p className="text-[8px] sm:text-xs leading-relaxed whitespace-pre">
              {current}
              <span className="animate-pulse">_</span>
            </p>
          )}
        </div>
      </div>
      <p className="absolute bottom-6 left-4 sm:left-6 text-[8px] text-white/50">
        PRESS ANY KEY TO SKIP
      </p>
    </div>
  )
}
