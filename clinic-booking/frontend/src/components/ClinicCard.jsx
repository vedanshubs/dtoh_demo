export default function ClinicCard({ clinic }) {
  const walkIn = clinic.Attributes?.find(a => a.AttributeName === 'WalkIn')?.AttributeValue === 'Y'
  const handicap = clinic.Attributes?.find(a => a.AttributeName === 'Handicap')?.AttributeValue === 'Y'

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, margin: '8px 0' }}>
      <strong>{clinic.SiteName}</strong>
      <p style={{ margin: '4px 0' }}>{clinic.Address1}, {clinic.City}, {clinic.State} {clinic.ZipCode}</p>
      <p style={{ margin: '4px 0', color: '#555' }}>{clinic.Distance} miles away</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {walkIn && <span style={{ background: '#d4edda', padding: '2px 8px', borderRadius: 4 }}>Walk-in</span>}
        {handicap && <span style={{ background: '#cce5ff', padding: '2px 8px', borderRadius: 4 }}>Handicap</span>}
      </div>
      <a href={clinic.GoogleMapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
        View on Google Maps →
      </a>
    </div>
  )
}
