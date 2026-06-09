import { useState } from 'react'

/* Self-entered donor details. Submits directly to the backend (POST /api/donors)
   via the parent's onSubmit — this PII never flows through the chat/LLM. Styled
   to match InlineDatePicker (dark header + white body + red confirm). */

const FIELD = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 13.5, color: '#0f172a', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const LABEL = {
  fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
}

const digits = (s) => (s || '').replace(/\D/g, '')

function validate(f) {
  const e = {}
  if (!f.first_name.trim())        e.first_name = 'Required'
  if (!f.last_name.trim())         e.last_name = 'Required'
  if (digits(f.ssn).length !== 9)  e.ssn = '9 digits'
  if (!f.dob)                      e.dob = 'Required'
  if (digits(f.day_phone).length !== 10) e.day_phone = '10 digits'
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'Invalid email'
  if (!f.address1.trim())          e.address1 = 'Required'
  if (!f.city.trim())              e.city = 'Required'
  if (f.state.trim().length !== 2) e.state = '2 letters'
  if (digits(f.zip).length !== 5)  e.zip = '5 digits'
  return e
}

function Field({ label, error, span = 1, children }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={LABEL}>{label}</div>
      {children}
      {error && <div style={{ fontSize: 10.5, color: '#ef4444', marginTop: 3, fontWeight: 600 }}>{error}</div>}
    </div>
  )
}

export default function PersonalInfoForm({ onSubmit, submitting = false, serverError = null }) {
  const [f, setF] = useState({
    first_name: '', last_name: '', ssn: '', dob: '', day_phone: '', email: '',
    address1: '', city: '', state: '', zip: '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))

  const today = new Date().toISOString().slice(0, 10)

  const submit = () => {
    const e = validate(f)
    setErrors(e)
    setTouched(true)
    if (Object.keys(e).length > 0) return
    onSubmit({
      ...f,
      ssn: digits(f.ssn),
      day_phone: digits(f.day_phone),
      state: f.state.trim().toUpperCase(),
      zip: digits(f.zip).slice(0, 5),
      email: f.email.trim() || null,
    })
  }

  const err = (k) => (touched ? errors[k] : null)

  return (
    <div style={{
      marginTop: 4, background: '#fff', border: '1.5px solid #e2e8f0',
      borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      animation: 'fadeSlideIn 0.22s ease', maxWidth: 560,
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <span style={{ fontSize: 16 }}>🪪</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Your details</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
            Used to register your test — kept private, never shared with the assistant.
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <Field label="First name" error={err('first_name')}>
            <input style={FIELD} value={f.first_name} onChange={set('first_name')} placeholder="Jane" />
          </Field>
          <Field label="Last name" error={err('last_name')}>
            <input style={FIELD} value={f.last_name} onChange={set('last_name')} placeholder="Doe" />
          </Field>

          <Field label="SSN" error={err('ssn')}>
            <input style={FIELD} value={f.ssn} onChange={set('ssn')} placeholder="123-45-6789" inputMode="numeric" />
          </Field>
          <Field label="Date of birth" error={err('dob')}>
            <input type="date" style={FIELD} value={f.dob} max={today} onChange={set('dob')} />
          </Field>

          <Field label="Phone" error={err('day_phone')}>
            <input style={FIELD} value={f.day_phone} onChange={set('day_phone')} placeholder="(212) 555-0100" inputMode="tel" />
          </Field>
          <Field label="Email (optional)" error={err('email')}>
            <input style={FIELD} value={f.email} onChange={set('email')} placeholder="jane@example.com" inputMode="email" />
          </Field>

          <Field label="Street address" error={err('address1')} span={2}>
            <input style={FIELD} value={f.address1} onChange={set('address1')} placeholder="123 Main St" />
          </Field>

          <Field label="City" error={err('city')}>
            <input style={FIELD} value={f.city} onChange={set('city')} placeholder="New York" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 11 }}>
            <Field label="State" error={err('state')}>
              <input style={FIELD} value={f.state} maxLength={2}
                onChange={e => setF(s => ({ ...s, state: e.target.value.toUpperCase() }))} placeholder="NY" />
            </Field>
            <Field label="ZIP" error={err('zip')}>
              <input style={FIELD} value={f.zip} onChange={set('zip')} placeholder="10018" inputMode="numeric" />
            </Field>
          </div>
        </div>

        {serverError && (
          <div style={{
            marginTop: 12, fontSize: 12, fontWeight: 600, color: '#dc2626',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px',
          }}>{serverError}</div>
        )}

        <button onClick={submit} disabled={submitting} style={{
          width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 8,
          background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #c8102e, #9b0f23)',
          color: submitting ? '#94a3b8' : '#fff', fontSize: 13.5, fontWeight: 700,
          border: 'none', cursor: submitting ? 'default' : 'pointer', transition: 'all 0.2s',
          boxShadow: submitting ? 'none' : '0 2px 8px rgba(200,16,46,0.3)',
        }}>
          {submitting ? 'Saving…' : 'Continue'}
        </button>

        <div style={{ marginTop: 10, fontSize: 11.5, color: '#94a3b8', textAlign: 'center' }}>
          Prefer a demo profile? Pick one from the <strong style={{ color: '#64748b' }}>Sample Profiles</strong> panel on the left.
        </div>
      </div>
    </div>
  )
}
