import { useState, useRef, useEffect } from 'react'
import ChartRenderer from './ChartRenderer'

/* ── Icons ───────────────────────────────────────────────────────────── */
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const IconStop = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)
const IconBot = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const QUICK_QUERIES = [
  { label: 'Results Summary',   query: 'Show me a results summary for the last 30 days' },
  { label: 'Positive Rate',     query: 'What is the positive rate this quarter? How does it compare to the industry benchmark?' },
  { label: 'Analyte Breakdown', query: 'Show analyte breakdown for the last 90 days' },
  { label: 'SLA Compliance',    query: 'What are the turnaround time statistics and SLA compliance for the current year?' },
  { label: 'Pipeline Status',   query: 'What is the current pipeline status? Any backlogs to be aware of?' },
]

const EMPTY_SUGGESTIONS = [
  'Give me an overview of test results for Q1 2026',
  'What does our current testing pipeline look like?',
  'How are we doing on turnaround time and SLA compliance?',
]

function boldNumbers(text) {
  const html = text.replace(/(\d[\d,]*\.?\d*\s*%?)/g, '<strong>$1</strong>')
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
      {calls.map((c, i) => {
        const col = TOOL_COLORS[c.tool] || { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', dot: '#94a3b8' }
        const argStr = Object.entries(c.args || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')
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

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
          animation: `ac-typing 1.3s ${i * 0.18}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`@keyframes ac-typing { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }`}</style>
    </div>
  )
}

function BotAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', boxShadow: '0 2px 8px rgba(30,64,175,0.35)',
    }}>
      <IconBot />
    </div>
  )
}

function AnalyticsMessage({ msg, onSuggestionClick }) {
  const isUser = msg.role === 'user'
  const toolCalls = msg.tool_calls || []
  if (isUser) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginBottom: 14,
        animation: 'fadeSlideIn 0.25s ease',
      }}>
        <div style={{
          maxWidth: '72%', padding: '10px 14px',
          borderRadius: '16px 16px 4px 16px',
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
          color: '#fff', fontSize: 14.5, lineHeight: 1.65,
          boxShadow: '0 3px 12px rgba(30,64,175,0.3)',
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  const { text, reply } = msg
  const suggestions = reply?.suggestions || []

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
      animation: 'fadeSlideIn 0.25s ease',
    }}>
      <BotAvatar />
      <div style={{ maxWidth: '84%', minWidth: 0 }}>
        {/* Summary text */}
        <div
          style={{
            background: '#f1f5f9', borderRadius: '4px 16px 16px 16px',
            padding: '10px 14px', fontSize: 14.5, color: '#0f172a', lineHeight: 1.72,
            marginBottom: (reply?.visualization && reply?.data) || suggestions.length ? 10 : 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
          dangerouslySetInnerHTML={boldNumbers(text)}
        />

        {/* Chart */}
        {reply?.visualization && reply?.data && (
          <div style={{ marginBottom: (toolCalls.length || suggestions.length) ? 10 : 0 }}>
            <ChartRenderer visualization={reply.visualization} data={reply.data} />
          </div>
        )}

        {/* MCP tool trace */}
        <McpTrace calls={toolCalls} />

        {/* Token usage */}
        {msg.usage && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 20, padding: '2px 9px',
              fontSize: 10.5, color: '#64748b', fontWeight: 500,
            }}>
              🔢 {msg.usage.total_tokens.toLocaleString()} tokens
              <span style={{ color: '#94a3b8' }}>·</span>
              <span style={{ color: '#10b981' }}>↑{msg.usage.prompt_tokens.toLocaleString()}</span>
              <span style={{ color: '#94a3b8' }}>·</span>
              <span style={{ color: '#6366f1' }}>↓{msg.usage.completion_tokens.toLocaleString()}</span>
            </span>
          </div>
        )}

        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <div style={{ marginTop: toolCalls.length ? 12 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
              Suggested Follow-ups
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestionClick(s)}
                  style={{
                    textAlign: 'left', padding: '7px 12px',
                    borderRadius: 8, border: '1px solid #bfdbfe',
                    background: '#eff6ff', color: '#1d4ed8',
                    fontSize: 12.5, cursor: 'pointer',
                    lineHeight: 1.45, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function AnalyticsChat() {
  const [messages, setMessages] = useState([])
  const [history,  setHistory]  = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const abortRef   = useRef(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    if (sendingRef.current) return
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    sendingRef.current = true
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, user_message: msg }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setHistory(data.messages)
      const reply = data.reply
      const summaryText = typeof reply === 'object' ? (reply.summary || JSON.stringify(reply)) : reply
      setMessages(prev => [...prev, { role: 'assistant', text: summaryText, reply, tool_calls: data.tool_calls || [], usage: data.usage || null }])
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Something went wrong: ${err.message || 'Please try again.'}`,
        error: true,
      }])
    } finally {
      setLoading(false)
      sendingRef.current = false
      abortRef.current = null
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 14,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 18px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <BotAvatar />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0f172a' }}>Analytics Assistant</div>
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Online · MCP-powered
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setHistory([]) }}
            style={{
              padding: '5px 10px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: 'transparent',
              fontSize: 11.5, color: '#64748b', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick queries */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0,
        background: '#fafbfc',
      }}>
        {QUICK_QUERIES.map(q => (
          <button
            key={q.label}
            onClick={() => send(q.query)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontSize: 11.5, color: '#475569', cursor: loading ? 'default' : 'pointer',
              fontWeight: 500, transition: 'all 0.15s',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8' } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: '8%', animation: 'fadeSlideIn 0.4s ease' }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              border: '2px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 26,
            }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Drug Testing Compliance Analytics
            </div>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.7 }}>
              Ask about test results, positive rates, substance breakdowns, SLA compliance, or pipeline backlogs — in plain English.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420, margin: '0 auto' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                Try asking
              </div>
              {EMPTY_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    textAlign: 'left', padding: '8px 14px',
                    borderRadius: 8, border: '1px solid #bfdbfe',
                    background: '#eff6ff', color: '#1d4ed8',
                    fontSize: 12.5, cursor: 'pointer', lineHeight: 1.45,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <AnalyticsMessage key={i} msg={m} onSuggestionClick={send} />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
            <BotAvatar />
            <div style={{ padding: '11px 15px', borderRadius: '4px 16px 16px 16px', background: '#f1f5f9' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: '#f8fafc', border: '1.5px solid #e2e8f0',
          borderRadius: 12, padding: '8px 8px 8px 14px',
          transition: 'border-color 0.15s',
        }}
          onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
          onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder="Ask about results, substances, SLA compliance, or pipeline…"
            rows={1}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              resize: 'none', outline: 'none',
              fontSize: 13.5, color: '#0f172a',
              lineHeight: 1.5, maxHeight: 100, overflow: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
          />
          {loading ? (
            <button
              onClick={stop}
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none',
                background: '#ef4444', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
              }}
              title="Stop"
            >
              <IconStop />
            </button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none',
                background: input.trim()
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : '#e2e8f0',
                color: input.trim() ? '#fff' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s', flexShrink: 0,
                boxShadow: input.trim() ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
              }}
            >
              <IconSend />
            </button>
          )}
        </div>
        <p style={{ fontSize: 10.5, color: '#cbd5e1', textAlign: 'center', marginTop: 7 }}>
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
