import { useEffect, useRef } from 'react'

// One burst, once, in the paper palette. No library. Honours reduced-motion.
export default function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!fire) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr)
    const colours = ['#f2a93b', '#1f7a4d', '#1b1a17', '#d98b19', '#e3ded2']
    const bits = Array.from({ length: 90 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 7,
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      col: colours[Math.floor(Math.random() * colours.length)],
    }))
    let t = 0, raf = 0
    const tick = () => {
      t++; ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (const b of bits) {
        b.vy += 0.22; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vx *= 0.995
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.col
        ctx.globalAlpha = Math.max(0, 1 - t / 110); ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore()
      }
      if (t < 115) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fire])
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }} />
}
