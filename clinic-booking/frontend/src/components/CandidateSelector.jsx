import { useEffect, useState } from 'react'

export default function CandidateSelector({ onSelect }) {
  const [donors, setDonors] = useState([])

  useEffect(() => {
    fetch('/api/donors')
      .then(r => r.json())
      .then(setDonors)
  }, [])

  return (
    <div style={{ padding: '16px' }}>
      <label style={{ fontWeight: 'bold' }}>Select Donor: </label>
      <select onChange={e => onSelect(Number(e.target.value))}>
        <option value="">-- choose --</option>
        {donors.map(d => (
          <option key={d.id} value={d.id}>
            {d.first_name} {d.last_name}
          </option>
        ))}
      </select>
    </div>
  )
}
