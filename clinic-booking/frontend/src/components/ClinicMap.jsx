import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, OverlayViewF, InfoWindow } from '@react-google-maps/api'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const MAP_OPTIONS = {
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  ],
}

const NYC_FALLBACK = { lat: 40.7128, lng: -74.006 }

// ── Helpers ──────────────────────────────────────────────────────────
function clinicColor(c, isNearest) {
  if (isNearest) return '#d97706'
  const attr = n => c.Attributes?.find(a => a.AttributeName === n)?.AttributeValue === 'Yes'
  const dot    = c.dot_certified ?? attr('DOT Certified Physician')
  const walkIn = c.walk_in       ?? attr('Walk In Drug Testing - No Appointment Required')
  if (dot && walkIn) return '#7c3aed'
  if (dot)           return '#2563eb'
  if (walkIn)        return '#10b981'
  return '#64748b'
}

function getBadges(c, isNearest) {
  const attr = n => c.Attributes?.find(a => a.AttributeName === n)?.AttributeValue === 'Yes'
  const dot    = c.dot_certified         ?? attr('DOT Certified Physician')
  const walkIn = c.walk_in               ?? attr('Walk In Drug Testing - No Appointment Required')
  const access = c.wheelchair_accessible ?? attr('Handicap Access')
  return [
    isNearest && { label: '★ Nearest', color: '#92400e', bg: '#fef3c7' },
    dot       && { label: 'DOT',       color: '#1e40af', bg: '#dbeafe' },
    walkIn    && { label: 'Walk-in',   color: '#065f46', bg: '#d1fae5' },
    access    && { label: '♿',         color: '#1d4ed8', bg: '#eff6ff' },
  ].filter(Boolean)
}

function formatPhone(p) {
  const d = String(p).replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return p
}

// ── Pin rendered as HTML overlay ────────────────────────────────────
function ClinicPin({ label, color, isActive, isHovered, isNearest, onClick, onMouseEnter, onMouseLeave }) {
  const size = isActive ? 38 : isHovered ? 35 : (isNearest ? 34 : 30)
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -100%)',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        filter: isActive
          ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))'
          : isHovered
            ? 'drop-shadow(0 3px 7px rgba(0,0,0,0.35))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
        transition: 'filter 0.15s',
        zIndex: isActive ? 999 : isHovered ? 998 : isNearest ? 200 : 1,
      }}
    >
      {/* Circle */}
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: isActive ? '#0f172a' : color,
        border: `${isActive ? 3 : 2.5}px solid #fff`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isNearest ? size * 0.42 : size * 0.4,
        fontWeight: 700, color: '#fff',
        lineHeight: 1,
        transition: 'width 0.15s, height 0.15s, background 0.15s',
        userSelect: 'none',
      }}>
        {label}
      </div>
      {/* Downward stem */}
      <div style={{
        width: 0, height: 0,
        borderLeft:  '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop:   `8px solid ${isActive ? '#0f172a' : color}`,
        marginTop: -1,
        transition: 'border-top-color 0.15s',
      }} />
    </div>
  )
}

// ── "You are here" marker ────────────────────────────────────────────
function DonorPin({ name, zip }) {
  return (
    <div style={{
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes donorPulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.8); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>

      {/* Relative wrapper so the pulse ring is contained */}
      <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulsing ring — siblings with the dot, same origin */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: '50%',
          background: 'rgba(200,16,46,0.3)',
          animation: 'donorPulse 2s ease-out infinite',
        }} />
        {/* Core dot */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: '#c8102e',
          border: '3px solid #fff',
          boxShadow: '0 2px 8px rgba(200,16,46,0.6)',
          position: 'relative', zIndex: 1,
        }} />
      </div>

      {/* Name label */}
      {(name || zip) && (
        <div style={{
          marginTop: 5,
          background: '#c8102e', color: '#fff',
          padding: '2px 9px', borderRadius: 12,
          fontSize: 10, fontWeight: 700,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 5px rgba(200,16,46,0.35)',
        }}>
          {name || zip}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function ClinicMap({ clinics = [], donorZip, donorName, onBook }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: MAPS_API_KEY })
  const [donorLatLng, setDonorLatLng] = useState(null)
  const [activeId, setActiveId]       = useState(null)
  const [hoveredId, setHoveredId]     = useState(null)
  const mapRef   = useRef(null)
  const stripRef = useRef(null)
  const cardRefs = useRef({})

  // `clinics` arrives already ranked (same weighted order as the chat cards),
  // so the map's numbering and "best" pin match the list exactly.
  const ordered = clinics

  // Geocode donor ZIP
  useEffect(() => {
    if (!isLoaded || !donorZip) return
    const g = new window.google.maps.Geocoder()
    g.geocode({ address: `${donorZip}, USA` }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location
        setDonorLatLng({ lat: loc.lat(), lng: loc.lng() })
      }
    })
  }, [isLoaded, donorZip])

  // Fit bounds on first 5 clinics + donor, cap zoom at 14
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return
    const valid = ordered.filter(c =>
      Number.isFinite(Number(c.Latitude)) && Number.isFinite(Number(c.Longitude))
    )
    if (!valid.length && !donorLatLng) return
    const bounds = new window.google.maps.LatLngBounds()
    valid.slice(0, 5).forEach(c => bounds.extend({ lat: Number(c.Latitude), lng: Number(c.Longitude) }))
    if (donorLatLng) bounds.extend(donorLatLng)
    if (bounds.isEmpty()) return
    mapRef.current.fitBounds(bounds, 60)
    const l = window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
      if (mapRef.current.getZoom() > 14) mapRef.current.setZoom(14)
    })
    return () => window.google.maps.event.removeListener(l)
  }, [isLoaded, ordered, donorLatLng])

  // Scroll hovered card into view
  useEffect(() => {
    if (!hoveredId || !cardRefs.current[hoveredId] || !stripRef.current) return
    cardRefs.current[hoveredId].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [hoveredId])

  const initialCenter = useMemo(() => {
    if (donorLatLng) return donorLatLng
    const first = ordered.find(c => Number.isFinite(Number(c.Latitude)))
    return first ? { lat: Number(first.Latitude), lng: Number(first.Longitude) } : NYC_FALLBACK
  }, [ordered, donorLatLng])

  if (loadError) return (
    <div style={{ padding: 20, color: '#dc2626', fontSize: 13 }}>
      Maps failed to load — check API key + HTTP referrer restrictions.
    </div>
  )
  if (!isLoaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 13 }}>
      Loading map…
    </div>
  )

  const activeClinic = ordered.find(c => c.EscreenSiteId === activeId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={initialCenter}
          zoom={13}
          onLoad={m => { mapRef.current = m }}
          options={MAP_OPTIONS}
          onClick={() => setActiveId(null)}
        >
          {/* Donor pin */}
          {donorLatLng && (
            <OverlayViewF
              position={donorLatLng}
              mapPaneName="overlayMouseTarget"
            >
              <DonorPin name={donorName} zip={donorZip} />
            </OverlayViewF>
          )}

          {/* Clinic pins */}
          {ordered.map((c, idx) => {
            const id        = c.EscreenSiteId
            const isNearest = idx === 0
            const isActive  = id === activeId
            const isHovered = id === hoveredId
            const color     = clinicColor(c, isNearest)
            const lat = Number(c.Latitude), lng = Number(c.Longitude)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
            return (
              <OverlayViewF
                key={id}
                position={{ lat, lng }}
                mapPaneName="overlayMouseTarget"
              >
                <ClinicPin
                  label={isNearest ? '★' : String(idx + 1)}
                  color={color}
                  isActive={isActive}
                  isHovered={isHovered}
                  isNearest={isNearest}
                  onClick={e => { e.stopPropagation(); setActiveId(prev => prev === id ? null : id) }}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              </OverlayViewF>
            )
          })}

          {/* InfoWindow on click */}
          {activeClinic && (() => {
            const idx       = ordered.findIndex(c => c.EscreenSiteId === activeId)
            const isNearest = idx === 0
            const color     = clinicColor(activeClinic, isNearest)
            const badges    = getBadges(activeClinic, isNearest)
            const address   = [activeClinic.Address1, activeClinic.City, activeClinic.State, activeClinic.ZipCode].filter(Boolean).join(', ')
            return (
              <InfoWindow
                position={{ lat: Number(activeClinic.Latitude), lng: Number(activeClinic.Longitude) }}
                onCloseClick={() => setActiveId(null)}
                options={{ pixelOffset: new window.google.maps.Size(0, -52) }}
              >
                <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", maxWidth: 240, lineHeight: 1.45 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{
                      background: color, color: '#fff',
                      borderRadius: '50%', width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {isNearest ? '★' : idx + 1}
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, lineHeight: 1.3 }}>
                      {activeClinic.SiteName}
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: 11.5, marginBottom: 6, display: 'flex', gap: 4 }}>
                    <span style={{ flexShrink: 0 }}>📍</span>
                    <span>{address}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {activeClinic.Distance != null && (
                      <Chip label={`${activeClinic.Distance} mi`} color="#475569" bg="#f1f5f9" />
                    )}
                    {badges.map(b => <Chip key={b.label} label={b.label} color={b.color} bg={b.bg} />)}
                  </div>
                  {activeClinic.PhoneNumber && (
                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>
                      📞 {formatPhone(activeClinic.PhoneNumber)}
                    </div>
                  )}
                  {onBook && (
                    <button
                      onClick={() => onBook(activeClinic)}
                      style={{
                        width: '100%', padding: '7px 0',
                        background: 'linear-gradient(135deg,#c8102e,#8b0000)',
                        color: '#fff', border: 'none', borderRadius: 6,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Select this clinic →
                    </button>
                  )}
                </div>
              </InfoWindow>
            )
          })()}
        </GoogleMap>

        {/* Legend */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(255,255,255,0.97)',
          padding: '7px 11px', borderRadius: 8,
          fontSize: 10.5, color: '#475569',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', gap: 4,
          pointerEvents: 'none',
        }}>
          {[
            { color: '#c8102e', label: 'You are here', dot: true },
            { color: '#d97706', label: 'Nearest',      star: true },
            { color: '#7c3aed', label: 'DOT + walk-in' },
            { color: '#2563eb', label: 'DOT only' },
            { color: '#10b981', label: 'Walk-in' },
            { color: '#64748b', label: 'Standard' },
          ].map(({ color, label, dot, star }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 13, height: 13,
                borderRadius: dot ? '50%' : '50% 50% 50% 50% / 60% 60% 40% 40%',
                background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, color: '#fff', fontWeight: 700, flexShrink: 0,
              }}>
                {star ? '★' : ''}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mini-card strip ── */}
      {ordered.length > 0 && (
        <div
          ref={stripRef}
          style={{
            display: 'flex', gap: 8,
            overflowX: 'auto', overflowY: 'hidden',
            padding: '10px 12px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc', flexShrink: 0,
            scrollbarWidth: 'thin',
          }}
        >
          {ordered.map((c, idx) => {
            const id        = c.EscreenSiteId
            const isNearest = idx === 0
            const isActive  = id === activeId
            const isHovered = id === hoveredId
            const color     = clinicColor(c, isNearest)
            const badges    = getBadges(c, isNearest)
            const address   = [c.Address1, c.City, c.State].filter(Boolean).join(', ')
            return (
              <div
                key={id}
                ref={el => { cardRefs.current[id] = el }}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  setActiveId(prev => prev === id ? null : id)
                  if (mapRef.current && Number.isFinite(Number(c.Latitude))) {
                    mapRef.current.panTo({ lat: Number(c.Latitude), lng: Number(c.Longitude) })
                    mapRef.current.setZoom(15)
                  }
                }}
                style={{
                  flexShrink: 0, width: 185,
                  background: '#fff', borderRadius: 10,
                  border: `2px solid ${isActive ? '#0f172a' : isHovered ? color : '#e2e8f0'}`,
                  padding: '9px 11px 10px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: (isHovered || isActive) ? `0 3px 12px ${color}40` : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '10px 10px 0 0' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 3 }}>
                  <span style={{
                    background: color, color: '#fff',
                    borderRadius: '50%', width: 20, height: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>
                    {isNearest ? '★' : idx + 1}
                  </span>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, flex: 1,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {c.SiteName}
                  </div>
                </div>
                <div style={{
                  fontSize: 10.5, color: '#64748b', marginTop: 5, lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  📍 {address}
                </div>
                {c.Distance != null && (
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{c.Distance} mi away</div>
                )}
                {badges.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
                    {badges.map(b => <Chip key={b.label} label={b.label} color={b.color} bg={b.bg} />)}
                  </div>
                )}
                {onBook && (
                  <button
                    onClick={e => { e.stopPropagation(); onBook(c) }}
                    style={{
                      marginTop: 8, width: '100%', padding: '5px 0',
                      background: 'linear-gradient(135deg,#c8102e,#8b0000)',
                      color: '#fff', border: 'none', borderRadius: 5,
                      fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                      opacity: (isHovered || isActive) ? 1 : 0,
                      pointerEvents: (isHovered || isActive) ? 'auto' : 'none',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    Select →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Chip({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600, color,
      background: bg, borderRadius: 4,
      padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
