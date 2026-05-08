import { useState } from 'react'
import CandidateSelector from './components/CandidateSelector'
import Chat from './components/Chat'

export default function App() {
  const [donorId, setDonorId] = useState(null)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ padding: 16 }}>Clinic Booking Assistant</h1>
      <CandidateSelector onSelect={setDonorId} />
      <Chat donorId={donorId} />
    </div>
  )
}
