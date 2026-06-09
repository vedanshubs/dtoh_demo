import { useState, useEffect } from 'react'
import CandidateSelector from './components/CandidateSelector'
import BookingChat from './components/Chat'

/* ── Icons (inline SVG, no deps) ─────────────────────────────────────── */
const IconCalendar = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconShield = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const VIEWS = [
  { id: 'booking',   label: 'Book a Test',  Icon: IconCalendar,  desc: 'Schedule employee drug tests' },
]

function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(window.innerWidth <= bp)
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return mobile
}

/* ── Global baseline styles ──────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { overflow: hidden; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      button { font-family: inherit; }
      input  { font-family: inherit; }
      textarea { font-family: inherit; }
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
      @keyframes skel-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
      @keyframes mcp-dot-pulse {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */
function Sidebar({ view, onViewChange, isMobile }) {
  if (isMobile) return null
  return (
    <aside style={{
      width: 228,
      flexShrink: 0,
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Brand */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(145deg, #c8102e 0%, #8b0000 100%)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 20px rgba(200,16,46,0.5)',
            letterSpacing: '-0.02em', flexShrink: 0,
          }}>U</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em' }}>UBS Group</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>Health Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.22)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '2px 10px 10px',
        }}>Applications</p>

        {VIEWS.map(({ id, label, Icon }) => {
          const active = view === id
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 3,
                background: active ? 'rgba(200,16,46,0.16)' : 'transparent',
                color: active ? '#fca5a5' : 'rgba(255,255,255,0.42)',
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                textAlign: 'left',
                transition: 'background 0.15s, color 0.15s',
                borderLeft: `3px solid ${active ? '#c8102e' : 'transparent'}`,
                paddingLeft: active ? 9 : 12,
              }}
            >
              <Icon color={active ? '#fca5a5' : 'rgba(255,255,255,0.42)'} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Status footer */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0,
            boxShadow: '0 0 0 2px rgba(52,211,153,0.25)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>MCP Server Online</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.18)',
          borderRadius: 6, padding: '3px 8px',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#eab308' }} />
          <span style={{ fontSize: 10, color: '#ca8a04', fontWeight: 600, letterSpacing: '0.04em' }}>MOCK MODE</span>
        </div>
      </div>
    </aside>
  )
}

/* ── Top Header ──────────────────────────────────────────────────────── */
function AppHeader({ view, donor, isMobile, onViewChange }) {
  const meta = {
    booking:   { title: 'Drug Test Booking',      sub: 'Schedule and manage employee occupational health tests' },
  }
  const { title, sub } = meta[view]

  return (
    <header style={{
      height: 64, background: 'linear-gradient(135deg, #c8102e 0%, #8b0000 100%)',
      borderBottom: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, flexShrink: 0,
        }}>📅</div>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</h1>
          <p  style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1, marginTop: 2 }}>{sub}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isMobile && (
          <div style={{ display: 'flex', gap: 4 }}>
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                style={{
                  padding: '5px 10px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                  background: view === id ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: view === id ? '#c8102e' : '#fff',
                }}
              >{label}</button>
            ))}
          </div>
        )}
        {!isMobile && donor && view === 'booking' && <DonorBadge donor={donor} />}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600, color: '#fff',
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
          padding: '4px 10px', borderRadius: 20,
        }}>
          <IconShield size={12} color="#fff" />Demo Mode
        </div>
      </div>
    </header>
  )
}

function DonorBadge({ donor }) {
  const initials = `${donor.first_name[0]}${donor.last_name[0]}`
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 24, padding: '5px 12px 5px 6px',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#c8102e', flexShrink: 0,
      }}>{initials}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
          {donor.first_name} {donor.last_name}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1, marginTop: 1 }}>{donor.role || 'Employee'}</div>
      </div>
    </div>
  )
}

/* ── Layout views ────────────────────────────────────────────────────── */
function BookingLayout({ donorId, donor, onSelectDonor, isMobile }) {
  const [showPanel, setShowPanel] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', height: '100%', overflow: 'hidden' }}>
      {isMobile && (
        <div style={{
          flexShrink: 0, background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
            {donor ? `${donor.first_name} ${donor.last_name}` : 'No candidate selected'}
          </span>
          <button
            onClick={() => setShowPanel(p => !p)}
            style={{
              padding: '5px 12px', borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: showPanel ? '#fef2f2' : '#f8fafc',
              fontSize: 11.5, fontWeight: 600,
              color: showPanel ? '#c8102e' : '#475569', cursor: 'pointer',
            }}
          >{showPanel ? 'Hide ▲' : 'Select Candidate ▼'}</button>
        </div>
      )}
      {(!isMobile || showPanel) && (
        <div style={{
          width: isMobile ? '100%' : 272,
          maxHeight: isMobile ? 260 : undefined,
          flexShrink: 0, background: '#ffffff',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          borderBottom: isMobile && showPanel ? '1px solid #e2e8f0' : 'none',
          overflowY: 'auto',
        }}>
          <CandidateSelector
            onSelect={(d) => { onSelectDonor(d); if (isMobile) setShowPanel(false) }}
            selectedId={donorId}
          />
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px', background: '#f8fafc', minHeight: 0 }}>
        <BookingChat donorId={donorId} donorName={donor ? donor.first_name : null} donor={donor} onDonorCreated={onSelectDonor} />
      </div>
    </div>
  )
}

/* ── Root App ────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView]       = useState('booking')
  const [donorId, setDonorId] = useState(null)
  const [donor, setDonor]     = useState(null)
  const isMobile               = useIsMobile()

  const handleSelectDonor = (d) => {
    setDonorId(d.id)
    setDonor(d)
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#f1f5f9',
    }}>
      <GlobalStyles />
      <Sidebar view={view} onViewChange={setView} isMobile={isMobile} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <AppHeader view={view} donor={donor} isMobile={isMobile} onViewChange={setView} />

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
          <BookingLayout donorId={donorId} donor={donor} onSelectDonor={handleSelectDonor} isMobile={isMobile} />
        </div>
      </div>
    </div>
  )
}
