export default function DataTable({ rows }) {
  if (!rows || !rows.length) return null
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
