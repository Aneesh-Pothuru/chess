// Single-series rating trend: thin sienna line on the walnut surface, hover
// crosshair with a tooltip, responsive via viewBox. Identity is carried by the
// title (one series — no legend), values by text tokens, per the dataviz rules.

import { useMemo, useRef, useState } from 'react'
import type { RatingSample } from '../store/stats'

interface RatingChartProps {
  series: RatingSample[]
  baseline?: number
  height?: number
}

const W = 640
const PAD = { l: 44, r: 12, t: 14, b: 24 }

export function RatingChart({ series, baseline, height = 200 }: RatingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const model = useMemo(() => {
    if (series.length < 2) return null
    const ys = series.map((s) => s.rating)
    let yMin = Math.min(...ys, baseline ?? Infinity)
    let yMax = Math.max(...ys, baseline ?? -Infinity)
    const pad = Math.max(10, (yMax - yMin) * 0.15)
    yMin -= pad
    yMax += pad
    // Game-index x-axis: long idle gaps between sessions would otherwise
    // compress all the recent play into the right edge.
    const X = (i: number) => PAD.l + (i / Math.max(1, series.length - 1)) * (W - PAD.l - PAD.r)
    const Y = (r: number) => PAD.t + (1 - (r - yMin) / (yMax - yMin)) * (height - PAD.t - PAD.b)
    const points = series.map((s, i) => ({ x: X(i), y: Y(s.rating), s }))
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    // A few horizontal gridlines at round rating values.
    const step = yMax - yMin > 220 ? 100 : 50
    const grid: number[] = []
    for (let r = Math.ceil(yMin / step) * step; r <= yMax; r += step) grid.push(r)
    return { points, path, X, Y, yMin, yMax, grid }
  }, [series, baseline, height])

  if (!model) {
    return (
      <p className="muted small">
        The rating trend appears after a couple of imports or daily rating samples — play and import
        games and this fills in.
      </p>
    )
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !model) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    let bestD = Infinity
    model.points.forEach((p, i) => {
      const d = Math.abs(p.x - px)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    setHover(best)
  }

  const h = hover !== null ? model.points[hover] : null
  const first = series[0]
  const last = series[series.length - 1]
  const delta = last.rating - first.rating

  return (
    <div>
      <div className="spread small" style={{ marginBottom: '0.3rem' }}>
        <span className="muted">
          {new Date(first.at).toLocaleDateString()} → {new Date(last.at).toLocaleDateString()}
        </span>
        <span className={delta >= 0 ? 'mono' : 'mono'} style={{ color: delta >= 0 ? 'var(--laurel)' : 'var(--claret)' }}>
          {delta >= 0 ? '▲ +' : '▼ '}{delta} over {series.length} points
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Rapid rating trend from ${first.rating} to ${last.rating}`}
      >
        {model.grid.map((r) => (
          <g key={r}>
            <line x1={PAD.l} x2={W - PAD.r} y1={model.Y(r)} y2={model.Y(r)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={model.Y(r) + 3} textAnchor="end" fontSize="10" fill="var(--boxwood-dim)">
              {r}
            </text>
          </g>
        ))}
        {baseline !== undefined && (
          <g>
            <line
              x1={PAD.l} x2={W - PAD.r} y1={model.Y(baseline)} y2={model.Y(baseline)}
              stroke="var(--boxwood-dim)" strokeWidth="1" strokeDasharray="4 4"
            />
            <text x={W - PAD.r} y={model.Y(baseline) - 4} textAnchor="end" fontSize="10" fill="var(--boxwood-dim)">
              audit baseline {baseline}
            </text>
          </g>
        )}
        <path d={model.path} fill="none" stroke="var(--sienna)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <g>
            <line x1={h.x} x2={h.x} y1={PAD.t} y2={height - PAD.b} stroke="var(--boxwood-dim)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={h.x} cy={h.y} r="4" fill="var(--sienna)" stroke="var(--walnut)" strokeWidth="2" />
            <g transform={`translate(${Math.min(Math.max(h.x - 52, PAD.l), W - PAD.r - 104)}, ${PAD.t})`}>
              <rect width="104" height="30" rx="5" fill="var(--ink)" stroke="var(--line)" />
              <text x="52" y="13" textAnchor="middle" fontSize="11" fill="var(--boxwood)">
                {h.s.rating}
              </text>
              <text x="52" y="25" textAnchor="middle" fontSize="9" fill="var(--boxwood-dim)">
                {new Date(h.s.at).toLocaleDateString()}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
