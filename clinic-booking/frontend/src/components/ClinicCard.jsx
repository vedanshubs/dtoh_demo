export default function ClinicCard({ clinic, onBook }) {
  const walkIn = clinic.Attributes?.find(a => a.AttributeName === 'WalkIn')?.AttributeValue === 'Y'
    || clinic.Attributes?.find(a => a.AttributeName === 'Walk In Drug Testing - No Appointment Required')?.AttributeValue === 'Yes'
  const handicap = clinic.Attributes?.find(a => a.AttributeName === 'Handicap')?.AttributeValue === 'Y'
    || clinic.Attributes?.find(a => a.AttributeName === 'Wheelchair Accessible')?.AttributeValue === 'Yes'
  const dot = clinic.Attributes?.find(a => a.AttributeName === 'DOT Certified Physician')?.AttributeValue === 'Yes'

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: '16px 18px',
      margin: '10px 0',
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
        <strong style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
          {clinic.SiteName}
        </strong>
        {clinic.Distance != null && (
          <span style={{
            fontSize: 12.5, fontWeight: 700, color: '#c8102e',
            background: '#fef2f2', padding: '4px 11px', borderRadius: 20,
            border: '1px solid #fecaca',
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}>
            {clinic.Distance} mi
          </span>
        )}
      </div>
      <p style={{ fontSize: 13.5, color: '#475569', margin: '0 0 12px', lineHeight: 1.55 }}>
        📍 {[clinic.Address1, clinic.City, clinic.State, clinic.ZipCode].filter(Boolean).join(', ')}
      </p>
      {(walkIn || handicap || dot) && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          {walkIn && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#047857',
              background: '#ecfdf5', padding: '4px 11px', borderRadius: 20,
              border: '1px solid #a7f3d0',
            }}>Walk-in ✓</span>
          )}
          {handicap && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#1d4ed8',
              background: '#eff6ff', padding: '4px 11px', borderRadius: 20,
              border: '1px solid #bfdbfe',
            }}>Accessible ♿</span>
          )}
          {dot && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#b45309',
              background: '#fffbeb', padding: '4px 11px', borderRadius: 20,
              border: '1px solid #fde68a',
            }}>DOT certified</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <a
          href={clinic.GoogleMapsUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 13, color: '#c8102e', textDecoration: 'none',
            fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
        >
          View on Google Maps →
        </a>
        {onBook && (
          <button
            onClick={() => onBook(clinic)}
            style={{
              padding: '8px 18px', borderRadius: 22,
              background: 'linear-gradient(135deg, #c8102e, #9b0f23)',
              color: '#fff', border: 'none',
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(200,16,46,0.3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Book here →
          </button>
        )}
      </div>
    </div>
  )
}
