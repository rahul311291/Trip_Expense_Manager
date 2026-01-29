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

interface SettlementViewProps {
  members: Member[]
  expenses: Expense[]
  splits: ExpenseSplit[]
}

interface Balance {
  memberId: string
  memberName: string
  balance: number
}

interface Settlement {
  from: string
  to: string
  amount: number
}

export function SettlementView({ members, expenses, splits }: SettlementViewProps) {
  const calculateBalances = () => {
    const balancesByCurrency: Record<string, Record<string, number>> = {}

    expenses.forEach((expense) => {
      const currency = expense.currency
      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = {}
        members.forEach((member) => {
          balancesByCurrency[currency][member.id] = 0
        })
      }

      const paidAmount = parseFloat(expense.amount)
      balancesByCurrency[currency][expense.paid_by_member_id] += paidAmount

      const expenseSplits = splits.filter((s) => s.expense_id === expense.id)
      expenseSplits.forEach((split) => {
        const shareAmount = parseFloat(split.share_amount)
        balancesByCurrency[currency][split.member_id] -= shareAmount
      })
    })

    return balancesByCurrency
  }

  const calculateSettlements = (
    balances: Record<string, number>
  ): Settlement[] => {
    const settlements: Settlement[] = []
    const memberBalances: Balance[] = Object.entries(balances).map(
      ([memberId, balance]) => ({
        memberId,
        memberName: members.find((m) => m.id === memberId)?.name || 'Unknown',
        balance,
      })
    )

    const debtors = memberBalances
      .filter((b) => b.balance < -0.01)
      .sort((a, b) => a.balance - b.balance)
    const creditors = memberBalances
      .filter((b) => b.balance > 0.01)
      .sort((a, b) => b.balance - a.balance)

    let i = 0
    let j = 0

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]
      const debt = Math.abs(debtor.balance)
      const credit = creditor.balance

      const settlementAmount = Math.min(debt, credit)

      if (settlementAmount > 0.01) {
        settlements.push({
          from: debtor.memberName,
          to: creditor.memberName,
          amount: settlementAmount,
        })
      }

      debtor.balance += settlementAmount
      creditor.balance -= settlementAmount

      if (Math.abs(debtor.balance) < 0.01) i++
      if (Math.abs(creditor.balance) < 0.01) j++
    }

    return settlements
  }

  const balancesByCurrency = calculateBalances()

  if (expenses.length === 0) {
    return (
      <div className="card">
        <p style={{ color: '#6b7280' }}>No expenses to settle yet.</p>
      </div>
    )
  }

  return (
    <div>
      {Object.entries(balancesByCurrency).map(([currency, balances]) => {
        const settlements = calculateSettlements(balances)
        const memberBalances: Balance[] = Object.entries(balances).map(
          ([memberId, balance]) => ({
            memberId,
            memberName: members.find((m) => m.id === memberId)?.name || 'Unknown',
            balance,
          })
        )

        return (
          <div key={currency} className="card" style={{ marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              {currency}
            </h3>

            <div className="balance-summary">
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
                Member Balances
              </h4>
              {memberBalances.map((balance) => (
                <div key={balance.memberId} className="balance-item">
                  <span>{balance.memberName}</span>
                  <span
                    className={
                      balance.balance > 0.01
                        ? 'balance-positive'
                        : balance.balance < -0.01
                        ? 'balance-negative'
                        : ''
                    }
                  >
                    {balance.balance > 0.01
                      ? `+${balance.balance.toFixed(2)}`
                      : balance.balance < -0.01
                      ? balance.balance.toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              ))}
            </div>

            <h4
              style={{
                marginTop: '1.5rem',
                marginBottom: '0.5rem',
                fontSize: '1rem',
              }}
            >
              Settlements
            </h4>
            {settlements.length === 0 ? (
              <p style={{ color: '#6b7280' }}>All settled up!</p>
            ) : (
              <ul className="settlement-list">
                {settlements.map((settlement, index) => (
                  <li key={index} className="settlement-item">
                    <strong>{settlement.from}</strong> owes{' '}
                    <strong>{settlement.to}</strong>{' '}
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      {currency} {settlement.amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <div className="card" style={{ background: '#f0f9ff', border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
          <strong>Note:</strong> The settlement suggestions above show the minimum number of transactions needed to settle all debts.
        </p>
      </div>
    </div>
  )
}
