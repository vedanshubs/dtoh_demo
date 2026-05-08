import { useEffect, useState } from 'react'

export default function CandidateSelector({ onSelect, selectedId }) {
  const [donors, setDonors] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/donors')
      .then(r => {
        if (!r.ok) throw new Error(`API returned ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (Array.isArray(data)) setDonors(data)
        else throw new Error('Unexpected response format')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const avatarColors = ['#c8102e', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777']

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>👤</span>
        <div>
          <h2 style={{
            fontSize: 12, fontWeight: 600, color: '#64748b',
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>Candidates</h2>
          {!loading && !error && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{donors.length} available</span>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '24px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Loading candidates…</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '16px 18px' }}>
          <div style={{
            background: '#fef2f2', borderRadius: 10, padding: '12px 14px',
            border: '1px solid #fecaca',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
              Could not load candidates
            </div>
            <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Ensure api-server is running on port 8000
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ padding: '8px', maxHeight: 430, overflowY: 'auto' }}>
          {donors.map((d, idx) => {
            const initials = `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`
            const isSelected = selectedId === d.id
            const color = avatarColors[idx % avatarColors.length]
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d.id, `${d.first_name} ${d.last_name}`)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 11px', borderRadius: 10, border: 'none',
                  background: isSelected ? '#fef2f2' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  outline: isSelected ? '2px solid #c8102e' : '2px solid transparent',
                  outlineOffset: -2, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: isSelected ? '#c8102e' : color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  color: isSelected ? '#fff' : color,
                  border: isSelected ? `2px solid #c8102e` : `2px solid ${color}44`,
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: isSelected ? '#c8102e' : '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {d.first_name} {d.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>ID #{d.id}</div>
                </div>
                {isSelected && (
                  <div style={{ marginLeft: 'auto', fontSize: 16, color: '#c8102e' }}>✓</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
