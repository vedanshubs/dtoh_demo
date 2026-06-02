export default function ClinicCard({ clinic, onBook }) {
  // Prefer pre-computed flat booleans; fall back to raw Attributes array
  const walkIn = clinic.walk_in
    ?? (clinic.Attributes?.find(a => a.AttributeName === 'Walk In Drug Testing - No Appointment Required')?.AttributeValue === 'Yes')
  const handicap = clinic.wheelchair_accessible
    ?? (clinic.Attributes?.find(a => a.AttributeName === 'Handicap Access')?.AttributeValue === 'Yes')
  const dot = clinic.dot_certified
    ?? (clinic.Attributes?.find(a => a.AttributeName === 'DOT Certified Physician')?.AttributeValue === 'Yes')
  const eccf = clinic.eccf_enabled
    ?? (clinic.Attributes?.find(a => a.AttributeName === 'eCCF Enabled')?.AttributeValue === 'Yes')
  const afterHours = clinic.after_hours
    ?? (clinic.Attributes?.find(a => a.AttributeName === 'After Hours Drug Screening')?.AttributeValue === 'Yes')
  const transit = clinic.public_transport
    ?? (clinic.Attributes?.find(a => a.AttributeName === 'Public Transportation')?.AttributeValue === 'Yes')

  const hoursDisplay = clinic.hours_display || null
  const billingTier  = clinic.billing_tier  || null

  const badges = [
    walkIn      && { label: 'Walk-in ✓',     color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
    handicap    && { label: 'Accessible ♿',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    dot         && { label: 'DOT certified',  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    eccf        && { label: 'eCCF',           color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    afterHours  && { label: 'After hours',    color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
    transit     && { label: 'Transit nearby', color: '#374151', bg: '#f9fafb', border: '#d1d5db' },
  ].filter(Boolean)

  return (
    <div
      style={{
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
      {/* Header row: name + distance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
        <strong style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
          {clinic.SiteName}
        </strong>
        {clinic.Distance != null && (
          <span style={{
            fontSize: 12.5, fontWeight: 700, color: '#c8102e',
            background: '#fef2f2', padding: '4px 11px', borderRadius: 20,
            border: '1px solid #fecaca', flexShrink: 0, letterSpacing: '0.01em',
          }}>
            {clinic.Distance} mi
          </span>
        )}
      </div>

      {/* Address */}
      <p style={{ fontSize: 13.5, color: '#475569', margin: '0 0 8px', lineHeight: 1.55 }}>
        📍 {[clinic.Address1, clinic.City, clinic.State, clinic.ZipCode].filter(Boolean).join(', ')}
      </p>

      {/* Hours */}
      {hoursDisplay && (
        <p style={{
          fontSize: 12.5, color: '#374151', margin: '0 0 10px',
          display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.5,
        }}>
          <span style={{ flexShrink: 0 }}>🕐</span>
          <span>{hoursDisplay}</span>
        </p>
      )}

      {/* Attribute badges */}
      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          {badges.map(b => (
            <span key={b.label} style={{
              fontSize: 12, fontWeight: 600, color: b.color,
              background: b.bg, padding: '4px 11px', borderRadius: 20,
              border: `1px solid ${b.border}`,
            }}>{b.label}</span>
          ))}
          {billingTier && billingTier !== 'Unknown' && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#475569',
              background: '#f8fafc', padding: '4px 11px', borderRadius: 20,
              border: '1px solid #cbd5e1',
            }}>{billingTier}</span>
          )}
        </div>
      )}

      {/* Phone + actions row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {clinic.PhoneNumber && (
            <span style={{ fontSize: 13, color: '#64748b' }}>
              📞 {clinic.PhoneNumber}
            </span>
          )}
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
            View on map →
          </a>
        </div>
        {onBook && (
          <button
            onClick={() => onBook(clinic)}
            style={{
              padding: '8px 18px', borderRadius: 22,
              background: 'linear-gradient(135deg, #c8102e, #9b0f23)',
              color: '#fff', border: 'none',
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(200,16,46,0.3)',
              transition: 'all 0.15s', flexShrink: 0,
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
