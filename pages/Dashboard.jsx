import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const API_URL = 'http://127.0.0.1:8000/api'
const BUSINESS_KEY = 'profitTrackBusiness'

function readSavedValue(key) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function getBusinessId(business) {
  if (typeof business === 'string' || typeof business === 'number') {
    return business
  }

  return business?.id ?? business?.businessId ?? business?.business_id ?? ''
}

function getErrorMessage(data) {
  if (typeof data === 'string') return data

  if (data && typeof data === 'object') {
    return Object.entries(data)
      .flatMap(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(' ')
          : String(value)

        return [`${field === 'detail' ? '' : `${field}: `}${message}`]
      })
      .join(' ')
  }

  return 'Something went wrong. Please try again.'
}

async function fetchRecords(endpoint, businessId) {
  const query = `?businessId=${encodeURIComponent(businessId)}`
  const response = await fetch(`${API_URL}/${endpoint}/${query}`)

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data))
  }

  if (!Array.isArray(data)) {
    throw new Error(`The ${endpoint} endpoint returned unexpected data.`)
  }

  return data
}

function getNumber(record, fields) {
  for (const field of fields) {
    const value = record?.[field]

    if (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      Number.isFinite(Number(value))
    ) {
      return Number(value)
    }
  }

  return 0
}

function getSaleAmount(sale) {
  return getNumber(sale, ['total_amount', 'totalAmount', 'amount', 'total'])
}

function getExpenseAmount(expense) {
  return getNumber(expense, ['amount', 'expenseAmount', 'total'])
}

function getDateValue(record) {
  return (
    record?.date ??
    record?.created_at ??
    record?.createdAt ??
    record?.timestamp ??
    null
  )
}

function getTimeValue(record) {
  const value = getDateValue(record)
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function formatCurrency(value, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0)
  } catch {
    return `₦${(Number(value) || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function Dashboard() {
  const navigate = useNavigate()

  const [business, setBusiness] = useState(
    () => readSavedValue(BUSINESS_KEY) || {},
  )
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const businessId = getBusinessId(business)
  const currency = business?.currency || 'NGN'
  const businessName =
    (typeof business?.businessName === 'string'
      ? business.businessName.trim()
      : '') || 'Your Business'

  useEffect(() => {
    let cancelled = false

    async function loadDashboardData() {
      const savedBusiness = readSavedValue(BUSINESS_KEY) || {}
      const savedBusinessId = getBusinessId(savedBusiness)

      if (!cancelled) {
        setBusiness(savedBusiness)
      }

      if (!savedBusinessId) {
        if (!cancelled) {
          setSales([])
          setExpenses([])
          setProducts([])
          setPageError(
            'No business is selected. Please select your business first.',
          )
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLoading(true)
        setPageError('')
      }

      try {
        const [salesData, expensesData, productsData] = await Promise.all([
          fetchRecords('sales', savedBusinessId),
          fetchRecords('expenses', savedBusinessId),
          fetchRecords('products', savedBusinessId),
        ])

        if (cancelled) return

        setSales(salesData)
        setExpenses(expensesData)
        setProducts(productsData)
      } catch (error) {
        if (cancelled) return

        setPageError(
          error.message ||
            'Could not load dashboard data. Check that the Django server is running.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboardData()

    function refreshDashboard() {
      loadDashboardData()
    }

    window.addEventListener('focus', refreshDashboard)
    window.addEventListener('storage', refreshDashboard)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshDashboard)
      window.removeEventListener('storage', refreshDashboard)
    }
  }, [businessId, reloadKey])

  const totalSales = useMemo(
    () => sales.reduce((total, sale) => total + getSaleAmount(sale), 0),
    [sales],
  )

  const totalExpenses = useMemo(
    () =>
      expenses.reduce((total, expense) => total + getExpenseAmount(expense), 0),
    [expenses],
  )

  const netProfit = totalSales - totalExpenses

  const totalStock = products.reduce(
    (total, product) =>
      total + getNumber(product, ['quantity', 'stock', 'stockQuantity']),
    0,
  )

  const lowStockProducts = products.filter((product) => {
    const quantity = getNumber(product, ['quantity', 'stock', 'stockQuantity'])
    const threshold = getNumber(product, [
      'lowStockLevel',
      'low_stock_level',
      'lowStockThreshold',
      'reorderLevel',
    ])

    return quantity <= (threshold > 0 ? threshold : 5)
  })

  const recentTransactions = [
    ...sales.map((sale) => ({
      ...sale,
      type: 'sale',
      dashboardAmount: getSaleAmount(sale),
      dashboardDate: getDateValue(sale),
      dashboardLabel:
        sale.product_name ||
        sale.productName ||
        sale.sale_id ||
        sale.saleId ||
        'Product sale',
    })),
    ...expenses.map((expense) => ({
      ...expense,
      type: 'expense',
      dashboardAmount: getExpenseAmount(expense),
      dashboardDate: getDateValue(expense),
      dashboardLabel:
        expense.description || expense.category || 'Business expense',
    })),
  ]
    .sort((a, b) => getTimeValue(b) - getTimeValue(a))
    .slice(0, 5)

  const recentSales = [...sales]
    .sort((a, b) => getTimeValue(a) - getTimeValue(b))
    .slice(-7)

  const maxSale = Math.max(...recentSales.map(getSaleAmount), 1)

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-heading-copy">
          <p className="dashboard-eyebrow">BUSINESS OVERVIEW</p>
          <h1>{businessName}</h1>
          <p className="dashboard-subtitle">
            Here's an overview of your business performance.
          </p>
        </div>

        <div className="dashboard-date">
          <span className="dashboard-date-dot" />
          <span>
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </header>

      {pageError && (
        <div className="dashboard-empty-state" role="alert">
          <p>{pageError}</p>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      )}

      <section className="dashboard-summary" aria-label="Business summary">
        <article className="summary-card">
          <div className="summary-card-top">
            <span>Total Sales</span>
            <span className="summary-icon sales-icon" aria-hidden="true">
              ↗
            </span>
          </div>
          <h2>{loading ? '...' : formatCurrency(totalSales, currency)}</h2>
          <p>
            {loading
              ? 'Loading sales...'
              : `${sales.length} recorded sale${sales.length === 1 ? '' : 's'}`}
          </p>
        </article>

        <article className="summary-card">
          <div className="summary-card-top">
            <span>Total Expenses</span>
            <span className="summary-icon expenses-icon" aria-hidden="true">
              ↘
            </span>
          </div>
          <h2>{loading ? '...' : formatCurrency(totalExpenses, currency)}</h2>
          <p>
            {loading
              ? 'Loading expenses...'
              : `${expenses.length} recorded expense${expenses.length === 1 ? '' : 's'}`}
          </p>
        </article>

        <article className="summary-card">
          <div className="summary-card-top">
            <span>Net Profit</span>
            <span className="summary-icon profit-icon" aria-hidden="true">
              ₦
            </span>
          </div>
          <h2 className={!loading && netProfit < 0 ? 'negative-value' : ''}>
            {loading ? '...' : formatCurrency(netProfit, currency)}
          </h2>
          <p>Sales minus recorded expenses</p>
        </article>

        <article className="summary-card">
          <div className="summary-card-top">
            <span>Units in Stock</span>
            <span className="summary-icon stock-icon" aria-hidden="true">
              □
            </span>
          </div>
          <h2>{loading ? '...' : totalStock.toLocaleString('en-NG')}</h2>
          <p>
            {loading
              ? 'Loading inventory...'
              : `${products.length} product${products.length === 1 ? '' : 's'} tracked`}
          </p>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel sales-panel">
          <div className="panel-heading">
            <div>
              <h2>Sales Activity</h2>
              <p>Your latest recorded sales</p>
            </div>

            <button
              className="panel-link"
              type="button"
              onClick={() => navigate('/sales')}
            >
              View sales <span aria-hidden="true">→</span>
            </button>
          </div>

          {loading ? (
            <div className="dashboard-empty-state">
              <p>Loading sales activity...</p>
            </div>
          ) : recentSales.length > 0 ? (
            <div className="sales-activity">
              <div className="sales-chart">
                {recentSales.map((sale, index) => (
                  <div
                    className="sales-chart-column"
                    key={sale.id ?? sale.sale_id ?? `${getTimeValue(sale)}-${index}`}
                  >
                    <div className="sales-bar-track">
                      <div
                        className="sales-bar"
                        style={{
                          height: `${Math.max(
                            (getSaleAmount(sale) / maxSale) * 100,
                            5,
                          )}%`,
                        }}
                        title={formatCurrency(getSaleAmount(sale), currency)}
                      />
                    </div>

                    <span className="sales-bar-label">
                      {formatDate(getDateValue(sale))
                        .split(' ')
                        .slice(0, 2)
                        .join(' ')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="sales-chart-caption">
                <span className="chart-legend-dot" />
                <span>Recent sales</span>
                <strong>{formatCurrency(totalSales, currency)} total</strong>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                ↗
              </div>
              <h3>No sales recorded yet</h3>
              <p>Once sales are saved, your activity will appear here.</p>

              <button
                className="secondary-action"
                type="button"
                onClick={() => navigate('/sales')}
              >
                Open Sales page
              </button>
            </div>
          )}
        </article>

        <article className="dashboard-panel transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Transactions</h2>
              <p>Your latest business activity</p>
            </div>

            <button
              className="panel-link"
              type="button"
              onClick={() => navigate('/transactions')}
            >
              View all <span aria-hidden="true">→</span>
            </button>
          </div>

          {loading ? (
            <div className="dashboard-empty-state compact-empty">
              <p>Loading transactions...</p>
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="transaction-list">
              {recentTransactions.map((transaction, index) => {
                const expense = transaction.type === 'expense'

                return (
                  <div
                    className="transaction-row"
                    key={
                      transaction.id ??
                      `${transaction.type}-${transaction.dashboardLabel}-${index}`
                    }
                  >
                    <div
                      className={`transaction-symbol ${
                        expense ? 'transaction-symbol-expense' : ''
                      }`}
                    >
                      {expense ? '↘' : '↗'}
                    </div>

                    <div className="transaction-details">
                      <strong>{transaction.dashboardLabel}</strong>
                      <span>{formatDate(transaction.dashboardDate)}</span>
                    </div>

                    <strong
                      className={`transaction-amount ${
                        expense ? 'negative-value' : ''
                      }`}
                    >
                      {expense ? '−' : '+'}
                      {formatCurrency(transaction.dashboardAmount, currency)}
                    </strong>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="dashboard-empty-state compact-empty">
              <div className="empty-state-icon" aria-hidden="true">
                ↔
              </div>
              <h3>No transactions yet</h3>
              <p>Saved sales and expenses will show up here.</p>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-panel inventory-panel">
        <div className="panel-heading">
          <div>
            <h2>Inventory Alerts</h2>
            <p>Products that may need restocking</p>
          </div>

          <button
            className="panel-link"
            type="button"
            onClick={() => navigate('/inventory')}
          >
            View inventory <span aria-hidden="true">→</span>
          </button>
        </div>

        {loading ? (
          <div className="inventory-all-good">
            <div>
              <h3>Loading inventory...</h3>
            </div>
          </div>
        ) : lowStockProducts.length > 0 ? (
          <div className="inventory-alert-list">
            {lowStockProducts.slice(0, 5).map((product, index) => {
              const quantity = getNumber(product, [
                'quantity',
                'stock',
                'stockQuantity',
              ])

              const name =
                product.name || product.productName || 'Unnamed product'

              return (
                <div
                  className="inventory-alert-row"
                  key={product.id ?? `${name}-${index}`}
                >
                  <div className="inventory-alert-mark" aria-hidden="true">
                    !
                  </div>

                  <div className="inventory-alert-details">
                    <strong>{name}</strong>
                    <span>Stock is running low</span>
                  </div>

                  <span className="stock-quantity">{quantity} left</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="inventory-all-good">
            <span className="inventory-good-icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <h3>
                {products.length
                  ? 'No low-stock alerts'
                  : 'No inventory data yet'}
              </h3>

              <p>
                {products.length
                  ? 'Your recorded products are above the low-stock threshold.'
                  : 'Add products to your inventory to monitor stock levels here.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default Dashboard