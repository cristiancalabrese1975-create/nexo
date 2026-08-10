// Mini gráfico de tendencia sin dependencias externas: recibe valores en
// orden cronológico (más viejo -> más nuevo) y los pinta en verde o rojo.
export function Sparkline({ values, positive, width = 76, height = 26 }) {
  if (!values || values.length < 2) {
    return <span className="text-xs text-slate-300">—</span>
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pad = 3

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - pad * 2) + pad
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const color = positive ? '#10b981' : '#f43f5e'
  const lastPoint = points[points.length - 1].split(',')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.5" fill={color} />
    </svg>
  )
}
