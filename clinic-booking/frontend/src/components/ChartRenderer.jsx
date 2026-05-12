import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  LineChart, Line, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const COLORS = ['#c8102e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

const darkTooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    color: '#1e293b',
    fontSize: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  labelStyle: { color: '#64748b', fontSize: 11 },
  itemStyle: { color: '#1e293b' },
}

const axisStyle = { fill: '#94a3b8', fontSize: 11 }

const SKIP_KEYS = new Set(['client_id', 'date_range', 'total', 'total_tests', 'total_in_progress'])

function flatToArray(data) {
  return Object.entries(data)
    .filter(([k, v]) => typeof v === 'number' && !SKIP_KEYS.has(k))
    .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: v }))
}

const chartContainer = (content) => (
  <div style={{
    background: '#fff', borderRadius: 10,
    padding: '16px', border: '1px solid #e2e8f0',
  }}>
    {content}
  </div>
)

const SKIP_STAT_KEYS = new Set(['client_id', 'date_range', 'total_tests', 'total_in_progress'])

function fmtNumber(v) {
  if (!Number.isFinite(v)) return v
  return Number.isInteger(v) ? v.toLocaleString() : v % 1 < 0.05 ? Math.round(v).toLocaleString() : v.toFixed(1)
}

function coerce(rows) {
  return rows.map(row => {
    const out = {}
    for (const [k, v] of Object.entries(row)) {
      out[k] = (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) ? Number(v) : v
    }
    return out
  })
}

export default function ChartRenderer({ visualization, data }) {
  if (visualization === 'stat') {
    const entries = Object.entries(data).filter(
      ([k, v]) => typeof v === 'number' && !SKIP_STAT_KEYS.has(k)
    )
    if (!entries.length) return null
    return chartContainer(
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{
            flex: '1 1 120px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '16px 14px', textAlign: 'center',
            borderTop: `3px solid ${COLORS[i % COLORS.length]}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              {fmtNumber(v)}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {k.replace(/_/g, ' ')}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (visualization === 'bar_chart') {
    const chartData = coerce(data.breakdown || data.analytes || (!Array.isArray(data) ? flatToArray(data) : []))
    if (!chartData.length) return null
    const nameKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') || 'label'
    const numericKeys = Object.keys(chartData[0]).filter(k => typeof chartData[0][k] === 'number')
    return chartContainer(
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey={nameKey} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip {...darkTooltipStyle} />
          {numericKeys.length > 1 && (
            <Legend formatter={v => <span style={{ color: '#64748b', fontSize: 11 }}>{v}</span>} />
          )}
          {numericKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'pie_chart') {
    const chartData = coerce(data.breakdown || (!Array.isArray(data) ? flatToArray(data) : []))
    if (!chartData.length) return null
    const nameKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') || 'label'
    const valueKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'number') || 'count'
    return chartContainer(
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%" cy="50%"
            outerRadius={100}
            innerRadius={40}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: '#e2e8f0' }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip {...darkTooltipStyle} />
          <Legend formatter={(v) => <span style={{ color: '#64748b', fontSize: 11 }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'line_chart') {
    const chartData = Array.isArray(data) ? data : data.breakdown || data.trend || []
    if (!chartData.length) return null
    const xKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') || 'period'
    const yKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'number') || 'value'
    return chartContainer(
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip {...darkTooltipStyle} />
          <Line
            type="monotone" dataKey={yKey}
            stroke="#c8102e" strokeWidth={2.5}
            dot={{ fill: '#c8102e', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#fff', stroke: '#c8102e', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'table') {
    const rows = Array.isArray(data) ? data : data.breakdown || data.analytes || []
    if (!rows.length) return null
    const cols = Object.keys(rows[0])
    return chartContainer(
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  textAlign: 'left', padding: '8px 10px',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b', fontWeight: 600, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap', background: '#f8fafc',
                }}>{c.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}
                style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {cols.map(c => (
                  <td key={c} style={{ padding: '8px 10px', color: '#475569' }}>
                    {typeof row[c] === 'number' ? row[c].toLocaleString() : row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}
