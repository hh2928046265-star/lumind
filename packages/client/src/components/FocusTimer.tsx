import { useState, useEffect, useRef } from "react"
import { Timer, Play, Pause, RotateCcw, Bell } from "lucide-react"

interface FocusTimerProps {
  onComplete?: (duration: number) => void
}

export function FocusTimer({ onComplete }: FocusTimerProps) {
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev === 0) {
            if (minutes === 0) {
              clearInterval(intervalRef.current!)
              setIsRunning(false)
              onComplete?.(25)
              return 0
            }
            setMinutes((m) => m - 1)
            return 59
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, minutes])

  const toggle = () => setIsRunning(!isRunning)
  const reset = () => { setIsRunning(false); setMinutes(25); setSeconds(0) }

  const presets = [15, 25, 45]

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-cream-light rounded-full text-xs text-ink-muted hover:text-ink transition-all"
        title="专注计时器"
      >
        <Timer size={13} />
        <span>专注</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-cream border border-cream-light rounded-full px-3 py-1.5">
      <button onClick={() => setIsExpanded(false)} className="text-ink-muted/40 hover:text-ink-muted">
        ✕
      </button>

      <div className="flex items-center gap-1">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => { setMinutes(p); setSeconds(0); setIsRunning(false) }}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
              ${minutes === p && !isRunning ? "bg-ink/10 text-ink font-medium" : "text-ink-muted hover:text-ink"}`}
          >
            {p}m
          </button>
        ))}
      </div>

      <span className="text-xs font-mono text-ink tabular-nums min-w-[45px] text-center">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>

      <button onClick={toggle} className="text-ink-muted hover:text-ink transition-colors">
        {isRunning ? <Pause size={13} /> : <Play size={13} />}
      </button>

      <button onClick={reset} className="text-ink-muted/40 hover:text-ink-muted transition-colors">
        <RotateCcw size={11} />
      </button>
    </div>
  )
}
