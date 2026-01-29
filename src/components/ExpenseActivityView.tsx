interface Member {
  id: string
  name: string
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
  expense_id: string
  member_id: string
  share_amount: string
}

interface ExpenseActivityViewProps {
  expenses: Expense[]
  members: Member[]
  splits: ExpenseSplit[]
  currentUserId?: string
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expenseId: string) => void
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, { emoji: string; bgClass: string }> = {
    Food: { emoji: '🍽️', bgClass: 'food' },
    Hotel: { emoji: '🏨', bgClass: 'hotel' },
    Transport: { emoji: '✈️', bgClass: 'transport' },
    Activity: { emoji: '🎯', bgClass: 'activity' },
    Other: { emoji: '🧾', bgClass: 'receipt' },
  }
  return icons[category] || icons.Other
}

const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    VND: '₫',
    AUD: '$',
  }
  return symbols[currency] || currency + ' '
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export function ExpenseActivityView({
  expenses,
  members,
  splits,
  onEditExpense,
  onDeleteExpense,
}: ExpenseActivityViewProps) {
  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <p>No expenses yet. Add an expense to get started!</p>
      </div>
    )
  }

  return (
    <div className="activity-feed">
      {expenses.map((expense) => {
        const paidBy = members.find((m) => m.id === expense.paid_by_member_id)
        const expenseSplits = splits.filter((s) => s.expense_id === expense.id)
        const categoryInfo = getCategoryIcon(expense.category)
        const currencySymbol = getCurrencySymbol(expense.currency)
        const amount = parseFloat(expense.amount)

        const splitWith = expenseSplits
          .map((s) => members.find((m) => m.id === s.member_id)?.name)
          .filter(Boolean)

        const splitAmount = expenseSplits.length > 0
          ? amount / expenseSplits.length
          : 0

        return (
          <div key={expense.id} className="activity-item">
            <div className={`activity-icon ${categoryInfo.bgClass}`}>
              {categoryInfo.emoji}
              <div className="activity-badge"></div>
            </div>
            <div className="activity-content">
              <div className="activity-title">
                You added "{expense.name}"
              </div>
              <div className="activity-subtitle">
                Paid by {paidBy?.name || 'Unknown'} • Split with {splitWith.join(', ')}
              </div>
              <div className="activity-balance owed">
                {currencySymbol}{amount.toFixed(2)} • You get back {currencySymbol}
                {splitAmount.toFixed(2)}
              </div>
              <div className="activity-date">{formatDate(expense.date)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexDirection: 'column' }}>
              <button
                className="secondary small"
                onClick={() => onEditExpense(expense)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Edit
              </button>
              <button
                className="danger small"
                onClick={() => onDeleteExpense(expense.id)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
