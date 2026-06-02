import { useEffect, useRef } from 'react'

const NIGHT_CONFIG = {
  amplitude: 0.55,
  frequency: 1.1,
  layers: 3,
  choppiness: 0.18,
  foamThreshold: 0.85,
  depthEffect: 0.55,
  timeSpeed: 1.1,
  cellSize: 16,
  vignetteIntensity: 0.95,
  vignetteRadius: 0.32,
  vignetteSoftness: 0.85,
  contrast: 1.15,
  alphaBase: 0.42,
  alphaRange: 0.42,
}

const CHAR_SETS = {
  sky: [' ', ' ', '·', '·'],
  surface: ['~', '~', '-', '-'],
  shallow: ['-', '-', '=', '='],
  medium: ['=', '=', '#', '#'],
  deep: ['#', '#', '@', '@'],
  foam: ['*', '+', '·'],
} as const

class SimplexNoise {
  private perm: Uint8Array
  private permMod12: Uint8Array
  private readonly F3 = 1 / 3
  private readonly G3 = 1 / 6
  private readonly grad3: ReadonlyArray<readonly [number, number, number]> = [
    [1, 1, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [1, 0, -1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, -1, 1],
    [0, 1, -1],
    [0, -1, -1],
  ]

  constructor(seed: number) {
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i += 1) p[i] = i
    let s = seed || 1
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      const tmp = p[i]
      p[i] = p[j]
      p[j] = tmp
    }
    this.perm = new Uint8Array(512)
    this.permMod12 = new Uint8Array(512)
    for (let i = 0; i < 512; i += 1) {
      this.perm[i] = p[i & 255]
      this.permMod12[i] = this.perm[i] % 12
    }
  }

  noise3D(xin: number, yin: number, zin: number) {
    const { F3, G3, grad3, perm, permMod12 } = this
    const s = (xin + yin + zin) * F3
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const k = Math.floor(zin + s)
    const t = (i + j + k) * G3
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const z0 = zin - (k - t)

    let i1, j1, k1, i2, j2, k2
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1
        j1 = 0
        k1 = 0
        i2 = 1
        j2 = 1
        k2 = 0
      } else if (x0 >= z0) {
        i1 = 1
        j1 = 0
        k1 = 0
        i2 = 1
        j2 = 0
        k2 = 1
      } else {
        i1 = 0
        j1 = 0
        k1 = 1
        i2 = 1
        j2 = 0
        k2 = 1
      }
    } else {
      if (y0 < z0) {
        i1 = 0
        j1 = 0
        k1 = 1
        i2 = 0
        j2 = 1
        k2 = 1
      } else if (x0 < z0) {
        i1 = 0
        j1 = 1
        k1 = 0
        i2 = 0
        j2 = 1
        k2 = 1
      } else {
        i1 = 0
        j1 = 1
        k1 = 0
        i2 = 1
        j2 = 1
        k2 = 0
      }
    }

    const x1 = x0 - i1 + G3
    const y1 = y0 - j1 + G3
    const z1 = z0 - k1 + G3
    const x2 = x0 - i2 + 2 * G3
    const y2 = y0 - j2 + 2 * G3
    const z2 = z0 - k2 + 2 * G3
    const x3 = x0 - 1 + 3 * G3
    const y3 = y0 - 1 + 3 * G3
    const z3 = z0 - 1 + 3 * G3

    const ii = i & 255
    const jj = j & 255
    const kk = k & 255
    const gi0 = permMod12[ii + perm[jj + perm[kk]]]
    const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]
    const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]
    const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]

    const contrib = (
      t0: number,
      g: readonly [number, number, number],
      x: number,
      y: number,
      z: number,
    ) => {
      if (t0 < 0) return 0
      const t1 = t0 * t0
      return t1 * t1 * (g[0] * x + g[1] * y + g[2] * z)
    }

    const n0 = contrib(
      0.6 - x0 * x0 - y0 * y0 - z0 * z0,
      grad3[gi0],
      x0,
      y0,
      z0,
    )
    const n1 = contrib(
      0.6 - x1 * x1 - y1 * y1 - z1 * z1,
      grad3[gi1],
      x1,
      y1,
      z1,
    )
    const n2 = contrib(
      0.6 - x2 * x2 - y2 * y2 - z2 * z2,
      grad3[gi2],
      x2,
      y2,
      z2,
    )
    const n3 = contrib(
      0.6 - x3 * x3 - y3 * y3 - z3 * z3,
      grad3[gi3],
      x3,
      y3,
      z3,
    )
    return 32 * (n0 + n1 + n2 + n3)
  }
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const n = parseInt(full.slice(0, 6), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function readCssColor(
  varName: string,
  fallback: string,
): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  try {
    if (raw.startsWith('#')) return parseHexRgb(raw)
    if (raw.startsWith('rgb')) {
      const nums = raw.match(/[\d.]+/g)?.map(Number) ?? []
      if (nums.length >= 3) return [nums[0], nums[1], nums[2]]
    }
  } catch {
    // fall through
  }
  return parseHexRgb(fallback)
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function pickChar(normalized: number, isFoam: boolean) {
  if (isFoam) {
    const arr = CHAR_SETS.foam
    return arr[Math.min(arr.length - 1, Math.floor(Math.random() * arr.length))]
  }
  let arr: readonly string[]
  let local: number
  if (normalized > 0.75) {
    arr = CHAR_SETS.surface
    local = (normalized - 0.75) * 4
  } else if (normalized > 0.55) {
    arr = CHAR_SETS.shallow
    local = (normalized - 0.55) * 5
  } else if (normalized > 0.35) {
    arr = CHAR_SETS.medium
    local = (normalized - 0.35) * 5
  } else if (normalized > 0.15) {
    arr = CHAR_SETS.deep
    local = (normalized - 0.15) * 5
  } else {
    arr = CHAR_SETS.sky
    local = normalized * 6.67
  }
  const idx = Math.min(arr.length - 1, Math.floor(local * arr.length))
  return arr[idx]
}

type AsciiWaveConfig = typeof NIGHT_CONFIG

interface AsciiWaveCanvasProps {
  theme: 'light' | 'dark'
  /** 'always' = animate on mount; 'hover' = pause until pointer enters hoverTarget. */
  playMode?: 'always' | 'hover'
  /** CSS selector for ancestor to attach hover listeners to (defaults to parent element). */
  hoverTarget?: string
  /** Partial override of NIGHT_CONFIG — useful for compact card-sized variants. */
  configOverride?: Partial<AsciiWaveConfig>
  className?: string
}

export function AsciiWaveCanvas({
  theme,
  playMode = 'always',
  hoverTarget,
  configOverride,
  className,
}: AsciiWaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const cfg: AsciiWaveConfig = { ...NIGHT_CONFIG, ...configOverride }
    const noise = new SimplexNoise(Math.floor(Math.random() * 999999))
    const TAU = Math.PI * 2
    const PALETTE_SIZE = 32
    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1 / TARGET_FPS
    let time = 0
    let lastTs = 0
    let frameAcc = 0
    let running = true
    let rafId = 0
    let gridW = 0
    let gridH = 0
    let dpr = 1
    let inView = true

    // Brand colors resolved each frame so theme toggles propagate without a
    // remount race against the parent effect that sets data-theme.
    let fg: [number, number, number] = readCssColor(
      '--fg',
      theme === 'dark' ? '#fafafa' : '#09090b',
    )
    let bg: [number, number, number] = readCssColor(
      '--bg',
      theme === 'dark' ? '#09090b' : '#fafafa',
    )
    const refreshColors = () => {
      fg = readCssColor('--fg', theme === 'dark' ? '#fafafa' : '#09090b')
      bg = readCssColor('--bg', theme === 'dark' ? '#09090b' : '#fafafa')
    }

    // Per-layer quantized palette: PALETTE_SIZE rgba() strings precomputed each
    // frame, indexed by Math.floor(normalized * (PALETTE_SIZE - 1)). Eliminates
    // per-cell string allocation (was the dominant GC cost in the inner loop).
    const palettes: string[][] = Array.from({ length: cfg.layers }, () =>
      new Array<string>(PALETTE_SIZE).fill('rgba(0,0,0,0)'),
    )

    const rebuildPalettes = () => {
      for (let layer = 0; layer < cfg.layers; layer += 1) {
        const layerDepth = layer / Math.max(cfg.layers, 1)
        const layerScale = 1 - layerDepth * cfg.depthEffect * 0.6
        const target = palettes[layer]
        for (let i = 0; i < PALETTE_SIZE; i += 1) {
          const normalized = i / (PALETTE_SIZE - 1)
          let t = clamp((0.25 + normalized * 0.75) * cfg.contrast, 0, 1)
          t *= layerScale
          const r = Math.round(bg[0] + (fg[0] - bg[0]) * t)
          const g = Math.round(bg[1] + (fg[1] - bg[1]) * t)
          const b = Math.round(bg[2] + (fg[2] - bg[2]) * t)
          target[i] =
            `rgba(${r},${g},${b},${cfg.alphaBase + t * cfg.alphaRange})`
        }
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      // DPR capped to 1: ASCII grid doesn't benefit from 2× pixel density and
      // halving pixel work is the single biggest win on retina/high-DPI.
      dpr = 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      gridW = Math.ceil(rect.width / cfg.cellSize)
      gridH = Math.ceil(rect.height / cfg.cellSize)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${cfg.cellSize}px "Geist Mono", "JetBrains Mono", ui-monospace, monospace`
      ctx.textBaseline = 'top'
    }

    const freqA = cfg.frequency * TAU
    const freqB = cfg.frequency * 1.5 * TAU
    const freqC = cfg.frequency * 2.5 * TAU
    const noiseFreq = cfg.frequency * 2

    const wave = (x: number, y: number, layer: number) => {
      const layerDepth = layer / Math.max(cfg.layers, 1)
      const layerSpeed = 1 - layerDepth * cfg.depthEffect
      const layerAmp = cfg.amplitude * (1 - layerDepth * 0.3)
      const tA = time * layerSpeed
      let w = 0
      w += Math.sin(x * freqA + tA) * layerAmp
      w += Math.sin(x * freqB + tA * 1.3) * layerAmp * 0.5
      w += Math.sin(x * freqC + tA * 0.7) * layerAmp * 0.3
      const n = noise.noise3D(
        x * noiseFreq,
        y * noiseFreq + tA * 0.1,
        layer * 0.5,
      )
      w += n * cfg.choppiness * layerAmp
      w += Math.sin(y * Math.PI + tA * 0.5) * layerAmp * 0.3
      return w
    }

    const drawVignette = (w: number, h: number) => {
      if (cfg.vignetteIntensity <= 0) return
      const cx = w / 2
      const cy = h / 2
      // Use the shorter axis so the vignette feels elliptical and consistent on wide hero sections.
      const minAxis = Math.min(w, h) / 2
      const maxAxis = Math.sqrt(cx * cx + cy * cy)
      const inner = minAxis * cfg.vignetteRadius
      const outer = maxAxis * (0.55 + cfg.vignetteSoftness * 0.45)

      const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
      grad.addColorStop(0, `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0)`)
      grad.addColorStop(
        0.55,
        `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${cfg.vignetteIntensity * 0.55})`,
      )
      grad.addColorStop(
        0.85,
        `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${cfg.vignetteIntensity * 0.9})`,
      )
      grad.addColorStop(
        1,
        `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${cfg.vignetteIntensity})`,
      )
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Side fades so the ASCII tapers off on left/right too (radial alone leaves wide hero too "open").
      const sideStop = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${cfg.vignetteIntensity * 0.85})`
      const sideClear = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0)`
      const horiz = ctx.createLinearGradient(0, 0, w, 0)
      horiz.addColorStop(0, sideStop)
      horiz.addColorStop(0.18, sideClear)
      horiz.addColorStop(0.82, sideClear)
      horiz.addColorStop(1, sideStop)
      ctx.fillStyle = horiz
      ctx.fillRect(0, 0, w, h)

      const vert = ctx.createLinearGradient(0, 0, 0, h)
      vert.addColorStop(0, sideStop)
      vert.addColorStop(0.22, sideClear)
      vert.addColorStop(0.75, sideClear)
      vert.addColorStop(
        1,
        `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${cfg.vignetteIntensity})`,
      )
      ctx.fillStyle = vert
      ctx.fillRect(0, 0, w, h)
    }

    const renderFrame = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      rebuildPalettes()
      const ampInv = 1 / cfg.amplitude
      const paletteMax = PALETTE_SIZE - 1
      const cellSize = cfg.cellSize

      for (let layer = cfg.layers - 1; layer >= 0; layer -= 1) {
        const palette = palettes[layer]
        for (let gy = 0; gy < gridH; gy += 1) {
          const y = gy / gridH
          const py = gy * cellSize
          for (let gx = 0; gx < gridW; gx += 1) {
            const x = gx / gridW
            const v = wave(x, y, layer)
            let normalized = (v * ampInv + 1) * 0.5
            if (normalized < 0) normalized = 0
            else if (normalized > 1) normalized = 1
            const isFoam =
              normalized > cfg.foamThreshold && v > 0 && layer === 0
            const ch = pickChar(normalized, isFoam)
            if (ch === ' ') continue
            ctx.fillStyle = palette[(normalized * paletteMax) | 0]
            ctx.fillText(ch, gx * cellSize, py)
          }
        }
      }
      drawVignette(rect.width, rect.height)
    }

    const tick = (ts: number) => {
      if (!running) return
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : FRAME_INTERVAL
      lastTs = ts
      frameAcc += dt
      // Throttle to TARGET_FPS — skip rendering until enough time has accumulated.
      if (frameAcc >= FRAME_INTERVAL) {
        time += frameAcc * cfg.timeSpeed
        frameAcc = 0
        renderFrame()
      }
      rafId = requestAnimationFrame(tick)
    }

    const startLoop = () => {
      if (rafId) return
      lastTs = 0
      frameAcc = 0
      rafId = requestAnimationFrame(tick)
    }

    const stopLoop = () => {
      if (!rafId) return
      cancelAnimationFrame(rafId)
      rafId = 0
    }

    const onResize = () => {
      resize()
      renderFrame()
    }

    let resizeTimer = 0
    const onResizeDebounced = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(onResize, 150)
    }

    let hovered = false
    const wantsLoop = () =>
      inView &&
      document.visibilityState !== 'hidden' &&
      (playMode === 'always' || hovered)

    const applyPlayState = () => {
      if (wantsLoop()) startLoop()
      else stopLoop()
    }

    const onVisibility = () => applyPlayState()

    resize()
    renderFrame()
    applyPlayState()

    window.addEventListener('resize', onResizeDebounced)
    document.addEventListener('visibilitychange', onVisibility)

    // Pause when this specific canvas is offscreen. Generous rootMargin so it
    // starts rendering slightly before scrolling into view (no popping).
    const viewObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        inView = entry.isIntersecting
        applyPlayState()
      },
      { rootMargin: '120px 0px', threshold: 0 },
    )
    viewObserver.observe(canvas)

    // Theme/CSS-variable changes: refresh resolved colors and redraw once if idle.
    const themeObserver = new MutationObserver(() => {
      refreshColors()
      if (!rafId) renderFrame()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })

    // Hover wiring — attach to ancestor (e.g. the playground card) so the canvas
    // can pause while the card isn't hovered. Falls back to immediate parent.
    let hoverEl: HTMLElement | null = null
    const onEnter = () => {
      hovered = true
      applyPlayState()
    }
    const onLeave = () => {
      hovered = false
      applyPlayState()
    }
    if (playMode === 'hover') {
      hoverEl = hoverTarget
        ? (canvas.closest(hoverTarget) as HTMLElement | null)
        : canvas.parentElement
      if (hoverEl) {
        hoverEl.addEventListener('mouseenter', onEnter)
        hoverEl.addEventListener('mouseleave', onLeave)
        hoverEl.addEventListener('focusin', onEnter)
        hoverEl.addEventListener('focusout', onLeave)
      }
    }

    return () => {
      running = false
      stopLoop()
      window.removeEventListener('resize', onResizeDebounced)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearTimeout(resizeTimer)
      themeObserver.disconnect()
      viewObserver.disconnect()
      if (hoverEl) {
        hoverEl.removeEventListener('mouseenter', onEnter)
        hoverEl.removeEventListener('mouseleave', onLeave)
        hoverEl.removeEventListener('focusin', onEnter)
        hoverEl.removeEventListener('focusout', onLeave)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, playMode, hoverTarget])

  return (
    <div
      aria-hidden="true"
      className={`ascii-wave-backdrop${className ? ` ${className}` : ''}`}
    >
      <canvas ref={canvasRef} className="ascii-wave-canvas" />
    </div>
  )
}
