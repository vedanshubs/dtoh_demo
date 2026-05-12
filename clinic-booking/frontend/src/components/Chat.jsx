import { useState, useRef, useEffect } from 'react'
import CandidateProfile from './CandidateProfile'
import ProgressStepper from './ProgressStepper'
import BookingSummary from './BookingSummary'
import BookingPassport from './BookingPassport'
import McpActivityPanel from './McpActivityPanel'

/* Markdown helpers */
function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+)\*\*|\*(.+)\*|`(.+)`)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[0].startsWith('**'))     parts.push(<strong key={m.index}>{m[2]}</strong>)
    else if (m[0].startsWith('*')) parts.push(<em key={m.index}>{m[3]}</em>)
    else                           parts.push(<code key={m.index} style={{ background: '#e2e8f0', borderRadius: 3, padding: '1px 4px', fontSize: '0.9em' }}>{m[4]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function MarkdownText({ text }) {
  if (!text) return null
  // Strip [BOOKING_SUMMARY]...[/BOOKING_SUMMARY] from display text
  const cleaned = text.replace(/\[BOOKING_SUMMARY\][\s\S]*\[\/BOOKING_SUMMARY\]/g, '').trim()
  if (!cleaned) return null
  const lines = cleaned.split('\n')
  return (
    <span>
      {lines.map((line, i) => (
        <span key={i}>{renderInline(line)}{i < lines.length - 1 && <br />}</span>
      ))}
    </span>
  )
}

/* Strip numbered/bullet list lines used when list will be shown as chips or clinic cards */
function stripList(text) {
  if (!text) return text
  const cleaned = text.replace(/\[BOOKING_SUMMARY\][\s\S]*\[\/BOOKING_SUMMARY\]/g, '').trim()
  const lines = cleaned.split('\n')
  const cutIdx = lines.findIndex(l => /^\s*(\d+[.)]\s|-\s|\*\s)/.test(l))
  if (cutIdx === -1) return cleaned
  return lines.slice(0, cutIdx).join('\n').trimEnd()
}

/* Extract bullet/numbered items as quick-reply chips (min 2 items, max 120 chars each) */
function parseQuickReplies(text) {
  if (!text) return []
  const cleaned = text.replace(/\[BOOKING_SUMMARY\][\s\S]*\[\/BOOKING_SUMMARY\]/g, '')
  const items = []
  for (const line of cleaned.split('\n')) {
    const m = line.match(/^\s*(:[-*]|\d+[.)]) (.+)$/)
    if (m) {
      const clean = m[2].replace(/\*\*(.*)\*\*/g, '$1').replace(/\*(.*)\*/g, '$1').replace(/`(.*)`/g, '$1').trim()
      if (clean.length > 0 && clean.length < 120) items.push(clean)
    }
  }
  return items.length >= 2 ? items : []
}

function QuickReplies({ items, onSend }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSend(item)}
          style={{
            padding: '8px 16px', borderRadius: 20,
            border: '1.5px solid #e2e8f0', background: '#fff',
            fontSize: 12.5, color: '#0f172a', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = '#c8102e' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }}
        >{item}</button>
      ))}
    </div>
  )
}

/* Icons */
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const IconBot = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
)
const IconClear = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)
const IconMapPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const IconPhone = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.7 12.18 19.79 19.79 0 0 1 1.61 3.58 2 2 0 0 1 3.59 1.4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z" />
  </svg>
)
const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)
const IconBook = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

/* Clinic attribute helpers */
const SPECIMEN_LABELS = { U: 'Urine', O: 'Oral Fluid', H: 'Hair', B: 'Breath' }

function attr(clinic, name) {
  return clinic.Attributes?.find(a => a.AttributeName === name)?.AttributeValue ?? null
}

function hasWeekendHours(clinic) {
  const h = attr(clinic, 'Clinic Hours') || ''
  const m = h.match(/SaturdayHoursOpen:(\d{2}:\d{2})/)
  return m && m[1] !== '00:00'
}

function scoreClinic(clinic, isDOT) {
  let score = 0
  const dotCert = attr(clinic, 'DOT Certified Physician') === 'Yes'
  const walkIn  = attr(clinic, 'Walk In Drug Testing - No Appointment Required') === 'Yes'
  const weekend = hasWeekendHours(clinic)
  const handicap = attr(clinic, 'Handicap Access') === 'Yes'
  if (isDOT && dotCert) score += 100
  if (walkIn)  score += 30
  if (weekend) score += 10
  if (handicap) score += 5
  const dist = clinic.Distance ?? 99
  score += Math.max(0, 20 * (1 - dist / 20))
  return score
}

/* Contextual quick-action buttons */
function ContextualActions({ session, hasClinics, onSend }) {
  const { testType, clinicSelected, bookingConfirmed } = session
  if (bookingConfirmed) return null
  let actions = []
  if (clinicSelected) {
    actions = [
      { label: 'Confirm Booking', msg: 'Confirm' },
      { label: 'Edit Details',    msg: 'Edit details' },
    ]
  } else if (hasClinics) {
    actions = [
      { label: 'Walk-in Only',           msg: 'Show walk-in clinics only' },
      { label: 'DOT Certified Only',     msg: 'Show DOT-certified clinics only' },
      { label: 'Wheelchair Accessible',  msg: 'Show wheelchair accessible clinics' },
      { label: 'Search 10 Miles',        msg: 'Search within 10 miles' },
      { label: 'Search 25 Miles',        msg: 'Search within 25 miles' },
    ]
  } else if (testType) {
    actions = [
      { label: 'Find Clinics Near Me',  msg: 'Find clinics near me' },
      { label: 'Search 10 Miles',       msg: 'Search within 10 miles' },
    ]
  } else {
    // No test type yet — actions hidden; test type chips shown via welcome message
    return null
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 16px 0' }}>
      {actions.map(a => (
        <button key={a.label} onClick={() => onSend(a.msg)} style={{
          padding: '5px 12px', borderRadius: 20,
          border: '1px solid #e2e8f0', background: '#f8fafc',
          fontSize: 11.5, color: '#475569', cursor: 'pointer',
          fontWeight: 500, transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = '#c8102e' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
        >{a.label}</button>
      ))}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
          animation: `cb-typing 1.3s ${i * 0.18}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`@keyframes cb-typing { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }`}</style>
    </div>
  )
}

function BotAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #c8102e, #8b0000)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', boxShadow: '0 2px 8px rgba(200,16,46,0.35)',
    }}>
      <IconBot />
    </div>
  )
}

/* Clinic card list */
const PAGE_SIZE = 5

function ClinicCards({ clinics, onBook, isDOT }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Sort by weighted score client-side
  const ranked = [...clinics].sort((a, b) => scoreClinic(b, isDOT) - scoreClinic(a, isDOT))
  const shown = ranked.slice(0, visible)
  const hasMore = visible < ranked.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
      {shown.map((c, i) => {
        const walkIn   = attr(c, 'Walk In Drug Testing - No Appointment Required') === 'Yes'
        const dotCert  = attr(c, 'DOT Certified Physician') === 'Yes'
        const handicap = attr(c, 'Handicap Access') === 'Yes'
        const transit  = attr(c, 'Public Transportation') === 'Yes'
        const afterHrs = attr(c, 'After Hours Drug Screening') === 'Yes'
        const weekend  = hasWeekendHours(c)
        const isBest   = i === 0

        const phone = c.PhoneNumber
          ? c.PhoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
          : null
        const mapUrl = c.GoogleMapsUrl
          || (c.Latitude && c.Longitude
            ? `https://www.google.com/maps?q=${c.Latitude},${c.Longitude}`
            : `https://www.google.com/maps/search/${encodeURIComponent(`${c.SiteName} ${c.Address1} ${c.City} ${c.State}`)}`)

        return (
          <div key={c.EscreenSiteId ?? i} style={{
            background: '#fff',
            border: `1px solid ${isBest ? '#fbbf24' : '#e2e8f0'}`,
            borderLeft: `4px solid ${isBest ? '#f59e0b' : '#e2e8f0'}`,
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: isBest ? '0 2px 10px rgba(245,158,11,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
            animation: `fadeSlideIn 0.25s ${i * 0.06}s ease both`,
          }}>
            {/* Top row: best badge + name + distance */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isBest && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#92400e',
                      background: '#fef3c7', border: '1px solid #fde68a',
                      borderRadius: 20, padding: '2px 8px',
                    }}>Best Match</span>
                  </div>
                )}
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{c.SiteName}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconMapPin />
                  {c.Address1}, {c.City}, {c.State} {c.ZipCode}
                </div>
              </div>
              {c.Distance != null && (
                <div style={{
                  flexShrink: 0,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 11.5, fontWeight: 700, color: '#15803d',
                  whiteSpace: 'nowrap',
                }}>{c.Distance} mi</div>
              )}
            </div>

            {/* Capability badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {walkIn ? (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#065f46', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '2px 8px' }}>Walk-In Available</span>
              ) : (
                <span style={{ fontSize: 10.5, fontWeight: 500, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '2px 8px' }}>Appointment Only</span>
              )}
              {dotCert && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 8px' }}>DOT Certified</span>
              )}
              {handicap && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 20, padding: '2px 8px' }}>Accessible</span>
              )}
              {transit && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#0369a1', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 20, padding: '2px 8px' }}>Transit Nearby</span>
              )}
              {weekend && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6d28d9', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 20, padding: '2px 8px' }}>Sat Open</span>
              )}
              {afterHrs && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#1e293b', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, padding: '2px 8px' }}>After Hours</span>
              )}
              {c.SupportedSpecimenTypes?.map(t => (
                <span key={t} style={{ fontSize: 10.5, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: '2px 8px' }}>
                  {SPECIMEN_LABELS[t] || t}
                </span>
              ))}
            </div>

            {/* Phone */}
            {phone && (
              <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <IconPhone />{phone}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                background: '#1e40af', color: '#fff',
                fontSize: 12, fontWeight: 600, textDecoration: 'none',
                transition: 'background 0.15s', border: 'none',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.background = '#1e40af'}
              >
                <IconExternalLink /> View on Map
              </a>
              <button onClick={() => onBook(c)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg, #c8102e, #9b0f23)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                transition: 'opacity 0.15s', boxShadow: '0 2px 6px rgba(200,16,46,0.3)',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <IconBook /> Book This Clinic
              </button>
            </div>
          </div>
        )
      })}

      {hasMore && (
        <button
          onClick={() => setVisible(v => v + PAGE_SIZE)}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 10,
            border: '1.5px dashed #cbd5e1', background: '#f8fafc',
            fontSize: 12.5, fontWeight: 600, color: '#475569',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569' }}
        >
          Show more ({Math.min(PAGE_SIZE, ranked.length - visible)} of {ranked.length - visible} remaining)
        </button>
      )}
    </div>
  )
}

/* Main component */
export default function Chat({ donorId, donorName }) {
  const [messages,          setMessages]          = useState([])
  const [history,           setHistory]           = useState([])
  const [input,             setInput]             = useState('')
  const [loading,           setLoading]           = useState(false)
  const [hasStarted,        setHasStarted]        = useState(false)
  const [hasClinics,        setHasClinics]        = useState(false)
  const [lastClinics,       setLastClinics]       = useState([])
  const [lastBookingSummary,setLastBookingSummary] = useState(null)
  const [passport,          setPassport]          = useState(null)
  const [passportOpen,      setPassportOpen]      = useState(false)
  const [mcpCalls,          setMcpCalls]          = useState([])

  // Session memory cleared on donor change
  const [session, setSession] = useState({
    testType: null, reasonForTest: null, selectedClinic: null,
    clinicSelected: false, bookingConfirmed: false, isDOT: false,
  })

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setMessages([]); setHistory([]); setHasStarted(false); setHasClinics(false); setLastClinics([])
    setLastBookingSummary(null); setPassport(null); setPassportOpen(false); setMcpCalls([])
    setSession({ testType: null, reasonForTest: null, selectedClinic: null, clinicSelected: false, bookingConfirmed: false, isDOT: false })
  }, [donorId])

  // Derive stepper step — step 2 requires both test type AND reason
  const stepperStep = session.bookingConfirmed ? 4
    : session.clinicSelected ? 3
    : (session.testType && session.reasonForTest) ? 2
    : donorId ? 1 : 0

  const TEST_TYPE_OPTIONS = [
    { label: '5-Panel Urine (DOT)',       isDOT: true  },
    { label: '10-Panel Urine (Non-DOT)',  isDOT: false },
    { label: 'Hair Follicle 5-Panel',     isDOT: false },
    { label: 'Oral Fluid 5-Panel',        isDOT: false },
    { label: 'Breath Alcohol Test',       isDOT: false },
  ]

  // Begin booking: inject local welcome message with test type chips (no API call)
  const beginBooking = () => {
    if (hasStarted) return
    setHasStarted(true)
    setMessages([{
      role: 'assistant',
      text: `What test do you need?\n\nYou can describe the full request — for example: "pre-employment DOT urine, nearest walk-in" — or select a test type below:`,
      chips: TEST_TYPE_OPTIONS.map(t => t.label),
    }])
  }

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || !donorId || loading) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setHasStarted(true)
    setLoading(true)

    // Detect test type and reason from user message
    const lc = msg.toLowerCase()
    const TEST_TYPE_KEYS = [
      [/5.panel urine/i,    '5-Panel Urine (DOT)',        true],
      [/\bdot\b/,           '5-Panel Urine (DOT)',        true],
      [/10.panel urine/i,   '10-Panel Urine (Non-DOT)',   false],
      [/10.panel/i,         '10-Panel Urine (Non-DOT)',   false],
      [/hair follicle/i,    'Hair Follicle 5-Panel',      false],
      [/oral fluid/i,       'Oral Fluid 5-Panel',         false],
      [/breath alcohol/i,   'Breath Alcohol Test',        false],
      [/\bbat\b/i,          'Breath Alcohol Test',        false],
    ]
    for (const [re, label, isDOT] of TEST_TYPE_KEYS) {
      if (re.test(lc)) { setSession(s => ({ ...s, testType: label, isDOT })); break }
    }

    // Detect reason for test from user message (covers typed text and chip clicks)
    const REASON_KEYS = [
      ['pre-employment', 'Pre-Employment'],
      ['pre employment', 'Pre-Employment'],
      ['1.',             'Pre-Employment'],
      ['random',         'Random'],
      ['2.',             'Random'],
      ['for cause',      'For Cause'],
      ['for-cause',      'For Cause'],
      ['3.',             'For Cause'],
      ['post-accident',  'Post-Accident'],
      ['post accident',  'Post-Accident'],
      ['4.',             'Post-Accident'],
      ['return to duty', 'Return to Duty'],
      ['return-to-duty', 'Return to Duty'],
      ['5.',             'Return to Duty'],
    ]
    for (const [key, label] of REASON_KEYS) {
      if (lc.includes(key)) { setSession(s => ({ ...s, reasonForTest: label })); break }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_id: donorId, messages: history, user_message: msg, clinics: lastClinics }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setHistory(data.messages)

      if (data.tool_calls?.length) {
        const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setMcpCalls(prev => [...prev, ...data.tool_calls.map(tc => ({ ...tc, ts }))])
      }

      const returnedClinics = data.clinics?.length ? data.clinics : null
      if (returnedClinics) { setHasClinics(true); setLastClinics(returnedClinics) }

      if (data.booking_summary) { setSession(s => ({ ...s, clinicSelected: true })); setLastBookingSummary(data.booking_summary) }

      const regMatch = data.reply.match(/(?:Registration ID:|registration_id:)\s*([A-Z0-9-]+)/i)
      const isBookingConfirmed = !!regMatch
      if (isBookingConfirmed) {
        setSession(s => ({ ...s, bookingConfirmed: true }))
        setLastClinics([])
        const summary = lastBookingSummary || data.booking_summary || {}
        const passportData = {
          registrationId: regMatch[1],
          candidate:  summary['Candidate']  || donorName || '',
          testType:   summary['Test Type']  || '',
          reason:     summary['Reason']     || '',
          clinic:     summary['Clinic']     || '',
          address:    summary['Address']    || '',
          zip:        summary['ZIP']        || summary['ZIP Code'] || '',
          issuedAt:   new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        }
        setPassport(passportData)
        setPassportOpen(true)
        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ donor_id: donorId, ...passportData }),
        }).catch(() => {})
      }

      // Only show clinic cards when search_clinics fired this turn (returnedClinics is fresh)
      const showClinics = returnedClinics && !data.booking_summary && !isBookingConfirmed ? returnedClinics : null

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.reply,
        clinics: showClinics,
        booking_summary: data.booking_summary ?? null,
        showPassport: isBookingConfirmed,
      }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `${err.message || 'Something went wrong.'}`, error: true }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleBook = (clinic) => {
    setSession(s => ({ ...s, selectedClinic: clinic }))
    const id = clinic.EscreenSiteId ?? clinic.CollectionSiteId
    const addr = [clinic.Address1, clinic.City, clinic.State, clinic.ZipCode].filter(Boolean).join(', ')
    const dist = clinic.Distance != null ? ` (${clinic.Distance} mi)` : ''
    const walkin = clinic.Attributes?.find(a => a.AttributeName === 'Walk In Drug Testing - No Appointment Required')?.AttributeValue === 'Yes' ? ', walk-in' : ''
    const dot = clinic.Attributes?.find(a => a.AttributeName === 'DOT Certified Physician')?.AttributeValue === 'Yes' ? ', DOT certified' : ''
    send(`I'd like to book at ${clinic.SiteName}${dist}. Address: ${addr}. Site ID: ${id}${walkin}${dot}.`)
  }
  const handleConfirm = () => send('Confirm')
  const handleEdit    = () => send('Edit details')
  const handleKey     = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const isEmpty = messages.length === 0 && !loading

  return (
    <>
    {passport && passportOpen && <BookingPassport data={passport} onClose={() => setPassportOpen(false)} />}
    <div style={{ display: 'flex', height: '100%', gap: 0, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
    <div style={{
      background: '#ffffff',
      display: 'flex', flexDirection: 'column',
      flex: 1, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 18px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#fff',
      }}>
        <BotAvatar />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0f172a' }}>Booking Assistant</div>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            AI-powered MCP tools active
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setHistory([]); setHasStarted(false); setHasClinics(false); setSession(s => ({ ...s, clinicSelected: false, bookingConfirmed: false })) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: 'transparent',
              fontSize: 11.5, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#c8102e'; e.currentTarget.style.borderColor = '#fecaca' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0' }}
          >
            <IconClear /> Clear
          </button>
        )}
      </div>

      {/* Progress stepper */}
      {donorId && stepperStep >= 1 && <ProgressStepper activeStep={stepperStep} />}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>

        {/* Candidate profile card before first message */}
        {donorId && !hasStarted && (
          <CandidateProfile
            donorId={donorId}
            onBeginBooking={beginBooking}
          />
        )}

        {/* Empty state */}
        {isEmpty && !donorId && (
          <div style={{ textAlign: 'center', paddingTop: '10%', animation: 'fadeSlideIn 0.4s ease' }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Select a candidate first</div>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 320, margin: '0 auto', lineHeight: 1.65 }}>
              Choose an employee from the left panel to begin the drug test booking process.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start', gap: 8, marginBottom: 14,
            animation: 'fadeSlideIn 0.25s ease',
          }}>
            {m.role === 'assistant' && <div style={{ paddingTop: 2 }}><BotAvatar /></div>}
            {(() => {
              const chips = m.chips || []
              const hasChips = chips.length > 0
              const quickReplies = !hasChips && m.role === 'assistant' && !m.clinics && !m.booking_summary ? parseQuickReplies(m.text) : []
              const hasQuickReplies = quickReplies.length > 0
              const displayText = (m.clinics || hasQuickReplies || hasChips || m.booking_summary) ? stripList(m.text) : m.text
              return (
                <div style={{ maxWidth: (m.clinics || m.booking_summary) ? '92%' : '76%', minWidth: 0 }}>
                  {displayText && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg, #c8102e 0%, #9b0f23 100%)'
                        : m.error ? '#fef2f2' : '#f1f5f9',
                      color: m.role === 'user' ? '#fff' : m.error ? '#dc2626' : '#0f172a',
                      fontSize: 14.5, lineHeight: 1.72,
                      whiteSpace: m.role === 'user' ? 'pre-wrap' : 'normal',
                      wordBreak: 'break-word',
                      boxShadow: m.role === 'user' ? '0 3px 12px rgba(200,16,46,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                      border: m.error ? '1px solid #fecaca' : 'none',
                    }}>
                      {m.role === 'user' ? displayText : <MarkdownText text={displayText} />}
                    </div>
                  )}
                  {hasChips && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                      {chips.map((chip, ci) => (
                        <button key={ci} onClick={() => send(chip)} style={{
                          padding: '8px 16px', borderRadius: 20,
                          border: '1.5px solid #e2e8f0', background: '#fff',
                          fontSize: 12.5, color: '#0f172a', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = '#c8102e' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }}
                        >{chip}</button>
                      ))}
                    </div>
                  )}
                  {hasQuickReplies && <QuickReplies items={quickReplies} onSend={send} />}
                  {m.clinics?.length > 0 && (
                    <ClinicCards clinics={m.clinics} onBook={handleBook} isDOT={session.isDOT} />
                  )}
                  {m.booking_summary && (
                    <BookingSummary summary={m.booking_summary} onConfirm={handleConfirm} onEdit={handleEdit} />
                  )}
                  {m.showPassport && passport && (
                    <button
                      onClick={() => setPassportOpen(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        marginTop: 10,
                        background: 'linear-gradient(135deg, #c8102e, #8b0000)',
                        color: '#fff', border: 'none', borderRadius: 20,
                        padding: '8px 20px', fontSize: 12.5, fontWeight: 700,
                        cursor: 'pointer', boxShadow: '0 2px 8px rgba(200,16,46,0.3)',
                      }}
                    >
                      📋 View Booking Passport
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
            <BotAvatar />
            <div style={{ padding: '11px 15px', borderRadius: '4px 16px 16px 16px', background: '#f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Contextual quick actions */}
      {donorId && hasStarted && !loading && (
        <ContextualActions session={session} hasClinics={hasClinics} onSend={send} />
      )}


      {/* Input bar */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0, paddingTop: donorId && hasStarted ? 8 : 12 }}>
        {!donorId && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', padding: '8px 0 4px' }}>
            Select a candidate to enable chat
          </div>
        )}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: '#f8fafc', border: '1.5px solid #e2e8f0',
          borderRadius: 12, padding: '8px 8px 8px 14px',
          transition: 'border-color 0.15s', opacity: donorId ? 1 : 0.5,
        }}
          onFocus={e => e.currentTarget.style.borderColor = '#c8102e'}
          onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!donorId || loading}
            placeholder={donorId ? 'Ask about clinics, test types, or booking\u2026' : 'Select a candidate first'}
            rows={1}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              resize: 'none', outline: 'none',
              fontSize: 14.5, color: '#0f172a',
              lineHeight: 1.5, maxHeight: 120, overflow: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || !donorId || loading}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: input.trim() && donorId && !loading
                ? 'linear-gradient(135deg, #c8102e, #8b0000)' : '#e2e8f0',
              color: input.trim() && donorId && !loading ? '#fff' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && donorId && !loading ? 'pointer' : 'default',
              transition: 'all 0.2s', flexShrink: 0,
              boxShadow: input.trim() && donorId && !loading ? '0 2px 8px rgba(200,16,46,0.35)' : 'none',
            }}
          >
            <IconSend />
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 7 }}>
          Shift+Enter for new line Enter to send
        </p>
      </div>
    </div>
    <McpActivityPanel calls={mcpCalls} />
    </div>
    </>
  )
}

