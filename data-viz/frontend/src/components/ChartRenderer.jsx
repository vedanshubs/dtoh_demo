import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function ChartRenderer({ visualization, data }) {
  if (visualization === 'stat') {
    const entries = Object.entries(data).filter(([k]) => !['client_id', 'date_range'].includes(k))
    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{typeof v === 'number' ? v.toFixed(1) : v}</div>
            <div style={{ color: '#666', marginTop: 4 }}>{k.replace(/_/g, ' ')}</div>
          </div>
        ))}
      </div>
    )
  }

  if (visualization === 'bar_chart') {
    const chartData = data.breakdown || data.analytes || []
    if (!chartData.length) return null
    const dataKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'number') || 'count'
    const nameKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') || 'label'
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey={nameKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#0088FE" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'pie_chart') {
    const chartData = data.breakdown || []
    if (!chartData.length) return null
    const nameKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') || 'label'
    const valueKey = Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'number') || 'count'
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={100} label>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'table') {
    const rows = Array.isArray(data) ? data : data.breakdown || data.analytes || []
    if (!rows.length) return null
    const cols = Object.keys(rows[0])
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{cols.map(c => <th key={c} style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map(c => <td key={c} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row[c]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return null
}
