import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AddMemberModal } from '../components/AddMemberModal'
import { AddExpenseModal } from '../components/AddExpenseModal'
import { SettlementView } from '../components/SettlementView'
import { ExpenseActivityView } from '../components/ExpenseActivityView'

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

export function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const [tripName, setTripName] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlement'>('expenses')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  useEffect(() => {
    loadTripData()
  }, [tripId])

  const loadTripData = async () => {
    if (!tripId) return

    try {
      const [tripRes, membersRes, expensesRes, splitsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
        supabase.from('members').select('*').eq('trip_id', tripId).order('created_at'),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('date', { ascending: false }),
        supabase.from('expense_splits').select('*'),
      ])

      if (tripRes.error) throw tripRes.error
      if (membersRes.error) throw membersRes.error
      if (expensesRes.error) throw expensesRes.error
      if (splitsRes.error) throw splitsRes.error

      if (!tripRes.data) {
        navigate('/trips')
        return
      }

      setTripName(tripRes.data.name)
      setMembers(membersRes.data || [])
      setExpenses(expensesRes.data || [])
      setSplits(splitsRes.data || [])
    } catch (err) {
      console.error('Error loading trip data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMemberAdded = (member: Member) => {
    setMembers([...members, member])
  }

  const handleExpenseAdded = (expense: Expense, newSplits: ExpenseSplit[]) => {
    setExpenses([expense, ...expenses])
    setSplits([...splits, ...newSplits])
  }

  const handleExpenseUpdated = (expense: Expense, newSplits: ExpenseSplit[]) => {
    setExpenses(expenses.map(e => e.id === expense.id ? expense : e))
    setSplits([
      ...splits.filter(s => s.expense_id !== expense.id),
      ...newSplits
    ])
  }

  const deleteMember = async (memberId: string) => {
    if (!confirm('Are you sure? This will delete all expenses paid by or split with this member.')) {
      return
    }

    try {
      const { error } = await supabase.from('members').delete().eq('id', memberId)
      if (error) throw error
      setMembers(members.filter(m => m.id !== memberId))
      setExpenses(expenses.filter(e => e.paid_by_member_id !== memberId))
      setSplits(splits.filter(s => s.member_id !== memberId))
    } catch (err) {
      alert('Failed to delete member')
      console.error('Error deleting member:', err)
    }
  }

  const deleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
      if (error) throw error
      setExpenses(expenses.filter(e => e.id !== expenseId))
      setSplits(splits.filter(s => s.expense_id !== expenseId))
    } catch (err) {
      alert('Failed to delete expense')
      console.error('Error deleting expense:', err)
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setShowAddExpense(true)
  }

  const handleCloseExpenseModal = () => {
    setShowAddExpense(false)
    setEditingExpense(null)
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
          <h1>{tripName}</h1>
          <button className="secondary" onClick={() => navigate('/trips')}>
            Back to Trips
          </button>
        </div>
      </div>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Members</h3>
            <button className="small" onClick={() => setShowAddMember(true)}>
              Add Member
            </button>
          </div>
          {members.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No members yet. Add members to start tracking expenses.</p>
          ) : (
            <ul className="member-list">
              {members.map((member) => (
                <li key={member.id} className="member-item">
                  <span>{member.name}</span>
                  <button
                    className="danger small"
                    onClick={() => deleteMember(member.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'expenses' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('expenses')}
          >
            Expenses
          </button>
          <button
            className={`tab-button ${activeTab === 'settlement' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('settlement')}
          >
            Settlement
          </button>
        </div>

        {activeTab === 'expenses' ? (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setShowAddExpense(true)}
                disabled={members.length === 0}
                style={{ flex: 1 }}
              >
                Add Expense
              </button>
            </div>
            {expenses.length === 0 && members.length === 0 ? (
              <div className="empty-state">
                <p>Add members first, then add expenses to get started.</p>
              </div>
            ) : (
              <ExpenseActivityView
                expenses={expenses}
                members={members}
                splits={splits}
                onEditExpense={handleEditExpense}
                onDeleteExpense={deleteExpense}
              />
            )}
          </>
        ) : (
          <SettlementView members={members} expenses={expenses} splits={splits} />
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          tripId={tripId!}
          onClose={() => setShowAddMember(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}

      {showAddExpense && (
        <AddExpenseModal
          tripId={tripId!}
          members={members}
          expense={editingExpense}
          splits={splits.filter(s => editingExpense && s.expense_id === editingExpense.id)}
          onClose={handleCloseExpenseModal}
          onExpenseAdded={handleExpenseAdded}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </>
  )
}
