import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell, LabelList,
  PieChart, Pie, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts'
import { safeParseView } from '../lib/viewSchema'
import ErrorBoundary from './ErrorBoundary'

const STATUS_COLORS = {
  good:    { bar: '#10b981', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  warning: { bar: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  bad:     { bar: '#ef4444', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  neutral: { bar: '#64748b', bg: '#f8fafc', text: '#334155', border: '#e2e8f0' },
}

const REF_COLORS = {
  red:   '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  blue:  '#3b82f6',
  gray:  '#94a3b8',
}

const SEGMENT_PALETTE = ['#c8102e', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

// ── Sanitization helpers ───────────────────────────────────────────────────────

const toNum = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const truncLabel = (s, max = 28) => {
  const str = s == null ? '' : String(s)
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

const fmtNum = (v) => {
  const n = toNum(v, null)
  if (n == null) return ''
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1)
}

function Card({ title, children, accent }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: 16,
      ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
    }}>
      {title && (
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#64748b',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          marginBottom: 12,
        }}>{title}</div>
      )}
      {children}
    </div>
  )
}

function KpiStrip({ items }) {
  const safeItems = (Array.isArray(items) ? items : []).filter(it => it && (it.label || it.value))
  if (!safeItems.length) return null
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {safeItems.map((it, i) => {
        const c = STATUS_COLORS[it.status] || STATUS_COLORS.neutral
        const value = it.value == null ? '—' : truncLabel(String(it.value), 18)
        return (
          <div key={i} style={{
            flex: '1 1 140px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${c.bar}`,
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 6,
            }}>{truncLabel(it.label, 30)}</div>
            <div style={{
              fontSize: 26, fontWeight: 700, color: '#0f172a',
              lineHeight: 1.1, marginBottom: it.sublabel ? 4 : 0,
            }}>{value}</div>
            {it.sublabel && (
              <div style={{
                fontSize: 11.5, color: c.text, fontWeight: 500,
                display: 'inline-block',
                background: c.bg, border: `1px solid ${c.border}`,
                padding: '2px 8px', borderRadius: 10, marginTop: 4,
              }}>{truncLabel(it.sublabel, 40)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BarPanel({ panel }) {
  const { x, y, y_label, color_rule, title } = panel
  const reference_lines = Array.isArray(panel.reference_lines) ? panel.reference_lines : []
  const rawData = Array.isArray(panel.data) ? panel.data : []
  if (!rawData.length || !x || !y) return null

  // Sanitize: coerce y to number, truncate long x labels, drop rows missing the y value.
  const data = rawData
    .filter(r => r && r[y] != null)
    .map(r => ({
      ...r,
      [x]: truncLabel(r[x], 18),
      [y]: toNum(r[y], null),
    }))
    .filter(r => r[y] != null)

  if (!data.length) return null

  const colorFor = (row) => {
    if (!color_rule) return '#c8102e'
    const v = toNum(row[color_rule.field], null)
    if (v == null) return '#c8102e'
    const above = v >= toNum(color_rule.threshold, 0)
    const key = above ? color_rule.above_color : color_rule.below_color
    return REF_COLORS[key] || (above ? '#ef4444' : '#10b981')
  }

  const safeRefs = reference_lines
    .map(rl => ({ ...rl, value: toNum(rl?.value, null) }))
    .filter(rl => rl.value != null)

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey={x} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false} tickLine={false}
            label={y_label ? {
              value: truncLabel(y_label, 32), angle: -90, position: 'insideLeft',
              style: { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' },
              offset: 18,
            } : undefined}
          />
          <Tooltip
            contentStyle={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 8, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />
          {safeRefs.map((rl, i) => (
            <ReferenceLine
              key={i}
              y={rl.value}
              stroke={REF_COLORS[rl.color] || '#ef4444'}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: truncLabel(rl.label, 28),
                position: 'insideTopRight',
                fill: REF_COLORS[rl.color] || '#ef4444',
                fontSize: 11, fontWeight: 600,
              }}
            />
          ))}
          <Bar dataKey={y} radius={[6, 6, 0, 0]}>
            {data.map((row, i) => (
              <Cell key={i} fill={colorFor(row)} />
            ))}
            <LabelList
              dataKey={y}
              position="top"
              style={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
              formatter={fmtNum}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

function StackedBarHorizontal({ panel }) {
  const { reference_line, title, unit = '' } = panel
  const rawSegments = Array.isArray(panel.segments) ? panel.segments : []

  // Sanitize: coerce value, drop zero/negative/invalid, truncate labels.
  const segments = rawSegments
    .map(s => ({ ...s, label: truncLabel(s?.label, 24), value: toNum(s?.value, 0) }))
    .filter(s => s.value > 0)

  if (!segments.length) return null

  const total = segments.reduce((s, x) => s + x.value, 0)
  const ref = reference_line ? toNum(reference_line.value, null) : null
  const scaleMax = Math.max(total, ref || 0, 0.0001) * 1.08
  const refColor = REF_COLORS[reference_line?.color] || '#ef4444'

  const overBudget = ref != null && total > ref
  const totalColor = overBudget ? '#b91c1c' : '#047857'
  const totalBg = overBudget ? '#fef2f2' : '#ecfdf5'

  return (
    <Card title={title}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
            {total.toFixed(1)}
          </span>
          <span style={{ fontSize: 14, color: '#64748b', marginLeft: 6 }}>{unit} total</span>
        </div>
        {ref != null && (
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: totalColor, background: totalBg,
            border: `1px solid ${overBudget ? '#fecaca' : '#a7f3d0'}`,
            padding: '3px 10px', borderRadius: 10,
          }}>
            {overBudget ? `+${(total - ref).toFixed(1)} over` : `${(ref - total).toFixed(1)} ${unit} under`} {reference_line.label}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{
          display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden',
          background: '#f1f5f9', border: '1px solid #e2e8f0',
        }}>
          {segments.map((seg, i) => {
            const pct = (seg.value / scaleMax) * 100
            const color = seg.color || SEGMENT_PALETTE[i % SEGMENT_PALETTE.length]
            return (
              <div key={i}
                title={`${seg.label}: ${seg.value} ${unit}`}
                style={{
                  width: `${pct}%`,
                  background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 600,
                  borderRight: i < segments.length - 1 ? '2px solid #fff' : 'none',
                }}>
                {pct > 6 ? seg.value : ''}
              </div>
            )
          })}
        </div>
        {ref != null && (
          <div style={{
            position: 'absolute', top: -4, bottom: -4,
            left: `${(ref / scaleMax) * 100}%`,
            width: 0, borderLeft: `2px dashed ${refColor}`,
          }}>
            <div style={{
              position: 'absolute', top: -18, left: 4,
              fontSize: 10.5, fontWeight: 700, color: refColor,
              whiteSpace: 'nowrap',
            }}>▼ {reference_line.label}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {segments.map((seg, i) => {
          const color = seg.color || SEGMENT_PALETTE[i % SEGMENT_PALETTE.length]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ color: '#475569' }}>{seg.label}</span>
              <span style={{ color: '#94a3b8' }}>·</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{seg.value} {unit}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Donut ──────────────────────────────────────────────────────────────────────

const DONUT_COLORS = ['#c8102e', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']

function DonutPanel({ panel }) {
  const { name_key, value_key, title, center_label } = panel
  const rawData = Array.isArray(panel.data) ? panel.data : []
  if (!rawData.length || !name_key || !value_key) return null

  const chartData = rawData
    .map(r => ({ name: truncLabel(r?.[name_key], 28), value: toNum(r?.[value_key], 0) }))
    .filter(r => r.value > 0)

  if (!chartData.length) return null

  const total = chartData.reduce((s, r) => s + r.value, 0)

  return (
    <Card title={title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={88} innerRadius={52}
                paddingAngle={2} strokeWidth={0}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
                formatter={(v, name) => {
                  const pct = total > 0 ? ((toNum(v, 0) / total) * 100).toFixed(1) : '0.0'
                  return [`${v} (${pct}%)`, name]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
              {center_label || 'total'}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          {chartData.map((item, i) => {
            const color = DONUT_COLORS[i % DONUT_COLORS.length]
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0',
                borderBottom: i < chartData.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{item.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.value}</span>
                <span style={{
                  fontSize: 11, color: '#94a3b8', background: '#f1f5f9',
                  padding: '1px 7px', borderRadius: 8, minWidth: 44, textAlign: 'center',
                }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ── Line / Area ────────────────────────────────────────────────────────────────

function LinePanel({ panel }) {
  const { x, y, y_label, fill, title } = panel
  const rawData = Array.isArray(panel.data) ? panel.data : []
  const rawRefs = Array.isArray(panel.reference_lines) ? panel.reference_lines : []
  if (!rawData.length || !x || !y) return null

  const data = rawData
    .filter(r => r && r[x] != null && r[y] != null)
    .map(r => ({ ...r, [x]: truncLabel(r[x], 16), [y]: toNum(r[y], null) }))
    .filter(r => r[y] != null)

  if (!data.length) return null

  const reference_lines = rawRefs
    .map(rl => ({ ...rl, value: toNum(rl?.value, null) }))
    .filter(rl => rl.value != null)

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={240}>
        {fill ? (
          <AreaChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: -8 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#c8102e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#c8102e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey={x} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
              label={y_label ? {
                value: y_label, angle: -90, position: 'insideLeft',
                style: { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' }, offset: 18,
              } : undefined}
            />
            <Tooltip
              contentStyle={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
              cursor={{ stroke: '#e2e8f0' }}
            />
            {reference_lines.map((rl, i) => (
              <ReferenceLine key={i} y={rl.value}
                stroke={REF_COLORS[rl.color] || '#ef4444'}
                strokeDasharray="5 5" strokeWidth={1.5}
                label={{ value: rl.label, position: 'insideTopRight', fill: REF_COLORS[rl.color] || '#ef4444', fontSize: 11, fontWeight: 600 }}
              />
            ))}
            <Area
              type="monotone" dataKey={y}
              stroke="#c8102e" strokeWidth={2.5}
              fill="url(#lineGrad)"
              dot={{ fill: '#c8102e', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#fff', stroke: '#c8102e', strokeWidth: 2 }}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey={x} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
            {reference_lines.map((rl, i) => (
              <ReferenceLine key={i} y={rl.value}
                stroke={REF_COLORS[rl.color] || '#ef4444'}
                strokeDasharray="5 5" strokeWidth={1.5}
                label={{ value: rl.label, position: 'insideTopRight', fill: REF_COLORS[rl.color] || '#ef4444', fontSize: 11, fontWeight: 600 }}
              />
            ))}
            <Line
              type="monotone" dataKey={y}
              stroke="#c8102e" strokeWidth={2.5}
              dot={{ fill: '#c8102e', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#fff', stroke: '#c8102e', strokeWidth: 2 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Card>
  )
}

// ── Funnel (pipeline stages) ───────────────────────────────────────────────────

const STAGE_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function FunnelPanel({ panel }) {
  const { name_key, value_key, title, highlight } = panel
  const rawData = Array.isArray(panel.data) ? panel.data : []
  if (!rawData.length || !name_key || !value_key) return null

  const data = rawData
    .map(r => ({ ...r, [name_key]: truncLabel(r?.[name_key], 38), [value_key]: toNum(r?.[value_key], 0) }))
    .filter(r => r[value_key] >= 0)

  if (!data.length) return null

  const values = data.map(r => r[value_key])
  const max = values.length ? Math.max(...values) : 0
  const total = values.reduce((s, v) => s + v, 0)

  return (
    <Card title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((row, i) => {
          const name = String(row[name_key] || '')
          const val = row[value_key]
          const pct = max > 0 ? (val / max) * 100 : 0
          const isHighlight = highlight && name.toLowerCase().includes(highlight.toLowerCase())
          const color = isHighlight ? '#ef4444' : STAGE_COLORS[i % STAGE_COLORS.length]

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: 3, alignItems: 'baseline',
                }}>
                  <span style={{
                    fontSize: 12, color: isHighlight ? '#b91c1c' : '#334155',
                    fontWeight: isHighlight ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{name}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isHighlight ? '#b91c1c' : '#0f172a',
                    marginLeft: 8, flexShrink: 0,
                  }}>{val}</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: color, borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9',
        fontSize: 11.5, color: '#64748b', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{data.length} stages</span>
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{total} total in pipeline</span>
      </div>
    </Card>
  )
}

// ── Table ──────────────────────────────────────────────────────────────────────

function TablePanel({ panel }) {
  const { columns, title } = panel
  const data = Array.isArray(panel.data) ? panel.data.filter(r => r && typeof r === 'object') : []
  if (!data.length) return null

  // Bound to first 8 columns to keep the table readable even on a malformed response.
  const proposed = Array.isArray(columns) && columns.length ? columns : Object.keys(data[0] || {})
  const cols = proposed.filter(c => typeof c === 'string').slice(0, 8)
  if (!cols.length) return null

  const isNumeric = (col) => data.every(r => r[col] == null || !isNaN(Number(r[col])))

  const fmtCell = (val, col) => {
    if (val == null || val === '') return '—'
    const n = Number(val)
    if (!isNaN(n) && val !== '') {
      if (col.includes('pct') || col.includes('rate') || col.includes('compliance')) return `${n.toFixed(1)}%`
      if (col.includes('days') || col.includes('day')) return `${n.toFixed(2)}d`
      return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2)
    }
    return String(val)
  }

  const statusColor = (val, col) => {
    if (!col.includes('pct') && !col.includes('compliance') && !col.includes('rate')) return null
    const n = Number(val)
    if (isNaN(n)) return null
    if (col.includes('compliance') || col.includes('sla')) return n >= 90 ? '#047857' : n >= 80 ? '#b45309' : '#b91c1c'
    if (col.includes('rate') || col.includes('positive')) return n <= 4 ? '#047857' : n <= 6 ? '#b45309' : '#b91c1c'
    return null
  }

  return (
    <Card title={title}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  textAlign: isNumeric(c) ? 'right' : 'left',
                  padding: '8px 12px', background: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#64748b', fontWeight: 600, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>{c.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}
                style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {cols.map(c => {
                  const color = statusColor(row[c], c)
                  return (
                    <td key={c} style={{
                      padding: '9px 12px',
                      textAlign: isNumeric(c) ? 'right' : 'left',
                      color: color || '#334155',
                      fontWeight: color ? 600 : 400,
                    }}>
                      {fmtCell(row[c], c)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Router ─────────────────────────────────────────────────────────────────────

export default function ViewRenderer({ view }) {
  if (!view?.panels?.length) return null

  const parsed = safeParseView(view)

  if (!parsed.ok) {
    return (
      <div style={{
        fontSize: 11.5, color: '#b45309', background: '#fffbeb',
        border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px',
      }}>
        Chart data could not be rendered: {parsed.errors[0]}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {parsed.data.panels.map((panel, i) => {
        let inner
        switch (panel.type) {
          case 'kpi_strip':              inner = <KpiStrip items={panel.items || []} />; break
          case 'bar':                    inner = <BarPanel panel={panel} />; break
          case 'stacked_bar_horizontal': inner = <StackedBarHorizontal panel={panel} />; break
          case 'donut':                  inner = <DonutPanel panel={panel} />; break
          case 'line':                   inner = <LinePanel panel={panel} />; break
          case 'funnel':                 inner = <FunnelPanel panel={panel} />; break
          case 'table':                  inner = <TablePanel panel={panel} />; break
          default:
            inner = (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: 12 }}>
                Unknown panel type: {panel.type}
              </div>
            )
        }
        return (
          <ErrorBoundary key={i} label={`${panel.type} panel`}>
            {inner}
          </ErrorBoundary>
        )
      })}
    </div>
  )
}
