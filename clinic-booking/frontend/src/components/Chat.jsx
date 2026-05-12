import { useState, useRef, useEffect } from 'react'

/* ── Icons ───────────────────────────────────────────────────────────── */
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
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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

const SUGGESTIONS = [
  'Find clinics near me',
  'Book a 5-panel urine test',
  'Show walk-in clinics only',
  'Search within 5 miles',
]

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

/* ── Clinic card list ────────────────────────────────────────────────── */
const PAGE_SIZE = 5

function ClinicCards({ clinics, onBook }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const shown = clinics.slice(0, visible)
  const hasMore = visible < clinics.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
      {shown.map((c, i) => {
        const walkIn = c.Attributes?.some(a => a.AttributeName === 'WalkIn' && a.AttributeValue === 'Y')
        const collectionTypes = c.Attributes?.find(a => a.AttributeName === 'CollectionType')?.AttributeValue || ''
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
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            animation: `fadeSlideIn 0.25s ${i * 0.06}s ease both`,
          }}>
            {/* Top row: name + distance */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
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

            {/* Meta row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {c.Hours && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
                  <IconClock />{c.Hours}
                </span>
              )}
              {phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
                  <IconPhone />{phone}
                </span>
              )}
              {walkIn && (
                <span style={{
                  fontSize: 10.5, fontWeight: 600, color: '#0369a1',
                  background: '#e0f2fe', border: '1px solid #bae6fd',
                  borderRadius: 20, padding: '2px 8px',
                }}>Walk-in</span>
              )}
              {collectionTypes && collectionTypes.split(',').map(t => (
                <span key={t} style={{
                  fontSize: 10.5, color: '#7c3aed',
                  background: '#f5f3ff', border: '1px solid #ddd6fe',
                  borderRadius: 20, padding: '2px 8px',
                }}>{t.trim()}</span>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 8,
                  background: '#1e40af', color: '#fff',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  transition: 'background 0.15s',
                  border: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.background = '#1e40af'}
              >
                <IconExternalLink /> View on Map
              </a>
              <button
                onClick={() => onBook(c)}
                style={{
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
          Show more ({Math.min(PAGE_SIZE, clinics.length - visible)} of {clinics.length - visible} remaining)
        </button>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function Chat({ donorId }) {
  const [messages, setMessages] = useState([])
  const [history,  setHistory]  = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setMessages([])
    setHistory([])
  }, [donorId])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || !donorId || loading) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_id: donorId, messages: history, user_message: msg }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setHistory(data.messages)
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.reply,
        clinics: data.clinics ?? null,
      }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${err.message || 'Something went wrong.'}`, error: true }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleBook = (clinic) => {
    send(`Book ${clinic.SiteName} (Site ID ${clinic.EscreenSiteId ?? clinic.CollectionSiteId})`)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div style={{
      background: '#ffffff', borderRadius: 14,
      border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 18px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#fff',
      }}>
        <BotAvatar />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>Booking Assistant</div>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            AI-powered · MCP tools active
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setHistory([]) }}
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

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: '10%', animation: 'fadeSlideIn 0.4s ease' }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 26,
            }}>🏥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {donorId ? 'Ready to assist' : 'Select a candidate first'}
            </div>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 320, margin: '0 auto 22px', lineHeight: 1.65 }}>
              {donorId
                ? 'Ask me to find nearby clinics, filter by walk-in availability, or complete a booking.'
                : 'Choose an employee from the left panel to begin the drug test booking process.'}
            </p>
            {donorId && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 400, margin: '0 auto' }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: '7px 14px', borderRadius: 20,
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      fontSize: 12, color: '#475569', cursor: 'pointer',
                      fontWeight: 500, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = '#c8102e' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start', gap: 8, marginBottom: 14,
            animation: 'fadeSlideIn 0.25s ease',
          }}>
            {m.role === 'assistant' && (
              <div style={{ paddingTop: 2 }}><BotAvatar /></div>
            )}
            <div style={{ maxWidth: m.clinics ? '92%' : '76%', minWidth: 0 }}>
              {/* Text bubble */}
              <div style={{
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #c8102e 0%, #9b0f23 100%)'
                  : m.error ? '#fef2f2' : '#f1f5f9',
                color: m.role === 'user' ? '#fff' : m.error ? '#dc2626' : '#0f172a',
                fontSize: 13.5, lineHeight: 1.7,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                boxShadow: m.role === 'user' ? '0 3px 12px rgba(200,16,46,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                border: m.error ? '1px solid #fecaca' : 'none',
              }}>
                {m.text}
              </div>
              {/* Clinic cards */}
              {m.clinics && m.clinics.length > 0 && (
                <ClinicCards clinics={m.clinics} onBook={handleBook} />
              )}
            </div>
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

      {/* Input bar */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
        {!donorId && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', padding: '8px 0 4px' }}>
            ⬅ Select a candidate to enable chat
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
            placeholder={donorId ? 'Ask about clinics, test types, or booking…' : 'Select a candidate first'}
            rows={1}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              resize: 'none', outline: 'none',
              fontSize: 13.5, color: '#0f172a',
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
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}