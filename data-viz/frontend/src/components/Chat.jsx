import { useState, useRef, useEffect } from 'react'
import ChartRenderer from './ChartRenderer'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: input }])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, user_message: input }),
    })
    const data = await res.json()
    setHistory(data.messages)
    setMessages(prev => [...prev, { role: 'assistant', reply: data.reply }])
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '85vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '12px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            {m.role === 'user' ? (
              <span style={{ background: '#007bff', color: '#fff', padding: '8px 12px', borderRadius: 12, display: 'inline-block' }}>
                {m.text}
              </span>
            ) : (
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
                <p style={{ margin: '0 0 12px' }}>{m.reply?.summary}</p>
                {m.reply?.visualization && m.reply?.data && (
                  <ChartRenderer visualization={m.reply.visualization} data={m.reply.data} />
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Analyzing...</p>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', padding: 16, gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your drug testing data..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button onClick={send} disabled={loading} style={{ padding: '10px 20px' }}>Send</button>
      </div>
    </div>
  )
}
