import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Find clinics near me',
  'Book a drug test',
  'What clinics accept walk-ins?',
  'Show clinics within 5 miles',
]

const BotAvatar = () => (
  <div style={{
    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #c8102e, #8b0000)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, boxShadow: '0 2px 6px rgba(200,16,46,0.35)',
  }}>🏥</div>
)

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: 5, padding: '2px 0', alignItems: 'center' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: '#94a3b8',
        animation: `cb-bounce 1.3s ${i * 0.18}s ease-in-out infinite`,
      }} />
    ))}
    <style>{`
      @keyframes cb-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
  </div>
)

export default function Chat({ donorId }) {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = text ?? input
    if (!msg.trim() || !donorId) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_id: donorId, messages: history, user_message: msg }),
      })
      const data = await res.json()
      setHistory(data.messages)
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
        error: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 116px)',
      overflow: 'hidden',
    }}>
      {/* Chat top bar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <BotAvatar />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Booking Assistant</div>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#10b981', display: 'inline-block',
              boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
            }} />
            Online · Claude AI
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setHistory([]) }}
            style={{
              marginLeft: 'auto', padding: '5px 12px', borderRadius: 20,
              border: '1px solid #e2e8f0', background: 'transparent',
              fontSize: 12, color: '#94a3b8', cursor: 'pointer',
            }}
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: '12%' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
            }}>🏥</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              {donorId ? 'How can I help you?' : 'Select a candidate to start'}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 300, margin: '0 auto 24px', lineHeight: 1.6 }}>
              {donorId
                ? 'Ask me to find nearby clinics, check walk-in availability, or complete a booking.'
                : 'Choose a candidate from the left panel to begin the booking process.'}
            </div>
            {donorId && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 400, margin: '0 auto' }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: '8px 15px', borderRadius: 20,
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      fontSize: 12, color: '#475569', cursor: 'pointer',
                      transition: 'all 0.15s', fontWeight: 500,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#fef2f2'
                      e.currentTarget.style.borderColor = '#fecaca'
                      e.currentTarget.style.color = '#c8102e'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.color = '#475569'
                    }}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
              marginBottom: 14,
            }}
          >
            {m.role === 'assistant' && <BotAvatar />}
            <div style={{
              maxWidth: '74%',
              padding: '11px 15px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              background: m.role === 'user'
                ? 'linear-gradient(135deg, #c8102e 0%, #9b0f23 100%)'
                : m.error ? '#fef2f2' : '#f1f5f9',
              color: m.role === 'user' ? '#fff' : m.error ? '#dc2626' : '#1e293b',
              fontSize: 13.5, lineHeight: 1.65,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              boxShadow: m.role === 'user'
                ? '0 3px 10px rgba(200,16,46,0.28)'
                : '0 1px 3px rgba(0,0,0,0.06)',
              border: m.error ? '1px solid #fecaca' : 'none',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
            <BotAvatar />
            <div style={{
              padding: '12px 16px',
              borderRadius: '4px 18px 18px 18px',
              background: '#f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: '#f8fafc',
          borderRadius: 26,
          padding: '6px 6px 6px 16px',
          border: '1.5px solid #e2e8f0',
          transition: 'border-color 0.2s',
        }}
          onFocus={() => { }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={donorId ? 'Ask about clinics, bookings…' : 'Select a candidate first'}
            disabled={!donorId}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 13.5, color: '#1e293b', outline: 'none',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!donorId || loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: (!donorId || loading || !input.trim())
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #c8102e, #8b0000)',
              color: '#fff', cursor: (!donorId || loading || !input.trim()) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.2s', fontSize: 15,
              boxShadow: (!donorId || loading || !input.trim()) ? 'none' : '0 2px 8px rgba(200,16,46,0.35)',
            }}
          >➤</button>
        </div>
        <div style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 7 }}>
          Enter to send · OpenAI · MCP-powered
        </div>
      </div>
    </div>
  )
}
