import { useState } from 'react'
import CandidateSelector from './components/CandidateSelector'
import Chat from './components/Chat'

export default function App() {
  const [donorId, setDonorId] = useState(null)
  const [donorName, setDonorName] = useState(null)

  const handleSelect = (id, name) => {
    setDonorId(id)
    setDonorName(name)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #c8102e 0%, #8b0000 100%)',
        padding: '0 28px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(200,16,46,0.3)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🏥</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Clinic Booking Assistant
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
              Powered by OpenAI · MCP
            </div>
          </div>
        </div>
        {donorName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 24, padding: '6px 14px 6px 8px',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {donorName.split(' ').map(n => n[0]).join('')}
            </div>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{donorName}</span>
          </div>
        )}
      </header>

      {/* Main layout */}
      <main style={{
        flex: 1,
        display: 'flex',
        maxWidth: 1040,
        margin: '0 auto',
        width: '100%',
        padding: '24px 20px',
        gap: 20,
        alignItems: 'flex-start',
      }}>
        <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 24 }}>
          <CandidateSelector onSelect={handleSelect} selectedId={donorId} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Chat donorId={donorId} setInput={undefined} />
        </div>
      </main>
    </div>
  )
}
