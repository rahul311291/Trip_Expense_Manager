import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Member {
  id: string
  trip_id: string
  name: string
  created_at: string
}

interface AddMemberModalProps {
  tripId: string
  onClose: () => void
  onMemberAdded: (member: Member) => void
}

export function AddMemberModal({ tripId, onClose, onMemberAdded }: AddMemberModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('members')
        .insert([{ trip_id: tripId, name }])
        .select()
        .single()

      if (error) throw error

      onMemberAdded(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Member</h3>
          <button className="secondary small" onClick={onClose}>
            Close
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="memberName">Member Name</label>
            <input
              id="memberName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
