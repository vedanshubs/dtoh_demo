import { useState } from 'react'

/* Inline ZIP + radius form, rendered in-chat from a location_request action.
   On submit it sends a "Search near ZIP X within Y miles." message so the LLM
   runs search_clinics with those params. Styled to match InlineDatePicker. */

const RADII = [5, 10, 25, 50]

export default function LocationForm({ defaultZip = '', defaultRadius = 10, onSubmit }) {
  const [zip, setZip]         = useState(defaultZip || '')
  const [radius, setRadius]   = useState(RADII.includes(defaultRadius) ? defaultRadius : 10)
  const [custom, setCustom]   = useState(false)
  const [customVal, setCustomVal] = useState('')

  const effectiveRadius = custom ? parseInt(customVal, 10) : radius
  const zipValid    = /^\d{5}$/.test(zip.trim())
  const radiusValid = custom ? (Number.isInteger(effectiveRadius) && effectiveRadius >= 1 && effectiveRadius <= 200) : true
  const canSubmit   = zipValid && radiusValid

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3)
    setCustomVal(val)
  }

  const selectPreset = (r) => {
    setRadius(r)
    setCustom(false)
    setCustomVal('')
  }

  return (
    <div style={{
      marginTop: 10, background: '#fff', border: '1.5px solid #e2e8f0',
      borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      animation: 'fadeSlideIn 0.22s ease', maxWidth: 420,
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>📍</span>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc' }}>Where should I search?</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>ZIP code and how far you'll travel</div>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          ZIP Code
        </div>
        <input
          value={zip}
          onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="10018"
          inputMode="numeric"
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1.5px solid #e2e8f0', background: '#f8fafc',
            fontSize: 14, color: '#0f172a', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box', letterSpacing: '0.05em',
          }}
          onFocus={e => e.target.style.borderColor = '#c8102e'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />

        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '14px 0 7px' }}>
          Search Radius
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {RADII.map(r => {
            const active = !custom && radius === r
            return (
              <button key={r} onClick={() => selectPreset(r)} style={{
                flex: 1, padding: '7px 0', borderRadius: 20,
                border: `1.5px solid ${active ? '#c8102e' : '#e2e8f0'}`,
                background: active ? '#fef2f2' : '#f8fafc',
                color: active ? '#c8102e' : '#334155',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>{r} mi</button>
            )
          })}
          {/* Custom toggle */}
          <button onClick={() => { setCustom(true); setCustomVal('') }} style={{
            flex: 1, padding: '7px 0', borderRadius: 20,
            border: `1.5px solid ${custom ? '#c8102e' : '#e2e8f0'}`,
            background: custom ? '#fef2f2' : '#f8fafc',
            color: custom ? '#c8102e' : '#334155',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
          }}>Custom</button>
        </div>

        {/* Custom radius input — slides in when Custom is selected */}
        {custom && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeSlideIn 0.18s ease' }}>
            <input
              autoFocus
              value={customVal}
              onChange={handleCustomChange}
              placeholder="e.g. 35"
              inputMode="numeric"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: `1.5px solid ${customVal && !radiusValid ? '#fca5a5' : '#e2e8f0'}`,
                background: '#f8fafc', fontSize: 14, color: '#0f172a',
                outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = '#c8102e'}
              onBlur={e => e.target.style.borderColor = (customVal && !radiusValid) ? '#fca5a5' : '#e2e8f0'}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>miles</span>
            {customVal && !radiusValid && (
              <span style={{ fontSize: 11, color: '#ef4444', whiteSpace: 'nowrap' }}>1–200</span>
            )}
          </div>
        )}

        <button
          onClick={() => canSubmit && onSubmit(zip.trim(), effectiveRadius)}
          disabled={!canSubmit}
          style={{
            width: '100%', marginTop: 14, padding: '9px 0', borderRadius: 8,
            background: canSubmit ? 'linear-gradient(135deg, #c8102e, #9b0f23)' : '#e2e8f0',
            color: canSubmit ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: canSubmit ? 'pointer' : 'default', transition: 'all 0.2s',
            boxShadow: canSubmit ? '0 2px 8px rgba(200,16,46,0.3)' : 'none',
          }}
        >
          {!zipValid ? 'Enter a 5-digit ZIP' : !radiusValid ? 'Enter a valid radius (1–200 mi)' : `Search ${effectiveRadius} miles around ${zip}`}
        </button>
      </div>
    </div>
  )
}
