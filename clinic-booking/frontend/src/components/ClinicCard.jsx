export default function ClinicCard({ clinic }) {
  const walkIn = clinic.Attributes?.find(a => a.AttributeName === 'WalkIn')?.AttributeValue === 'Y'
  const handicap = clinic.Attributes?.find(a => a.AttributeName === 'Handicap')?.AttributeValue === 'Y'

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '14px 16px',
      margin: '8px 0',
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <strong style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>
          {clinic.SiteName}
        </strong>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#c8102e',
          background: '#fef2f2', padding: '3px 9px', borderRadius: 20,
          flexShrink: 0, marginLeft: 8,
        }}>
          {clinic.Distance} mi
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
        📍 {clinic.Address1}, {clinic.City}, {clinic.State} {clinic.ZipCode}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {walkIn && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#059669',
            background: '#d1fae5', padding: '3px 9px', borderRadius: 20,
            border: '1px solid #a7f3d0',
          }}>Walk-in ✓</span>
        )}
        {handicap && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#2563eb',
            background: '#dbeafe', padding: '3px 9px', borderRadius: 20,
            border: '1px solid #bfdbfe',
          }}>Accessible ♿</span>
        )}
      </div>
      <a
        href={clinic.GoogleMapsUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: 12, color: '#c8102e', textDecoration: 'none',
          fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        View on Google Maps →
      </a>
    </div>
  )
}
