export default function BookingConfirmation({ registrationId }) {
  return (
    <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: 16, margin: '8px 0' }}>
      <strong>Booking Confirmed</strong>
      <p style={{ margin: '8px 0 0' }}>Registration ID: <code>{registrationId}</code></p>
    </div>
  )
}
