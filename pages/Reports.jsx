import { useEffect, useMemo, useState } from 'react'
import './Reports.css'

const API_URL = 'http://127.0.0.1:8000/api'
const BUSINESS_KEY = 'profitTrackBusiness'

function readBusiness() {
  try {
    return JSON.parse(localStorage.getItem(BUSINESS_KEY) || '{}')
  } catch {
    return {}
  }
}

function getBusinessId(business) {
  if (typeof business === 'string' || typeof business === 'number') {
    return business
  }

  return business?.id ?? business?.businessId ?? business?.business_id ?? ''
}

function getDate(record) {
  const value =
    record.date ||
    record.createdAt ||
    record.created_at ||
    record.saleDate ||
    record.transactionDate ||
    record.expenseDate ||
    record.timestamp

  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getAmount(record) {
  const value =
    record.total_amount ??
    record.totalAmount ??
    record.amount ??
    record.total ??
    record.revenue ??
    record.saleAmount ??
    record.expenseAmount ??
    record.grandTotal ??
    record.netAmount

  if (value !== undefined && value !== null && value !== '') {
    const amount = Number(value)
    if (Number.isFinite(amount)) return amount
  }

  const quantity = Number(record.quantity)
  const price = Number(
    record.sellingPrice ?? record.unit_price ?? record.unitPrice ?? record.price,
  )

  if (Number.isFinite(quantity) && Number.isFinite(price)) {
    return quantity * price
  }

  return 0
}

function getCategory(record) {
  return String(record.category || record.expenseCategory || 'Other')
}

function isInPeriod(date, period, now) {
  if (!date) return false

  if (period === 'week') {
    const start = new Date(now)
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)

    return date >= start && date <= now
  }

  if (period === 'year') {
    return date.getFullYear() === now.getFullYear()
  }

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function formatDate(date) {
  if (!date) return 'Date unavailable'

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function money(amount, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)
  } catch {
    return `₦${(Number(amount) || 0).toLocaleString()}`
  }
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

function getCollection(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function Reports() {
  const [period, setPeriod] = useState('month')
  const [business, setBusiness] = useState(readBusiness)
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const businessId = getBusinessId(business)
  const currency = business?.currency || 'NGN'
  const businessName = business?.businessName || business?.name || 'Your Business'

  useEffect(() => {
    let cancelled = false

    async function loadRecords() {
      setLoading(true)
      setLoadError('')

      const currentBusiness = readBusiness()
      const currentBusinessId = getBusinessId(currentBusiness)

      if (!currentBusinessId) {
        setBusiness(currentBusiness)
        setSales([])
        setExpenses([])
        setLoadError('No selected business was found. Please check your business settings.')
        setLoading(false)
        return
      }

      try {
        const query = `?businessId=${encodeURIComponent(currentBusinessId)}`

        const [salesResponse, expensesResponse] = await Promise.all([
          fetch(`${API_URL}/sales/${query}`),
          fetch(`${API_URL}/expenses/${query}`),
        ])

        const [salesData, expensesData] = await Promise.all([
          readResponse(salesResponse),
          readResponse(expensesResponse),
        ])

        if (cancelled) return

        setBusiness(currentBusiness)
        setSales(getCollection(salesData))
        setExpenses(getCollection(expensesData))
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.message || 'Could not load report data. Check your connection.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRecords()

    function refreshRecords() {
      loadRecords()
    }

    window.addEventListener('focus', refreshRecords)
    window.addEventListener('storage', refreshRecords)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshRecords)
      window.removeEventListener('storage', refreshRecords)
    }
  }, [businessId])

  const reportData = useMemo(() => {
    const now = new Date()

    const filteredSales = sales
      .map((record) => ({
        ...record,
        reportDate: getDate(record),
        reportAmount: getAmount(record),
      }))
      .filter((record) => isInPeriod(record.reportDate, period, now))

    const filteredExpenses = expenses
      .map((record) => ({
        ...record,
        reportDate: getDate(record),
        reportAmount: getAmount(record),
      }))
      .filter((record) => isInPeriod(record.reportDate, period, now))

    const revenue = filteredSales.reduce(
      (total, record) => total + record.reportAmount,
      0,
    )

    const totalExpenses = filteredExpenses.reduce(
      (total, record) => total + record.reportAmount,
      0,
    )

    const expenseGroups = {}

    filteredExpenses.forEach((record) => {
      const category = getCategory(record)
      expenseGroups[category] =
        (expenseGroups[category] || 0) + record.reportAmount
    })

    const expenseBreakdown = Object.entries(expenseGroups)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    const chartLabels = []
    const chartRevenue = []
    const chartExpenses = []

    if (period === 'year') {
      for (let month = 0; month < 12; month += 1) {
        chartLabels.push(
          new Date(now.getFullYear(), month, 1).toLocaleDateString('en-NG', {
            month: 'short',
          }),
        )

        chartRevenue.push(
          filteredSales
            .filter((item) => item.reportDate.getMonth() === month)
            .reduce((sum, item) => sum + item.reportAmount, 0),
        )

        chartExpenses.push(
          filteredExpenses
            .filter((item) => item.reportDate.getMonth() === month)
            .reduce((sum, item) => sum + item.reportAmount, 0),
        )
      }
    } else {
      const numberOfDays = period === 'week'
        ? 7
        : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      const startDay = period === 'week'
        ? (() => {
            const date = new Date(now)
            date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
            date.setHours(0, 0, 0, 0)
            return date
          })()
        : new Date(now.getFullYear(), now.getMonth(), 1)

      for (let index = 0; index < numberOfDays; index += 1) {
        const date = new Date(startDay)
        date.setDate(startDay.getDate() + index)

        if (date > now) break

        chartLabels.push(
          period === 'week'
            ? date.toLocaleDateString('en-NG', { weekday: 'short' })
            : String(date.getDate()),
        )

        chartRevenue.push(
          filteredSales
            .filter((item) => item.reportDate.toDateString() === date.toDateString())
            .reduce((sum, item) => sum + item.reportAmount, 0),
        )

        chartExpenses.push(
          filteredExpenses
            .filter((item) => item.reportDate.toDateString() === date.toDateString())
            .reduce((sum, item) => sum + item.reportAmount, 0),
        )
      }
    }

    const recentRecords = [
      ...filteredSales.map((record) => ({
        id: record.id,
        label: record.product_name || record.productName || record.description || record.name || 'Sale',
        type: 'Sale',
        amount: record.reportAmount,
        date: record.reportDate,
      })),
      ...filteredExpenses.map((record) => ({
        id: record.id,
        label: record.description || record.name || record.title || 'Expense',
        type: 'Expense',
        amount: record.reportAmount,
        date: record.reportDate,
      })),
    ]
      .sort((a, b) => b.date - a.date)
      .slice(0, 8)

    return {
      revenue,
      expenses: totalExpenses,
      profit: revenue - totalExpenses,
      salesCount: filteredSales.length,
      expenseCount: filteredExpenses.length,
      expenseBreakdown,
      chartLabels,
      chartRevenue,
      chartExpenses,
      recentRecords,
      hasRecords: filteredSales.length > 0 || filteredExpenses.length > 0,
    }
  }, [sales, expenses, period])

  const chartMaximum = Math.max(
    1,
    ...reportData.chartRevenue,
    ...reportData.chartExpenses,
  )

  function exportReport() {
    const rows = [
      ['Business', businessName],
      ['Report Period', period === 'week' ? 'This week' : period === 'year' ? 'This year' : 'This month'],
      [],
      ['Metric', 'Amount'],
      ['Total Revenue', reportData.revenue],
      ['Total Expenses', reportData.expenses],
      ['Net Profit', reportData.profit],
      ['Sales Records', reportData.salesCount],
      ['Expense Records', reportData.expenseCount],
      [],
      ['Expense Category', 'Amount'],
      ...reportData.expenseBreakdown.map((item) => [item.category, item.amount]),
      [],
      ['Date', 'Description', 'Type', 'Amount'],
      ...reportData.recentRecords.map((item) => [
        formatDate(item.date),
        item.label,
        item.type,
        item.amount,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? '')
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(','),
      )
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `profittrack-report-${period}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <p className="reports-eyebrow">BUSINESS INSIGHTS</p>
          <h1>Reports</h1>
          <p className="reports-subtitle">
            Understand your sales, expenses and business performance.
          </p>
        </div>

        <button className="reports-button" type="button" onClick={exportReport} disabled={loading || Boolean(loadError)}>
          ↓ Export Report
        </button>
      </header>

      {loadError && (
        <div className="reports-error" role="alert">
          {loadError}
          <button type="button" onClick={() => setBusiness(readBusiness())}>
            Retry
          </button>
        </div>
      )}

      <section className="reports-summary">
        <article className="reports-summary-card">
          <span className="reports-icon">↗</span>
          <p>Total Revenue</p>
          <h2>{loading ? 'Loading...' : money(reportData.revenue, currency)}</h2>
          <span>From recorded sales in this period</span>
        </article>

        <article className="reports-summary-card">
          <span className="reports-icon">↘</span>
          <p>Total Expenses</p>
          <h2>{loading ? 'Loading...' : money(reportData.expenses, currency)}</h2>
          <span>From recorded expenses in this period</span>
        </article>

        <article className="reports-summary-card">
          <span className="reports-icon">₦</span>
          <p>Net Profit</p>
          <h2 className={reportData.profit < 0 ? 'reports-loss' : ''}>
            {loading ? 'Loading...' : money(reportData.profit, currency)}
          </h2>
          <span>Revenue minus recorded expenses</span>
        </article>
      </section>

      <section className="reports-panel">
        <div className="reports-panel-heading">
          <div>
            <h2>Revenue and Expenses</h2>
            <p>Compare money earned with money spent over time.</p>
          </div>

          <select
            className="reports-select"
            aria-label="Report period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>

        {loading ? (
          <div className="reports-empty-state">
            <h3>Loading report...</h3>
          </div>
        ) : !reportData.hasRecords ? (
          <div className="reports-empty-state">
            <div className="reports-empty-icon">▥</div>
            <h3>No financial records for this period</h3>
            <p>
              When sales and expenses are recorded with dates and amounts,
              your report will appear here. No sample figures are added.
            </p>
          </div>
        ) : (
          <div className="reports-chart">
            <div className="reports-chart-legend">
              <span><i className="legend-revenue" /> Revenue</span>
              <span><i className="legend-expenses" /> Expenses</span>
            </div>

            <div className="reports-chart-area">
              {reportData.chartLabels.map((label, index) => (
                <div className="reports-chart-column" key={`${label}-${index}`}>
                  <div className="reports-bars">
                    <div
                      className="reports-bar reports-bar-revenue"
                      style={{
                        height: `${Math.max(0, (reportData.chartRevenue[index] / chartMaximum) * 100)}%`,
                      }}
                      title={`Revenue: ${money(reportData.chartRevenue[index], currency)}`}
                    />
                    <div
                      className="reports-bar reports-bar-expenses"
                      style={{
                        height: `${Math.max(0, (reportData.chartExpenses[index] / chartMaximum) * 100)}%`,
                      }}
                      title={`Expenses: ${money(reportData.chartExpenses[index], currency)}`}
                    />
                  </div>
                  <span className="reports-chart-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="reports-panel reports-breakdown">
        <div className="reports-panel-heading">
          <div>
            <h2>Expense Breakdown</h2>
            <p>See where your business money is going.</p>
          </div>
        </div>

        {loading ? (
          <div className="reports-small-empty">Loading expenses...</div>
        ) : reportData.expenseBreakdown.length === 0 ? (
          <div className="reports-small-empty">
            No expense records available for this period.
          </div>
        ) : (
          <div className="reports-breakdown-list">
            {reportData.expenseBreakdown.map((item) => {
              const percentage = reportData.expenses > 0
                ? (item.amount / reportData.expenses) * 100
                : 0

              return (
                <div className="reports-breakdown-item" key={item.category}>
                  <div className="reports-breakdown-top">
                    <span>{item.category}</span>
                    <strong>{money(item.amount, currency)}</strong>
                  </div>
                  <div className="reports-progress-track">
                    <div
                      className="reports-progress-fill"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  <span className="reports-percentage">
                    {percentage.toFixed(1)}% of recorded expenses
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="reports-panel reports-recent">
        <div className="reports-panel-heading">
          <div>
            <h2>Recent Financial Records</h2>
            <p>Recent sales and expenses in the selected period.</p>
          </div>
        </div>

        {loading ? (
          <div className="reports-small-empty">Loading records...</div>
        ) : reportData.recentRecords.length === 0 ? (
          <div className="reports-small-empty">
            No financial records to display yet.
          </div>
        ) : (
          <div className="reports-record-list">
            {reportData.recentRecords.map((record, index) => (
              <div
                className="reports-record-row"
                key={record.id ?? `${record.type}-${record.date.toISOString()}-${index}`}
              >
                <div className={`reports-record-icon ${record.type === 'Sale' ? 'record-sale' : 'record-expense'}`}>
                  {record.type === 'Sale' ? '+' : '−'}
                </div>
                <div className="reports-record-info">
                  <strong>{record.label}</strong>
                  <span>{record.type} · {formatDate(record.date)}</span>
                </div>
                <strong className={record.type === 'Sale' ? 'record-amount-sale' : 'record-amount-expense'}>
                  {record.type === 'Expense' ? '−' : '+'}{money(record.amount, currency)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Reports