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
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 12,
      boxShadow: '0 4px 16px rgba(200,16,46,0.1)',
      animation: 'fadeSlideIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #c8102e, #9b0f23)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>📋</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>
          Booking Summary — Please Confirm
        </span>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '12px 16px 4px' }}>
        {rows.map(r => (
          <div key={r.label} style={{
            display: 'flex', gap: 10, padding: '5px 0',
            borderBottom: '1px solid #f8fafc',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 13, width: 20, flexShrink: 0 }}>{r.icon}</span>
            <span style={{ width: 80, flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 1 }}>{r.label}</span>
            <span style={{ fontSize: 13, color: '#0f172a', flex: 1 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Reminders */}
      <div style={{ padding: '10px 16px', background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
        <div style={{ fontSize: 11.5, color: '#92400e', lineHeight: 1.8 }}>
          ⚠️ Bring a valid government-issued photo ID<br />
          ⏰ Arrive 10 minutes before your appointment<br />
          💧 Follow specimen preparation guidelines for your test type
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={() => { setConfirmed(true); onConfirm() }}
          disabled={confirmed}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 8,
            background: confirmed
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #c8102e, #9b0f23)',
            color: confirmed ? '#94a3b8' : '#fff',
            fontSize: 13, fontWeight: 700,
            border: 'none', cursor: confirmed ? 'default' : 'pointer',
            boxShadow: confirmed ? 'none' : '0 2px 8px rgba(200,16,46,0.3)',
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
            flex: 1, padding: '9px 0', borderRadius: 8,
            background: '#f1f5f9', color: '#475569',
            fontSize: 13, fontWeight: 600,
            border: '1.5px solid #e2e8f0', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
        >
          ✏️ Edit Details
        </button>
      </div>
    </div>
  )
}
