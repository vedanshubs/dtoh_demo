const STEPS = [
  { id: 1, label: 'Candidate Selected', short: 'Candidate' },
  { id: 2, label: 'Test Type Chosen',   short: 'Test Type' },
  { id: 3, label: 'Clinic Selected',    short: 'Clinic'    },
  { id: 4, label: 'Booking Confirmed',  short: 'Confirmed' },
]

export default function ProgressStepper({ activeStep }) {
  // activeStep: 1–4 (1 = candidate selected, 4 = confirmed)
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '10px 16px', background: '#fff',
      borderBottom: '1px solid #f1f5f9',
      gap: 0, flexShrink: 0,
    }}>
      {STEPS.map((step, i) => {
        const done    = step.id < activeStep
        const current = step.id === activeStep
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {/* Step node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 12 : 11, fontWeight: 700,
                background: done ? '#22c55e' : current ? '#c8102e' : '#e2e8f0',
                color: (done || current) ? '#fff' : '#94a3b8',
                boxShadow: current ? '0 0 0 3px rgba(200,16,46,0.18)' : 'none',
                transition: 'all 0.3s',
                flexShrink: 0,
              }}>
                {done ? '✓' : step.id}
              </div>
              <span style={{
                fontSize: 10, fontWeight: current ? 700 : 500,
                color: done ? '#15803d' : current ? '#c8102e' : '#94a3b8',
                whiteSpace: 'nowrap', letterSpacing: '0.02em',
                transition: 'color 0.3s',
              }}>{step.short}</span>
            </div>

            {/* Connector line (not after last step) */}
            {i < STEPS.length - 1 && (
              <div style={{
                height: 2, flex: 1, marginBottom: 18,
                background: done ? '#22c55e' : '#e2e8f0',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
