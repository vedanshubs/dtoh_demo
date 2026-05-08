export default function DataTable({ rows }) {
  if (!rows || !rows.length) return null
  const cols = Object.keys(rows[0])
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{
                textAlign: 'left', padding: '8px 12px',
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
            <tr
              key={i}
              style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {cols.map(c => (
                <td key={c} style={{ padding: '9px 12px', color: '#475569' }}>
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
