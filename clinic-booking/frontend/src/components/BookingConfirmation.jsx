export default function BookingConfirmation({ registrationId }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)',
      border: '1px solid #6ee7b7',
      borderRadius: 12,
      padding: '14px 16px',
      margin: '8px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 2px 8px rgba(5,150,105,0.12)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: '#d1fae5', border: '2px solid #6ee7b7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>✅</div>
      <div>
        <div style={{ fontWeight: 700, color: '#065f46', fontSize: 14, marginBottom: 3 }}>
          Booking Confirmed!
        </div>
        <div style={{ color: '#047857', fontSize: 12 }}>
          Registration ID:{' '}
          <code style={{
            background: 'rgba(0,0,0,0.07)', padding: '1px 6px',
            borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
          }}>{registrationId}</code>
        </div>
      </div>
    </div>
  )
}
