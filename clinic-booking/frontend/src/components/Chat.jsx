import { useState, useRef, useEffect } from 'react'

export default function Chat({ donorId }) {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || !donorId) return
    const userMsg = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donor_id: donorId, messages: history, user_message: input }),
    })
    const data = await res.json()
    setHistory(data.messages)
    setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            textAlign: m.role === 'user' ? 'right' : 'left',
            margin: '8px 0',
          }}>
            <span style={{
              display: 'inline-block',
              background: m.role === 'user' ? '#007bff' : '#f1f1f1',
              color: m.role === 'user' ? '#fff' : '#000',
              padding: '8px 12px',
              borderRadius: 12,
              maxWidth: '70%',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </span>
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Claude is thinking...</p>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', padding: 16, gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={donorId ? 'Type a message...' : 'Select a donor first'}
          disabled={!donorId}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button onClick={send} disabled={!donorId || loading} style={{ padding: '10px 20px' }}>
          Send
        </button>
      </div>
    </div>
  )
}
