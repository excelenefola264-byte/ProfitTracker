
import { useEffect, useMemo, useState } from 'react'
import './Transactions.css'

const API_URL = 'http://127.0.0.1:8000/api'
const BUSINESS_KEY = 'profitTrackBusiness'

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function getBusinessId() {
  const business = readStorage(BUSINESS_KEY, null)

  if (typeof business === 'string' || typeof business === 'number') {
    return business
  }

  return business?.id ?? business?.businessId ?? business?.business_id ?? ''
}

function formatCurrency(amount, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)
  } catch {
    return `₦${(Number(amount) || 0).toFixed(2)}`
  }
}

function getAmount(record) {
  return Number(
    record.total_amount ??
    record.totalAmount ??
    record.amount ??
    record.total ??
    record.expenseAmount ??
    0
  ) || 0
}

function getDate(record) {
  return record.date || record.created_at || record.createdAt || record.timestamp || ''
}

async function readResponse(response) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? Object.entries(data)
          .map(([key, value]) => {
            const detail = Array.isArray(value) ? value.join(', ') : value
            return `${key}: ${detail}`
          })
          .join(' ')
      : ''

    throw new Error(message || `Request failed (${response.status}).`)
  }

  return data
}

function mapSale(sale) {
  return {
    id: sale.id,
    reference: sale.sale_id || sale.saleId || `SALE-${sale.id}`,
    date: getDate(sale),
    description: sale.product_name || sale.productName || 'Product sale',
    category: 'Sales',
    type: 'Money In',
    amount: getAmount(sale),
    paymentMethod: sale.payment_method || sale.paymentMethod || '—',
  }
}

function mapExpense(expense) {
  return {
    id: expense.id,
    reference: `EXP-${expense.id}`,
    date: getDate(expense),
    description: expense.description || 'Business expense',
    category: expense.category || 'Other',
    type: 'Money Out',
    amount: getAmount(expense),
    paymentMethod: expense.payment_method || expense.paymentMethod || '—',
  }
}

function Transactions() {
  const [businessId, setBusinessId] = useState(getBusinessId)
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [currency] = useState(() => {
    const business = readStorage(BUSINESS_KEY, {})
    return business?.currency || 'NGN'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expenseName, setExpenseName] = useState('')
  const [category, setCategory] = useState('Supplies')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTransactions() {
      setLoading(true)
      setLoadError('')

      if (!businessId) {
        setSales([])
        setExpenses([])
        setLoadError('No selected business was found. Please check your business settings.')
        setLoading(false)
        return
      }

      try {
        const query = `?businessId=${encodeURIComponent(businessId)}`

        const [salesResponse, expensesResponse] = await Promise.all([
          fetch(`${API_URL}/sales/${query}`),
          fetch(`${API_URL}/expenses/${query}`),
        ])

        const [salesData, expensesData] = await Promise.all([
          readResponse(salesResponse),
          readResponse(expensesResponse),
        ])

        if (cancelled) return

        setSales(Array.isArray(salesData) ? salesData : salesData.results || [])
        setExpenses(
          Array.isArray(expensesData)
            ? expensesData
            : expensesData.results || [],
        )
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.message || 'Could not load transactions. Check your connection.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTransactions()

    return () => {
      cancelled = true
    }
  }, [businessId])

  const transactions = useMemo(() => {
    return [
      ...sales.map(mapSale),
      ...expenses.map(mapExpense),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [sales, expenses])

  const moneyIn = useMemo(
    () => sales.reduce((sum, sale) => sum + getAmount(sale), 0),
    [sales],
  )

  const moneyOut = useMemo(
    () => expenses.reduce((sum, expense) => sum + getAmount(expense), 0),
    [expenses],
  )

  const netMovement = moneyIn - moneyOut

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return transactions

    return transactions.filter((transaction) =>
      [
        transaction.reference,
        transaction.description,
        transaction.category,
        transaction.type,
        transaction.paymentMethod,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [transactions, search])

  function openExpenseForm() {
    setExpenseName('')
    setCategory('Supplies')
    setAmount('')
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setPaymentMethod('Cash')
    setNotes('')
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  async function handleAddExpense(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const parsedAmount = Number(amount)

    if (!businessId) {
      setError('Please select a business first.')
      return
    }

    if (!expenseName.trim()) {
      setError('Enter a description for this expense.')
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }

    if (!expenseDate) {
      setError('Choose a date for this expense.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/expenses/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business: businessId,
          description: expenseName.trim(),
          category,
          amount: parsedAmount.toFixed(2),
          date: expenseDate,
        }),
      })

      const savedExpense = await readResponse(response)

      setExpenses((current) => [
        savedExpense,
        ...current.filter((expense) => expense.id !== savedExpense.id),
      ])

      setShowForm(false)
      setSuccess(`Expense saved: ${formatCurrency(savedExpense.amount, currency)}`)
    } catch (err) {
      setError(
        err.message || 'Could not save this expense. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="transactions-page">
      <header className="transactions-header">
        <div>
          <p className="transactions-eyebrow">FINANCIAL MANAGEMENT</p>
          <h1>Transactions</h1>
          <p className="transactions-subtitle">
            Keep track of the money moving through your business.
          </p>
        </div>

        <button
          className="transactions-button"
          type="button"
          onClick={openExpenseForm}
        >
          <span aria-hidden="true">＋</span> Add Expense
        </button>
      </header>

      {success && (
        <div className="transactions-message" role="status">
          {success}
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {loadError && (
        <div className="transactions-form-error" role="alert">
          {loadError}
          <button
            type="button"
            onClick={() => setBusinessId(getBusinessId())}
          >
            Retry
          </button>
        </div>
      )}

      <section className="transactions-summary">
        <article className="transactions-summary-card">
          <div className="transactions-card-icon transactions-icon-green">↙</div>
          <p>Money In</p>
          <h2>{formatCurrency(moneyIn, currency)}</h2>
          <span>Revenue from recorded sales</span>
        </article>

        <article className="transactions-summary-card">
          <div className="transactions-card-icon transactions-icon-orange">↗</div>
          <p>Money Out</p>
          <h2>{formatCurrency(moneyOut, currency)}</h2>
          <span>Expenses recorded</span>
        </article>

        <article className="transactions-summary-card">
          <div className="transactions-card-icon transactions-icon-blue">⇄</div>
          <p>Net Cash Movement</p>
          <h2>{formatCurrency(netMovement, currency)}</h2>
          <span>Money in minus money out</span>
        </article>
      </section>

      {showForm && (
        <section className="transactions-panel transactions-form-panel">
          <div className="transactions-panel-heading">
            <div>
              <h2>Add an Expense</h2>
              <p>Record money spent by your business.</p>
            </div>

            <button
              className="transactions-close-button"
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close expense form"
            >
              ×
            </button>
          </div>

          <form className="transactions-form" onSubmit={handleAddExpense}>
            <label>
              Expense description
              <input
                type="text"
                value={expenseName}
                onChange={(event) => setExpenseName(event.target.value)}
                placeholder="e.g. Shop rent or packaging"
                maxLength={255}
                required
              />
            </label>

            <div className="transactions-form-grid">
              <label>
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="Supplies">Supplies</option>
                  <option value="Rent">Rent</option>
                  <option value="Transport">Transport</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  required
                />
              </label>

              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <label className="transactions-notes-label">
              Notes <span>(optional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any extra details..."
                rows="3"
                maxLength={500}
              />
            </label>

            {error && (
              <p className="transactions-form-error" role="alert">
                {error}
              </p>
            )}

            <div className="transactions-form-actions">
              <button
                className="transactions-button transactions-button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="transactions-button"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="transactions-panel">
        <div className="transactions-panel-heading">
          <div>
            <h2>All Transactions</h2>
            <p>Sales and expenses recorded in ProfitTrack.</p>
          </div>

          <input
            className="transactions-search"
            type="search"
            placeholder="Search transactions..."
            aria-label="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="transactions-empty">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="transactions-empty">
                    <div className="transactions-empty-icon">⇄</div>
                    <strong>
                      {search
                        ? 'No matching transactions'
                        : 'No transactions yet'}
                    </strong>
                    <p>
                      {search
                        ? 'Try searching for another description or category.'
                        : 'Record a sale or add an expense to see financial activity here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={`${transaction.type}-${transaction.id}`}>
                    <td className="transactions-reference">
                      {transaction.reference}
                    </td>
                    <td>
                      {transaction.date
                        ? new Date(
                            `${String(transaction.date).slice(0, 10)}T00:00:00`,
                          ).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td>
                      <strong>{transaction.description}</strong>
                      <span className="transactions-payment">
                        {transaction.paymentMethod}
                      </span>
                    </td>
                    <td>{transaction.category}</td>
                    <td>
                      <span
                        className={`transactions-type ${
                          transaction.type === 'Money In'
                            ? 'transactions-type-in'
                            : 'transactions-type-out'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td
                      className={
                        transaction.type === 'Money In'
                          ? 'transactions-amount-in'
                          : 'transactions-amount-out'
                      }
                    >
                      {transaction.type === 'Money Out' ? '−' : '+'}
                      {formatCurrency(transaction.amount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      
    </div>
  )
}

export default Transactions
