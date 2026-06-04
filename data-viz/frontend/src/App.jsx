import Chat from './components/Chat'

const QUICK_QUERIES = [
  { icon: '📊', label: 'Positive rate',       query: "What's our positive rate so far this year, broken down by test reason?" },
  { icon: '🧪', label: 'Substance breakdown', query: 'Which substances are driving our positives this year?' },
  { icon: '⏱️', label: 'SLA performance',    query: 'How are we tracking against our 5-day turnaround SLA?' },
  { icon: '🔄', label: 'Pipeline',            query: "What's currently in the pipeline, and where are the bottlenecks?" },
]

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #c8102e 0%, #8b0000 100%)',
        borderBottom: 'none',
        padding: '0 28px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #c8102e, #8b0000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, boxShadow: '0 2px 10px rgba(200,16,46,0.4)',
          }}>📈</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              Drug Testing Analytics
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
              AI-powered · MCP
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#10b981',
            boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
          }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Live</span>
        </div>
      </header>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex',
        maxWidth: 1100, margin: '0 auto', width: '100%',
        padding: '24px 20px', gap: 20,
        alignItems: 'flex-start',
      }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0, position: 'sticky', top: 88 }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{
                fontSize: 11, fontWeight: 600, color: '#94a3b8',
                letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>Quick Queries</h2>
            </div>
            <div style={{ padding: 8 }}>
              {QUICK_QUERIES.map(q => (
                <QuickQueryButton key={q.label} icon={q.icon} label={q.label} query={q.query} />
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 16,
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              Available Tools
            </div>
            {[
              { icon: '📋', name: 'Results Summary' },
              { icon: '🧬', name: 'Analyte Breakdown' },
              { icon: '⏱️', name: 'Turnaround Stats' },
              { icon: '🔄', name: 'Pipeline Status' },
            ].map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Chat />
        </div>
      </div>
    </div>
  )
}

function QuickQueryButton({ icon, label, query }) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('quick-query', { detail: query }))
  }
  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 11px', borderRadius: 10, border: 'none',
        background: 'transparent', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>{label}</span>
    </button>
  )
}
