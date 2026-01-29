import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Trip {
  id: string
  name: string
  created_at: string
}

export function Trips() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [tripName, setTripName] = useState('')
  const [error, setError] = useState('')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrips(data || [])
    } catch (err) {
      console.error('Error loading trips:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) return

    try {
      const { data, error } = await supabase
        .from('trips')
        .insert([{ name: tripName, created_by: user.id }])
        .select()
        .single()

      if (error) throw error

      setTrips([data, ...trips])
      setTripName('')
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="header">
        <div className="header-content">
          <h1>My Trips</h1>
          <button className="secondary" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
      <div className="container">
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setShowModal(true)}>Create New Trip</button>
        </div>

        {trips.length === 0 ? (
          <div className="empty-state">
            <p>No trips yet. Create your first trip to get started!</p>
          </div>
        ) : (
          <ul className="trip-list">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="trip-item"
                onClick={() => navigate(`/trips/${trip.id}`)}
              >
                <div>
                  <h3>{trip.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Created {new Date(trip.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ fontSize: '1.5rem' }}>→</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Trip</h3>
              <button
                className="secondary small"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
            {error && <div className="error">{error}</div>}
            <form onSubmit={createTrip}>
              <div className="form-group">
                <label htmlFor="tripName">Trip Name</label>
                <input
                  id="tripName"
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., Goa Trip 2024"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit">Create Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
