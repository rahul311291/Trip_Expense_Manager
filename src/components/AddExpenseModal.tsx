import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Member {
  id: string
  trip_id: string
  name: string
  created_at: string
}

interface Expense {
  id: string
  trip_id: string
  name: string
  amount: string
  currency: string
  paid_by_member_id: string
  date: string
  category: string
  created_at: string
}

interface ExpenseSplit {
  id: string
  expense_id: string
  member_id: string
  share_amount: string
}

interface AddExpenseModalProps {
  tripId: string
  members: Member[]
  expense?: Expense | null
  splits?: ExpenseSplit[]
  onClose: () => void
  onExpenseAdded: (expense: Expense, splits: ExpenseSplit[]) => void
  onExpenseUpdated: (expense: Expense, splits: ExpenseSplit[]) => void
}

type SplitType = 'equal' | 'custom'

export function AddExpenseModal({
  tripId,
  members,
  expense,
  splits: existingSplits = [],
  onClose,
  onExpenseAdded,
  onExpenseUpdated,
}: AddExpenseModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [paidBy, setPaidBy] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Other')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expense) {
      setName(expense.name)
      setAmount(expense.amount)
      setCurrency(expense.currency)
      setPaidBy(expense.paid_by_member_id)
      setDate(expense.date)
      setCategory(expense.category)

      const splitMemberIds = existingSplits.map(s => s.member_id)
      setSelectedMembers(new Set(splitMemberIds))

      const hasEqualSplit = existingSplits.length > 0 &&
        new Set(existingSplits.map(s => parseFloat(s.share_amount))).size === 1

      if (hasEqualSplit) {
        setSplitType('equal')
      } else {
        setSplitType('custom')
        const splits: Record<string, string> = {}
        existingSplits.forEach(s => {
          splits[s.member_id] = s.share_amount
        })
        setCustomSplits(splits)
      }
    } else if (members.length > 0 && !paidBy) {
      setPaidBy(members[0].id)
    }
  }, [expense, existingSplits, members])

  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
      const newCustomSplits = { ...customSplits }
      delete newCustomSplits[memberId]
      setCustomSplits(newCustomSplits)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleCustomSplitChange = (memberId: string, value: string) => {
    setCustomSplits({
      ...customSplits,
      [memberId]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (selectedMembers.size === 0) {
      setError('Please select at least one member to split with')
      return
    }

    const totalAmount = parseFloat(amount)
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    let splitAmounts: Record<string, number> = {}

    if (splitType === 'equal') {
      const splitAmount = totalAmount / selectedMembers.size
      selectedMembers.forEach((memberId) => {
        splitAmounts[memberId] = splitAmount
      })
    } else {
      let total = 0
      for (const memberId of selectedMembers) {
        const customAmount = parseFloat(customSplits[memberId] || '0')
        if (isNaN(customAmount) || customAmount < 0) {
          setError('Please enter valid amounts for all selected members')
          return
        }
        splitAmounts[memberId] = customAmount
        total += customAmount
      }
      if (Math.abs(total - totalAmount) > 0.01) {
        setError(`Split amounts must add up to ${currency} ${totalAmount.toFixed(2)}`)
        return
      }
    }

    setLoading(true)

    try {
      if (expense) {
        const { data: updatedExpense, error: expenseError } = await supabase
          .from('expenses')
          .update({
            name,
            amount: amount,
            currency,
            paid_by_member_id: paidBy,
            date,
            category,
            updated_at: new Date().toISOString(),
          })
          .eq('id', expense.id)
          .select()
          .single()

        if (expenseError) throw expenseError

        await supabase.from('expense_splits').delete().eq('expense_id', expense.id)

        const splitsToInsert = Array.from(selectedMembers).map((memberId) => ({
          expense_id: expense.id,
          member_id: memberId,
          share_amount: splitAmounts[memberId].toFixed(2),
        }))

        const { data: newSplits, error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsToInsert)
          .select()

        if (splitsError) throw splitsError

        onExpenseUpdated(updatedExpense, newSplits)
      } else {
        const { data: newExpense, error: expenseError } = await supabase
          .from('expenses')
          .insert([
            {
              trip_id: tripId,
              name,
              amount: amount,
              currency,
              paid_by_member_id: paidBy,
              date,
              category,
            },
          ])
          .select()
          .single()

        if (expenseError) throw expenseError

        const splitsToInsert = Array.from(selectedMembers).map((memberId) => ({
          expense_id: newExpense.id,
          member_id: memberId,
          share_amount: splitAmounts[memberId].toFixed(2),
        }))

        const { data: newSplits, error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsToInsert)
          .select()

        if (splitsError) throw splitsError

        onExpenseAdded(newExpense, newSplits)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{expense ? 'Edit Expense' : 'Add Expense'}</h3>
          <button className="secondary small" onClick={onClose}>
            Close
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="expenseName">Expense Name</label>
            <input
              id="expenseName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dinner at restaurant"
              required
            />
          </div>

          <div className="flex">
            <div className="form-group flex-1">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group" style={{ width: '100px' }}>
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="paidBy">Paid By</label>
            <select
              id="paidBy"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              required
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex">
            <div className="form-group flex-1">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Food">Food</option>
                <option value="Hotel">Hotel</option>
                <option value="Transport">Transport</option>
                <option value="Activity">Activity</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Split Type</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  checked={splitType === 'equal'}
                  onChange={() => setSplitType('equal')}
                />
                Equal Split
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  checked={splitType === 'custom'}
                  onChange={() => setSplitType('custom')}
                />
                Custom Split
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Split Between</label>
            <div className="checkbox-group">
              {members.map((member) => (
                <div key={member.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`member-${member.id}`}
                    checked={selectedMembers.has(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <label htmlFor={`member-${member.id}`} style={{ flex: 1, margin: 0 }}>
                    {member.name}
                  </label>
                  {splitType === 'custom' && selectedMembers.has(member.id) && (
                    <input
                      type="number"
                      step="0.01"
                      value={customSplits[member.id] || ''}
                      onChange={(e) => handleCustomSplitChange(member.id, e.target.value)}
                      placeholder="0.00"
                      style={{ width: '100px', marginLeft: '0.5rem' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
