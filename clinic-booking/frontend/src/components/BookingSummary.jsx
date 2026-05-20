import { useState } from 'react'

export default function BookingSummary({ summary, onConfirm, onEdit }) {
  const [confirmed, setConfirmed] = useState(false)
  if (!summary) return null

  const rows = [
    { icon: '👤', label: 'Candidate',      value: summary['Candidate']       },
    { icon: '🧪', label: 'Test Type',      value: summary['Test Type']       },
    { icon: '📋', label: 'Reason',         value: summary['Reason']          },
    { icon: '📅', label: 'Preferred Date', value: summary['Preferred Date']  },
    { icon: '🏥', label: 'Clinic',         value: summary['Clinic']          },
    { icon: '📍', label: 'Address',        value: summary['Address']         },
    { icon: '📮', label: 'ZIP Code',       value: summary['ZIP']             },
  ].filter(r => r.value)

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #c8102e',
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: 14,
      boxShadow: '0 6px 22px rgba(200,16,46,0.12)',
      animation: 'fadeSlideIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #c8102e, #9b0f23)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 17 }}>📋</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
          Booking Summary — Please Confirm
        </span>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '14px 18px 6px' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', gap: 12, padding: '9px 0',
            borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, width: 22, flexShrink: 0, lineHeight: 1.3 }}>{r.icon}</span>
            <span style={{
              width: 110, flexShrink: 0,
              fontSize: 11.5, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              paddingTop: 2,
            }}>{r.label}</span>
            <span style={{
              fontSize: 14.5, color: '#0f172a', flex: 1,
              fontWeight: 500, lineHeight: 1.45,
            }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Reminders */}
      <div style={{ padding: '12px 18px', background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
        <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.85, fontWeight: 500 }}>
          ⚠️ Bring a valid government-issued photo ID<br />
          ⏰ Arrive 10 minutes before your appointment<br />
          💧 Follow specimen preparation guidelines for your test type
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={() => { setConfirmed(true); onConfirm() }}
          disabled={confirmed}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10,
            background: confirmed
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #c8102e, #9b0f23)',
            color: confirmed ? '#94a3b8' : '#fff',
            fontSize: 14.5, fontWeight: 700,
            border: 'none', cursor: confirmed ? 'default' : 'pointer',
            boxShadow: confirmed ? 'none' : '0 3px 12px rgba(200,16,46,0.32)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!confirmed) e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { if (!confirmed) e.currentTarget.style.opacity = '1' }}
        >
          ✅ Confirm Booking
        </button>
        <button
          onClick={onEdit}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10,
            background: '#f8fafc', color: '#475569',
            fontSize: 14, fontWeight: 600,
            border: '1.5px solid #e2e8f0', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#1e293b' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
        >
          ✏️ Edit Details
        </button>
      </div>
    </div>
  )
}
