
import { useEffect, useMemo, useState } from 'react'
import './Sales.css'

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

function mapProduct(product) {
  return {
    id: product.id,
    businessId: product.businessId ?? product.business,
    name: product.name,
    sku: product.sku,
    category: product.category,
    costPrice: Number(product.costPrice ?? product.cost_price) || 0,
    sellingPrice: Number(product.sellingPrice ?? product.selling_price ?? product.price) || 0,
    quantity: Number(product.quantity) || 0,
    lowStockLevel: Number(product.lowStockLevel ?? product.low_stock_level) || 0,
  }
}

function mapSale(sale) {
  return {
    id: sale.id,
    saleId: sale.sale_id,
    type: 'sale',
    productId: sale.product,
    productName: sale.product_name || 'Product',
    itemsOrService: sale.product_name || 'Product',
    quantity: Number(sale.quantity) || 0,
    unitPrice: Number(sale.unit_price) || 0,
    totalAmount: Number(sale.total_amount) || 0,
    amount: Number(sale.total_amount) || 0,
    total: Number(sale.total_amount) || 0,
    paymentMethod: sale.payment_method,
    status: sale.status,
    date: sale.date,
    createdAt: sale.created_at,
  }
}

async function readResponse(response) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.quantity ||
      data?.product ||
      data?.business ||
      data?.payment_method ||
      data?.date ||
      'The request failed. Please try again.'

    throw new Error(
      typeof message === 'string' ? message : JSON.stringify(message),
    )
  }

  return data
}

function Sales() {
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [currency] = useState(() => {
    const business = readStorage(BUSINESS_KEY, {})
    return business.currency || 'NGN'
  })

  const business = readStorage(BUSINESS_KEY, {})
  const businessId = business.id ?? business.businessId

  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadSalesData() {
    if (!businessId) {
      setProducts([])
      setSales([])
      setError('No business is selected. Please select your business first.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [productsResponse, salesResponse] = await Promise.all([
        fetch(
          `${API_URL}/products/?businessId=${encodeURIComponent(businessId)}`,
        ),
        fetch(
          `${API_URL}/sales/?businessId=${encodeURIComponent(businessId)}`,
        ),
      ])

      const [productsData, salesData] = await Promise.all([
        readResponse(productsResponse),
        readResponse(salesResponse),
      ])

      setProducts(
        (Array.isArray(productsData) ? productsData : productsData.results || [])
          .map(mapProduct),
      )

      setSales(
        (Array.isArray(salesData) ? salesData : salesData.results || [])
          .map(mapSale),
      )
    } catch (err) {
      setError(err.message || 'Could not load sales data from the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSalesData()
    // Load data when the selected business changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const selectedProduct = products.find(
    (product) => String(product.id) === String(productId),
  )

  const unitPrice = selectedProduct
    ? Number(selectedProduct.sellingPrice) || 0
    : 0

  const saleQuantity = Number(quantity)
  const saleTotal =
    unitPrice * (Number.isInteger(saleQuantity) ? saleQuantity : 0)

  const totalSales = useMemo(
    () =>
      sales.reduce(
        (total, sale) => total + (Number(sale.totalAmount) || 0),
        0,
      ),
    [sales],
  )

  const averageSale = sales.length ? totalSales / sales.length : 0

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()

    return [...sales]
      .filter((sale) => {
        const searchable = [
          sale.id,
          sale.saleId,
          sale.productName,
          sale.itemsOrService,
          sale.paymentMethod,
          sale.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchable.includes(term)
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.date || 0) -
          new Date(a.createdAt || a.date || 0),
      )
  }, [sales, search])

  function openForm() {
    const firstAvailableProduct = products.find(
      (product) => Number(product.quantity) > 0,
    )

    setProductId(firstAvailableProduct ? String(firstAvailableProduct.id) : '')
    setQuantity('1')
    setPaymentMethod('Cash')
    setSaleDate(new Date().toISOString().slice(0, 10))
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  async function handleRecordSale(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!businessId) {
      setError('No business is selected. Please select your business first.')
      return
    }

    if (!selectedProduct) {
      setError('Please select a product.')
      return
    }

    if (!Number.isInteger(saleQuantity) || saleQuantity < 1) {
      setError('Quantity must be a whole number greater than zero.')
      return
    }

    if (unitPrice <= 0) {
      setError(
        'This product has no valid selling price. Update it in Products first.',
      )
      return
    }

    const availableStock = Number(selectedProduct.quantity) || 0

    if (saleQuantity > availableStock) {
      setError(`Only ${availableStock} unit(s) are currently in stock.`)
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/sales/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business: businessId,
          product: selectedProduct.id,
          quantity: saleQuantity,
          payment_method: paymentMethod,
          date: saleDate,
        }),
      })

      const data = await readResponse(response)
      const newSale = mapSale(data)

      setSales((currentSales) => [newSale, ...currentSales])
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          String(product.id) === String(selectedProduct.id)
            ? {
                ...product,
                quantity: Math.max(
                  0,
                  (Number(product.quantity) || 0) - saleQuantity,
                ),
              }
            : product,
        ),
      )

      setShowForm(false)
      setSuccess(
        `Sale recorded successfully. Total: ${formatCurrency(
          newSale.totalAmount,
          currency,
        )}`,
      )
    } catch (err) {
      setError(err.message || 'Could not record the sale. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sales-page">
      <header className="sales-header">
        <div>
          <p className="sales-eyebrow">REVENUE MANAGEMENT</p>
          <h1>Sales</h1>
          <p className="sales-subtitle">
            Record sales and monitor your business revenue.
          </p>
        </div>

        <button
          className="sales-button"
          type="button"
          onClick={openForm}
          disabled={loading || !businessId}
        >
          <span aria-hidden="true">＋</span> Record Sale
        </button>
      </header>

      {success && (
        <div className="sales-message sales-message-success" role="status">
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

      {error && !showForm && (
        <div className="sales-form-error" role="alert">
          {error}
          <button
            type="button"
            onClick={loadSalesData}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      <section className="sales-summary">
        <article className="sales-summary-card">
          <div className="sales-card-icon sales-icon-green">₦</div>
          <p>Total Sales</p>
          <h2>{formatCurrency(totalSales, currency)}</h2>
          <span>Revenue from recorded sales</span>
        </article>

        <article className="sales-summary-card">
          <div className="sales-card-icon sales-icon-blue">↗</div>
          <p>Number of Sales</p>
          <h2>{sales.length}</h2>
          <span>Recorded sales transactions</span>
        </article>

        <article className="sales-summary-card">
          <div className="sales-card-icon sales-icon-orange">◷</div>
          <p>Average Sale</p>
          <h2>{formatCurrency(averageSale, currency)}</h2>
          <span>Average value per transaction</span>
        </article>
      </section>

      {showForm && (
        <section className="sales-panel sales-form-panel">
          <div className="sales-panel-heading">
            <div>
              <h2>Record a Sale</h2>
              <p>Select a product and enter the quantity sold.</p>
            </div>
            <button
              className="sales-close-button"
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close sale form"
            >
              ×
            </button>
          </div>

          {products.length === 0 ? (
            <div className="sales-form-empty">
              <strong>No products found</strong>
              <p>Add products in the Products page before recording a sale.</p>
            </div>
          ) : (
            <form className="sales-form" onSubmit={handleRecordSale}>
              <label>
                Product
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  required
                >
                  <option value="">Choose a product</option>
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={String(product.id)}
                      disabled={Number(product.quantity) <= 0}
                    >
                      {product.name} · Stock: {Number(product.quantity) || 0}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sales-form-grid">
                <label>
                  Quantity sold
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={
                      selectedProduct
                        ? Number(selectedProduct.quantity) || 0
                        : undefined
                    }
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    required
                  />
                  {selectedProduct && (
                    <small>
                      Available stock: {Number(selectedProduct.quantity) || 0}
                    </small>
                  )}
                </label>

                <label>
                  Sale date
                  <input
                    type="date"
                    value={saleDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setSaleDate(event.target.value)}
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

                <div className="sales-price-field">
                  <span>Unit selling price</span>
                  <strong>{formatCurrency(unitPrice, currency)}</strong>
                </div>
              </div>

              <div className="sales-total-preview">
                <span>Sale total</span>
                <strong>{formatCurrency(saleTotal, currency)}</strong>
              </div>

              {error && (
                <p className="sales-form-error" role="alert">
                  {error}
                </p>
              )}

              <div className="sales-form-actions">
                <button
                  className="sales-button sales-button-secondary"
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button className="sales-button" type="submit" disabled={saving}>
                  {saving ? 'Recording...' : 'Confirm Sale'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="sales-panel">
        <div className="sales-panel-heading">
          <div>
            <h2>Sales History</h2>
            <p>Review the sales your business has recorded.</p>
          </div>

          <input
            className="sales-search"
            type="search"
            placeholder="Search sales..."
            aria-label="Search sales"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="sales-table-wrap">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Date</th>
                <th>Items or Service</th>
                <th>Payment Method</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="sales-empty">
                    Loading sales...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sales-empty">
                    <div className="sales-empty-icon">↗</div>
                    <strong>
                      {search ? 'No matching sales' : 'No sales recorded yet'}
                    </strong>
                    <p>
                      {search
                        ? 'Try a different search term.'
                        : 'Record your first sale and it will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id || sale.saleId}>
                    <td className="sales-id">{sale.saleId || sale.id || 'Sale'}</td>
                    <td>
                      {sale.date
                        ? new Date(
                            `${sale.date.slice(0, 10)}T00:00:00`,
                          ).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td>
                      <strong>
                        {sale.productName || sale.itemsOrService || 'Sale'}
                      </strong>
                      {sale.quantity > 0 && (
                        <span className="sales-item-quantity">
                          Qty: {sale.quantity}
                        </span>
                      )}
                    </td>
                    <td>{sale.paymentMethod || '—'}</td>
                    <td className="sales-amount">
                      {formatCurrency(sale.totalAmount, currency)}
                    </td>
                    <td>
                      <span className="sales-status">
                        {sale.status || 'Completed'}
                      </span>
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

export default Sales
