import { useState, useEffect } from 'react'

const ID_TYPE_LABELS = { D: 'Driver\'s License', P: 'Passport', E: 'Employee ID', S: 'State ID' }

function maskSSN(ssn) {
  if (!ssn) return '***-**-****'
  const s = ssn.replace(/\D/g, '')
  return `***-**-${s.slice(-4)}`
}

function formatSSN(ssn) {
  if (!ssn) return ''
  const s = ssn.replace(/\D/g, '')
  return `${s.slice(0, 3)}-${s.slice(3, 5)}-${s.slice(5)}`
}

function formatPhone(p) {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function formatDOB(dob) {
  if (!dob) return ''
  const d = new Date(dob + 'T00:00:00')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function ProfileRow({ label, value, action }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
      <span style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0f172a', flex: 1 }}>{value}</span>
      {action}
    </div>
  )
}

export default function CandidateProfile({ donorId, onBeginBooking }) {
  const [donor, setDonor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ssnVisible, setSsnVisible] = useState(false)

  useEffect(() => {
    if (!donorId) { setDonor(null); return }
    setLoading(true)
    setSsnVisible(false)
    fetch(`/api/donors/${donorId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setDonor(data))
      .catch(() => setDonor(null))
      .finally(() => setLoading(false))
  }, [donorId])

  if (!donorId) return null
  if (loading) return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #c8102e', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#64748b' }}>Loading profile…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!donor) return null

  const idTypeLabel = ID_TYPE_LABELS[donor.other_id_type] || donor.other_id_type

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #c8102e',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      animation: 'fadeSlideIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #c8102e, #8b0000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
            boxShadow: '0 2px 8px rgba(200,16,46,0.3)',
          }}>
            {donor.first_name[0]}{donor.last_name[0]}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {donor.first_name} {donor.last_name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Candidate #{donor.id} · {donor.role || 'Employee'} · {donor.city}, {donor.state}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: '#065f46', background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase',
        }}>Active</div>
      </div>

      {/* Profile rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ProfileRow label="SSN"
          value={ssnVisible ? formatSSN(donor.ssn) : maskSSN(donor.ssn)}
          action={
            <button onClick={() => setSsnVisible(v => !v)} style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px',
              fontSize: 11, color: '#64748b', borderRadius: 4,
              transition: 'color 0.15s',
            }}
              title={ssnVisible ? 'Hide SSN' : 'Reveal SSN'}
            >{ssnVisible ? '🙈 Hide' : '👁 Show'}</button>
          }
        />
        <ProfileRow label="Date of Birth" value={formatDOB(donor.dob)} />
        <ProfileRow label="Phone" value={formatPhone(donor.day_phone)} />
        <ProfileRow label="Email" value={donor.email} />
        <ProfileRow label="Address" value={`${donor.address1}, ${donor.city}, ${donor.state} ${donor.zip}`} />
        <ProfileRow label="ID Document" value={`${donor.other_id} — ${idTypeLabel}`} />
      </div>

      {/* CTA */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onBeginBooking}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 20px', borderRadius: 8,
            background: 'linear-gradient(135deg, #c8102e, #9b0f23)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(200,16,46,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          🏥 Begin Booking
        </button>
      </div>
    </div>
  )
}
