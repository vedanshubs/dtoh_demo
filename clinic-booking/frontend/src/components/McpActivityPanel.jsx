import { useState } from 'react'

const TOOL_META = {
  search_clinics: { label: 'search_clinics', color: '#2563eb', bg: '#eff6ff', icon: '🔍' },
  place_order:    { label: 'place_order',    color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
}

function ArgChip({ k, v }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: '#f1f5f9', borderRadius: 4,
      padding: '1px 6px', fontSize: 10.5, fontFamily: 'monospace',
      color: '#475569', flexShrink: 0,
    }}>
      <span style={{ color: '#94a3b8' }}>{k}=</span>
      <span style={{ color: '#1e293b', fontWeight: 600 }}>{String(v)}</span>
    </span>
  )
}

function ToolCallEntry({ call, index }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TOOL_META[call.tool] || { label: call.tool, color: '#7c3aed', bg: '#f5f3ff', icon: '⚙️' }
  const argEntries = Object.entries(call.args || {})

  return (
    <div style={{
      borderRadius: 8,
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: '#fff',
          border: 'none', cursor: 'pointer',
          padding: '9px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          minWidth: 16, flexShrink: 0,
        }}>#{index + 1}</span>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
          background: meta.bg, color: meta.color, letterSpacing: '0.02em',
          flexShrink: 0,
        }}>{meta.icon} {meta.label}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '10px 12px', background: '#fafafa' }}>
          {/* Args */}
          {argEntries.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                Input
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {argEntries.map(([k, v]) => <ArgChip key={k} k={k} v={v} />)}
              </div>
            </div>
          )}
          {/* Result */}
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Result
            </div>
            <div style={{
              fontSize: 11, color: '#374151', background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px',
              fontFamily: 'monospace', lineHeight: 1.5,
            }}>
              {call.result || '—'}
            </div>
          </div>
          {/* Timestamp */}
          {call.ts && (
            <div style={{ fontSize: 9.5, color: '#cbd5e1', marginTop: 7, textAlign: 'right' }}>
              {call.ts}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function McpActivityPanel({ calls }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      width: open ? 264 : 36,
      flexShrink: 0,
      background: '#fff',
      borderLeft: '1px solid #e2e8f0',
      borderRadius: '0 14px 14px 0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.22s ease',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Collapse MCP panel' : 'Show MCP Activity'}
        style={{
          flexShrink: 0,
          width: '100%',
          background: '#0f172a',
          border: 'none',
          cursor: 'pointer',
          padding: open ? '11px 14px' : '11px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: open ? 'flex-start' : 'center',
          borderRadius: '0 14px 0 0',
        }}
      >
        <span style={{ fontSize: 13 }}>⚙️</span>
        {open && (
          <>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em', flex: 1 }}>
              MCP Activity
            </span>
            {calls.length > 0 && (
              <span style={{
                background: '#c8102e', color: '#fff',
                fontSize: 10, fontWeight: 700,
                borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
              }}>
                {calls.length}
              </span>
            )}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>◀</span>
          </>
        )}
        {!open && calls.length > 0 && (
          <span style={{
            position: 'absolute',
            background: '#c8102e', color: '#fff',
            fontSize: 9, fontWeight: 700,
            borderRadius: 10, padding: '1px 4px',
            top: 6, right: 2,
          }}>
            {calls.length}
          </span>
        )}
      </button>

      {/* Calls list */}
      {open && (
        <div style={{ flex: 1, overflowY: 'auto', padding: calls.length ? '12px 10px' : 0 }}>
          {calls.length === 0 ? (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
              color: '#cbd5e1', fontSize: 11.5, lineHeight: 1.6,
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⚙️</div>
              MCP tool calls will appear here as the assistant works
            </div>
          ) : (
            calls.map((call, i) => (
              <ToolCallEntry key={i} call={call} index={i} />
            ))
          )}
        </div>
      )}

      {/* Collapsed vertical label */}
      {!open && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#cbd5e1',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>
            MCP
          </span>
        </div>
      )}
    </div>
  )
}
