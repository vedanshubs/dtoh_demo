export default function NumberCard({ label, value }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, textAlign: 'center', minWidth: 140 }}>
      <div style={{ fontSize: 36, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  )
}
