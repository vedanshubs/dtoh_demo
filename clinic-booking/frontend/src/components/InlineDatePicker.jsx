import { useState } from 'react'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function getMondayOffset(weeksAhead = 0) {
  const d = new Date()
  const day = d.getDay()
  const toMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + toMonday + weeksAhead * 7)
  return d.toISOString().split('T')[0]
}

function getSundayOffset(weeksAhead = 0) {
  const mon = new Date(getMondayOffset(weeksAhead))
  mon.setDate(mon.getDate() + 6)
  return mon.toISOString().split('T')[0]
}

function humanDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Returns the day-of-week name from an ISO date string
function dayNameFromIso(iso) {
  if (!iso) return null
  return DAY_NAMES[new Date(iso + 'T12:00:00').getDay()]
}

// Returns { closed, open, close } for a given ISO date, or null if no hours data
function hoursForDate(iso, hoursByDay) {
  if (!hoursByDay || !iso) return null
  const dayName = dayNameFromIso(iso)
  return hoursByDay[dayName] || null
}

function fmt12(time24) {
  if (!time24 || time24 === '00:00') return null
  const [h, m] = time24.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function hoursLabel(info) {
  if (!info || info.closed) return 'Closed this day'
  const open  = fmt12(info.open)
  const close = fmt12(info.close)
  if (!open || !close) return 'Hours unavailable'
  return `Open ${open} – ${close}`
}

const QUICK = [
  { label: 'Today',     resolve: () => getDateStr(0) },
  { label: 'Tomorrow',  resolve: () => getDateStr(1) },
  { label: 'This Week', resolve: () => getDateStr(0) },
  { label: 'Next Week', resolve: () => getMondayOffset(0) },
]

export default function InlineDatePicker({ clinicName, hoursByDay, onSelect }) {
  const [mode, setMode]     = useState('single')
  const [single, setSingle] = useState('')
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')

  const today = getDateStr(0)

  // For the selected single date, check if clinic is open
  const singleHours  = hoursForDate(single, hoursByDay)
  const isClosed     = singleHours?.closed === true
  const openHoursMsg = single ? hoursLabel(singleHours) : null

  const confirm = () => {
    if (mode === 'single' && single && !isClosed) {
      onSelect(humanDate(single), single, singleHours)
    } else if (mode === 'range' && from && to) {
      const fromHours = hoursForDate(from, hoursByDay)
      onSelect(`${humanDate(from)} – ${humanDate(to)}`, from, fromHours)
    }
  }

  const handleQuick = (q) => {
    const iso = q.resolve()
    const info = hoursForDate(iso, hoursByDay)
    if (info?.closed) {
      // Auto-pick in single mode so user sees the warning
      setMode('single')
      setSingle(iso)
    } else {
      onSelect(humanDate(iso), iso, info)
    }
  }

  const canConfirm = mode === 'single'
    ? (!!single && !isClosed)
    : (!!from && !!to && from <= to)

  return (
    <div style={{
      marginTop: 10,
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      animation: 'fadeSlideIn 0.22s ease',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>📅</span>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc' }}>When would you like to go?</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{clinicName}</div>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Quick options */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
          Quick Select
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {QUICK.map(q => {
            const iso  = q.resolve()
            const info = hoursForDate(iso, hoursByDay)
            const closed = info?.closed === true
            return (
              <button
                key={q.label}
                onClick={() => handleQuick(q)}
                title={info ? hoursLabel(info) : undefined}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1.5px solid ${closed ? '#fecaca' : '#e2e8f0'}`,
                  background: closed ? '#fff5f5' : '#f8fafc',
                  fontSize: 12.5, fontWeight: 600,
                  color: closed ? '#ef4444' : '#334155',
                  cursor: 'pointer', transition: 'all 0.15s',
                  textDecoration: closed ? 'line-through' : 'none',
                  opacity: closed ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!closed) {
                    e.currentTarget.style.background = '#fef2f2'
                    e.currentTarget.style.borderColor = '#fecaca'
                    e.currentTarget.style.color = '#c8102e'
                  }
                }}
                onMouseLeave={e => {
                  if (!closed) {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.color = '#334155'
                  }
                }}
              >
                {q.label}
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          <span style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 600 }}>OR PICK A DATE</span>
          <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 10, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          {['single', 'range'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
                background: mode === m ? '#fff' : 'transparent',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: 12, fontWeight: 600,
                color: mode === m ? '#0f172a' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {m === 'single' ? 'Specific Date' : 'Date Range'}
            </button>
          ))}
        </div>

        {/* Date input(s) */}
        {mode === 'single' ? (
          <>
            <input
              type="date"
              value={single}
              min={today}
              onChange={e => setSingle(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: `1.5px solid ${isClosed ? '#fca5a5' : '#e2e8f0'}`,
                background: isClosed ? '#fff5f5' : '#f8fafc',
                fontSize: 13.5, color: '#0f172a', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = isClosed ? '#ef4444' : '#c8102e'}
              onBlur={e => e.target.style.borderColor = isClosed ? '#fca5a5' : '#e2e8f0'}
            />
            {/* Hours hint below date input */}
            {openHoursMsg && (
              <div style={{
                marginTop: 6, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                color: isClosed ? '#ef4444' : '#047857',
              }}>
                <span>{isClosed ? '⛔' : '✅'}</span>
                <span>{openHoursMsg}{isClosed ? ' — please pick another day' : ''}</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</div>
              <input
                type="date"
                value={from}
                min={today}
                onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo('') }}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  fontSize: 12.5, color: '#0f172a', outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#c8102e'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginTop: 14 }}>→</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</div>
              <input
                type="date"
                value={to}
                min={from || today}
                onChange={e => setTo(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  fontSize: 12.5, color: '#0f172a', outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#c8102e'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={confirm}
          disabled={!canConfirm}
          style={{
            width: '100%', marginTop: 12, padding: '9px 0', borderRadius: 8,
            background: canConfirm
              ? 'linear-gradient(135deg, #c8102e, #9b0f23)'
              : '#e2e8f0',
            color: canConfirm ? '#fff' : '#94a3b8',
            fontSize: 13, fontWeight: 700,
            border: 'none', cursor: canConfirm ? 'pointer' : 'default',
            transition: 'all 0.2s',
            boxShadow: canConfirm ? '0 2px 8px rgba(200,16,46,0.3)' : 'none',
          }}
        >
          {isClosed && single ? 'Clinic closed this day — pick another' : 'Confirm Date'}
        </button>
      </div>
    </div>
  )
}
