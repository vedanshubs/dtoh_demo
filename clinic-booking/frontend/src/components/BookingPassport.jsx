import { useEffect } from 'react'

const Field = ({ label, value, wide }) => (
  <div style={{
    gridColumn: wide ? '1 / -1' : undefined,
    borderBottom: '1px solid #f1f1f1',
    paddingBottom: 12, marginBottom: 2,
  }}>
    <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
      {label}
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
  </div>
)

export default function BookingPassport({ data, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!data) return null

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=640,height=780')
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Booking Passport – ${data.registrationId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; padding: 32px; }
    .header { background: linear-gradient(135deg, #c8102e 0%, #8b0000 100%); border-radius: 12px 12px 0 0; padding: 24px 28px 20px; }
    .org { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.6); letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 4px; }
    .title { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.02em; line-height: 1.1; }
    .reg-strip { margin-top: 18px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; }
    .reg-label { font-size: 10px; color: rgba(255,255,255,0.6); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
    .reg-id { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: 0.06em; font-family: monospace; }
    .body { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 22px 28px 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
    .field { border-bottom: 1px solid #f1f1f1; padding-bottom: 12px; margin-bottom: 2px; }
    .field.wide { grid-column: 1 / -1; }
    .field-label { font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 3px; }
    .field-value { font-size: 13.5px; font-weight: 600; color: #0f172a; }
    .notice { margin-top: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 11.5px; color: #92400e; line-height: 1.5; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">UBS Group · Occupational Health</div>
    <div class="title">Drug Test<br/>Booking Passport</div>
    <div class="reg-strip">
      <span class="reg-label">Registration ID</span>
      <span class="reg-id">${data.registrationId}</span>
    </div>
  </div>
  <div class="body">
    <div class="grid">
      <div class="field"><div class="field-label">Candidate</div><div class="field-value">${data.candidate || '—'}</div></div>
      <div class="field"><div class="field-label">Date Issued</div><div class="field-value">${data.issuedAt || '—'}</div></div>
      <div class="field"><div class="field-label">Test Type</div><div class="field-value">${data.testType || '—'}</div></div>
      <div class="field"><div class="field-label">Reason</div><div class="field-value">${data.reason || '—'}</div></div>
      ${data.preferredDate ? `<div class="field wide"><div class="field-label">Preferred Date</div><div class="field-value">${data.preferredDate}</div></div>` : ''}
      <div class="field wide"><div class="field-label">Clinic</div><div class="field-value">${data.clinic || '—'}</div></div>
      <div class="field wide"><div class="field-label">Address</div><div class="field-value">${data.address || '—'}</div></div>
      <div class="field"><div class="field-label">ZIP Code</div><div class="field-value">${data.zip || '—'}</div></div>
    </div>
    <div class="notice">⚠️ Bring this document and a valid government-issued photo ID to your appointment. Arrive 10 minutes early.</div>
  </div>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #c8102e 0%, #8b0000 100%)', padding: '24px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                UBS Group · Occupational Health
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Drug Test<br />Booking Passport
              </div>
            </div>
            <div style={{
              width: 48, height: 48, background: 'rgba(255,255,255,0.15)', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0,
            }}>U</div>
          </div>
          <div style={{
            marginTop: 18, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Registration ID</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{data.registrationId}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="Candidate"      value={data.candidate} />
            <Field label="Date Issued"    value={data.issuedAt} />
            <Field label="Test Type"      value={data.testType} />
            <Field label="Reason"         value={data.reason} />
            {data.preferredDate && <Field label="Preferred Date" value={data.preferredDate} wide />}
            <Field label="Clinic"         value={data.clinic}   wide />
            <Field label="Address"        value={data.address}  wide />
            <Field label="ZIP Code"       value={data.zip} />
          </div>
        </div>

        {/* Notice */}
        <div style={{
          margin: '16px 28px',
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
            Bring this document and a valid government-issued photo ID to your appointment. Arrive 10 minutes early.
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} style={{
            flex: 1, padding: '11px 0',
            background: 'linear-gradient(135deg, #c8102e, #8b0000)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            ⬇ Download PDF
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px 0',
            background: '#f1f5f9', color: '#475569',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
