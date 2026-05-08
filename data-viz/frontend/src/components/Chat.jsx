import { useState, useRef, useEffect } from 'react'
import ChartRenderer from './ChartRenderer'

const BotAvatar = () => (
  <div style={{
    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #c8102e, #8b0000)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, boxShadow: '0 2px 8px rgba(200,16,46,0.4)',
  }}>📈</div>
)

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: 5, padding: '2px 0', alignItems: 'center' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: '#cbd5e1',
        animation: `dv-bounce 1.3s ${i * 0.18}s ease-in-out infinite`,
      }} />
    ))}
    <style>{`
      @keyframes dv-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
  </div>
)

const EMPTY_SUGGESTIONS = [
  'Show me the overall results summary',
  'What is the analyte breakdown for this month?',
  'How is the pipeline performing?',
  'Show turnaround time trends',
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const handler = (e) => send(e.detail)
    window.addEventListener('quick-query', handler)
    return () => window.removeEventListener('quick-query', handler)
  }, [history])

  const send = async (text) => {
    const msg = text ?? input
    if (!msg.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, user_message: msg }),
      })
      const data = await res.json()
      setHistory(data.messages)
      setMessages(prev => [...prev, { role: 'assistant', reply: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        reply: { summary: 'Something went wrong. Please try again.', error: true },
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
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 116px)',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <BotAvatar />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Analytics Assistant</div>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#10b981',
              display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
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
          >Clear chat</button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: '10%' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
            }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              What would you like to analyze?
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 340, margin: '0 auto 28px', lineHeight: 1.65 }}>
              Ask me about results summaries, analyte breakdowns, turnaround times, or pipeline status.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 480, margin: '0 auto' }}>
              {EMPTY_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: '8px 15px', borderRadius: 20,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
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
              marginBottom: 16,
            }}
          >
            {m.role === 'assistant' && <BotAvatar />}
            <div style={{
              maxWidth: '80%',
              ...(m.role === 'user' ? {
                padding: '10px 15px',
                borderRadius: '18px 18px 4px 18px',
                background: 'linear-gradient(135deg, #c8102e, #8b0000)',
                color: '#fff',
                fontSize: 13.5, lineHeight: 1.6,
                boxShadow: '0 3px 10px rgba(200,16,46,0.3)',
              } : {
                width: '100%',
                background: '#f8fafc',
                borderRadius: '4px 18px 18px 18px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              })
            }}>
              {m.role === 'user' ? (
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</span>
              ) : (
                <div style={{ padding: '14px 16px' }}>
                  {m.reply?.summary && (
                    <p style={{
                      fontSize: 13.5, lineHeight: 1.65, color: '#475569',
                      margin: m.reply?.visualization ? '0 0 14px' : '0',
                      whiteSpace: 'pre-wrap',
                    }}>{m.reply.summary}</p>
                  )}
                  {m.reply?.visualization && m.reply?.data && (
                    <div style={{
                      background: '#fff',
                      borderRadius: 10,
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <ChartRenderer visualization={m.reply.visualization} data={m.reply.data} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
            <BotAvatar />
            <div style={{
              padding: '12px 16px',
              borderRadius: '4px 18px 18px 18px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: '#f8fafc',
          borderRadius: 26,
          padding: '6px 6px 6px 16px',
          border: '1.5px solid #e2e8f0',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your drug testing data…"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 13.5, color: '#1e293b', outline: 'none',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: (loading || !input.trim())
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #c8102e, #8b0000)',
              color: (loading || !input.trim()) ? '#94a3b8' : '#fff',
              cursor: (loading || !input.trim()) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.2s', fontSize: 15,
              boxShadow: (loading || !input.trim()) ? 'none' : '0 2px 8px rgba(200,16,46,0.4)',
            }}
          >➤</button>
        </div>
        <div style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 7 }}>
          Enter to send · Claude AI · MCP-powered
        </div>
      </div>
    </div>
  )
}
