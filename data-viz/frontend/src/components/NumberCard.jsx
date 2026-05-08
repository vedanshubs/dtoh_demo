export default function NumberCard({ label, value }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderTop: '3px solid #c8102e',
      borderRadius: 10,
      padding: '18px 16px',
      textAlign: 'center',
      minWidth: 130,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b', lineHeight: 1.1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{
        color: '#94a3b8', marginTop: 6, fontSize: 11,
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </div>
    </div>
  )
}
