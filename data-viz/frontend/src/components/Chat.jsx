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

function boldNumbers(text) {
  const html = text.replace(
    /(\d+\.?\d*%|\d+\.?\d+\s*days?|\b\d+\b)/g,
    '<strong style="color:#1e293b;font-weight:700">$1</strong>'
  )
  return { __html: html }
}

const TOOL_COLORS = {
  get_results_summary:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  get_pipeline_status:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
  get_analyte_breakdown: { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce', dot: '#a855f7' },
  get_turnaround_stats:  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
}

function McpTrace({ calls }) {
  if (!calls?.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
      {calls.map((c, i) => {
        const col = TOOL_COLORS[c.tool] || { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', dot: '#94a3b8' }
        const argStr = Object.entries(c.args || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')
        return (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: col.bg, border: `1px solid ${col.border}`,
            borderRadius: 20, padding: '3px 10px 3px 7px',
            fontSize: 11, fontWeight: 500,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: col.text }}>{c.tool}</span>
            {argStr && <span style={{ color: '#94a3b8' }}>·</span>}
            {argStr && <span style={{ color: '#64748b' }}>{argStr}</span>}
            {c.result && <span style={{ color: '#94a3b8' }}>→</span>}
            {c.result && <span style={{ color: col.text, fontWeight: 600 }}>{c.result}</span>}
          </div>
        )
      })}
    </div>
  )
}

const EMPTY_SUGGESTIONS = [
  "What's our positive rate for pre-employment tests this quarter?",
  'How many tests are currently waiting for MRO review?',
  'Which substances showed the most positives in the last 90 days?',
  'Are we meeting our 5-day turnaround SLA?',
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const handler = (e) => send(e.detail)
    window.addEventListener('quick-query', handler)
    return () => window.removeEventListener('quick-query', handler)
  }, [history, loading])

  const send = async (text) => {
    const msg = text ?? input
    if (!msg.trim() || loading) return

    const controller = new AbortController()
    abortRef.current = controller

    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, user_message: msg }),
        signal: controller.signal,
      })
      const data = await res.json()
      setHistory(data.messages)
      setMessages(prev => [...prev, { role: 'assistant', reply: data.reply, tool_calls: data.tool_calls || [] }])
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages(prev => [...prev, {
        role: 'assistant',
        reply: { summary: 'Something went wrong. Please try again.', error: true },
      }])
    } finally {
      abortRef.current = null
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const stop = () => {
    if (abortRef.current) abortRef.current.abort()
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
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Analytics Assistant</div>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#10b981',
              display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
            }} />
            Online
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
            <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, margin: '0 auto 28px', lineHeight: 1.65 }}>
              Ask me about positive rates, SLA compliance, pipeline backlogs, or substance-level breakdowns.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 520, margin: '0 auto' }}>
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
                fontSize: 14.5, lineHeight: 1.6,
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
                    <p
                      dangerouslySetInnerHTML={boldNumbers(m.reply.summary)}
                      style={{
                        fontSize: 14.5, lineHeight: 1.7, color: '#1e293b',
                        fontWeight: 400,
                        margin: m.reply?.visualization ? '0 0 14px' : '0',
                      }}
                    />
                  )}
                  {m.reply?.visualization && m.reply?.data && (
                    <ChartRenderer visualization={m.reply.visualization} data={m.reply.data} />
                  )}
                  <McpTrace calls={m.tool_calls} />
                  {i === messages.length - 1 && !loading && m.reply?.suggestions?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: m.tool_calls?.length ? 14 : 14 }}>
                      <div style={{ width: '100%', fontSize: 10.5, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Suggested follow-ups
                      </div>
                      {m.reply.suggestions.map((s, si) => (
                        <button
                          key={si}
                          onClick={() => send(s)}
                          style={{
                            padding: '6px 13px', borderRadius: 20,
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            fontSize: 11.5, color: '#1d4ed8', cursor: 'pointer',
                            fontWeight: 500, transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#dbeafe'
                            e.currentTarget.style.borderColor = '#93c5fd'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#eff6ff'
                            e.currentTarget.style.borderColor = '#bfdbfe'
                          }}
                        >{s}</button>
                      ))}
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
            placeholder="Ask about compliance, SLAs, test outcomes…"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 14.5, color: '#1e293b', outline: 'none',
            }}
          />
          {loading ? (
            <button
              onClick={stop}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: '#ef4444',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 13,
                boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
                transition: 'all 0.2s',
              }}
            >⏹</button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: !input.trim()
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg, #c8102e, #8b0000)',
                color: !input.trim() ? '#94a3b8' : '#fff',
                cursor: !input.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s', fontSize: 15,
                boxShadow: !input.trim() ? 'none' : '0 2px 8px rgba(200,16,46,0.4)',
              }}
            >➤</button>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 7 }}>
          Enter to send · MCP-powered
        </div>
      </div>
    </div>
  )
}
