
import { useEffect, useMemo, useState } from 'react'
import './Inventory.css'

const PRODUCTS_API = 'http://127.0.0.1:8000/api/products/'
const MOVEMENTS_API = 'http://127.0.0.1:8000/api/stock-movements/'

const emptyForm = {
  productId: '',
  movementType: 'received',
  quantity: '',
  note: '',
}

const movementLabels = {
  received: 'Stock received',
  adjusted: 'Stock adjusted',
  removed: 'Stock removed',
}

function getBusiness() {
  try {
    return JSON.parse(localStorage.getItem('profitTrackBusiness') || '{}')
  } catch {
    return {}
  }
}

function getErrorMessage(data) {
  if (typeof data === 'string') return data

  if (data && typeof data === 'object') {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value)
      return [`${field === 'detail' ? '' : `${field}: `}${text}`]
    })

    if (messages.length) return messages.join(' ')
  }

  return 'Something went wrong. Please try again.'
}

function Inventory() {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')

  const business = getBusiness()
  const businessId = business.id
  const currency = business.currency || 'NGN'

  const money = (amount) => {
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

  async function loadInventory() {
    if (!businessId) {
      setProducts([])
      setMovements([])
      setPageError(
        'No business is selected. Please open your business setup and select your business first.',
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setPageError('')

    try {
      const query = `?businessId=${encodeURIComponent(businessId)}`

      const [productsResponse, movementsResponse] = await Promise.all([
        fetch(`${PRODUCTS_API}${query}`),
        fetch(`${MOVEMENTS_API}${query}`),
      ])

      const productsData = await productsResponse.json()
      const movementsData = await movementsResponse.json()

      if (!productsResponse.ok) {
        throw new Error(getErrorMessage(productsData))
      }

      if (!movementsResponse.ok) {
        throw new Error(getErrorMessage(movementsData))
      }

      if (!Array.isArray(productsData) || !Array.isArray(movementsData)) {
        throw new Error('The server returned an unexpected response.')
      }

      setProducts(productsData)
      setMovements(
        movementsData.map((movement) => ({
          id: movement.id,
          productId: movement.productId,
          productName: movement.productName,
          sku: movement.sku,
          type: movementLabels[movement.movementType] || movement.movementType,
          change: Number(movement.change) || 0,
          previousQuantity: Number(movement.previousQuantity) || 0,
          newQuantity: Number(movement.newQuantity) || 0,
          note: movement.note || '',
          date: movement.createdAt,
        })),
      )
    } catch (err) {
      setPageError(
        err.message ||
          'Could not load inventory. Check that the Django server is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
    // Load inventory when the selected business changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      Number(product.quantity) <= Number(product.lowStockLevel ?? 5),
  )

  const outOfStockProducts = products.filter(
    (product) => Number(product.quantity) === 0,
  )

  const totalUnits = products.reduce(
    (total, product) => total + (Number(product.quantity) || 0),
    0,
  )

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        String(product.name || '').toLowerCase().includes(term) ||
        String(product.sku || '').toLowerCase().includes(term) ||
        String(product.category || '').toLowerCase().includes(term)

      const quantity = Number(product.quantity) || 0
      const threshold = Number(product.lowStockLevel ?? 5)

      let matchesStatus = true

      if (statusFilter === 'Low stock') {
        matchesStatus = quantity > 0 && quantity <= threshold
      } else if (statusFilter === 'Out of stock') {
        matchesStatus = quantity === 0
      } else if (statusFilter === 'In stock') {
        matchesStatus = quantity > threshold
      }

      return matchesSearch && matchesStatus
    })
  }, [products, search, statusFilter])

  function openForm() {
    if (loading) return

    if (products.length === 0) {
      setError('Add a product on the Products page before recording stock.')
      setShowForm(false)
      return
    }

    setForm({
      ...emptyForm,
      productId: String(products[0].id),
    })
    setError('')
    setPageError('')
    setShowForm(true)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  async function recordStock(event) {
    event.preventDefault()
    if (saving) return

    setError('')

    const product = products.find(
      (item) => String(item.id) === String(form.productId),
    )
    const quantity = Number(form.quantity)

    if (!product) {
      setError('Please select a valid product.')
      return
    }

    if (
      form.quantity.trim() === '' ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      (form.movementType !== 'adjusted' && quantity === 0)
    ) {
      setError(
        form.movementType === 'adjusted'
          ? 'Enter a valid stock count of zero or more.'
          : 'Enter a quantity greater than zero.',
      )
      return
    }

    if (!Number.isInteger(quantity)) {
      setError('Stock quantities must be whole numbers.')
      return
    }

    const previousQuantity = Number(product.quantity) || 0

    if (
      form.movementType === 'removed' &&
      quantity > previousQuantity
    ) {
      setError('You cannot remove more stock than is available.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `${MOVEMENTS_API}?businessId=${encodeURIComponent(businessId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            movementType: form.movementType,
            quantity,
            note: form.note.trim(),
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(getErrorMessage(data))
      }

      setShowForm(false)
      setForm(emptyForm)
      setError('')

      // Reload the authoritative quantities and history from Django.
      await loadInventory()
    } catch (err) {
      setError(
        err.message ||
          'Could not save this stock movement. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  function getStatus(product) {
    const quantity = Number(product.quantity) || 0
    const threshold = Number(product.lowStockLevel ?? 5)

    if (quantity === 0) return 'Out of stock'
    if (quantity <= threshold) return 'Low stock'
    return 'In stock'
  }

  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <p className="inventory-eyebrow">STOCK MANAGEMENT</p>
          <h1>Inventory</h1>
          <p className="inventory-subtitle">
            Monitor stock levels, record changes and keep products available.
          </p>
        </div>

        <button
          className="inventory-button"
          type="button"
          onClick={openForm}
          disabled={loading || !businessId}
        >
          + Record Stock
        </button>
      </header>

      {pageError && (
        <p className="inventory-message" role="alert">
          {pageError}
        </p>
      )}

      {error && !showForm && (
        <p className="inventory-message" role="alert">
          {error}
        </p>
      )}

      <section className="inventory-summary">
        <article className="inventory-summary-card">
          <span className="inventory-summary-icon">▦</span>
          <p>Total Stock Units</p>
          <h2>{loading ? '...' : totalUnits.toLocaleString()}</h2>
          <span>Across {products.length} products</span>
        </article>

        <article className="inventory-summary-card">
          <span className="inventory-summary-icon">!</span>
          <p>Low Stock</p>
          <h2>{loading ? '...' : lowStockProducts.length}</h2>
          <span>Products nearing their stock limit</span>
        </article>

        <article className="inventory-summary-card">
          <span className="inventory-summary-icon">×</span>
          <p>Out of Stock</p>
          <h2>{loading ? '...' : outOfStockProducts.length}</h2>
          <span>Products with zero units available</span>
        </article>

        <article className="inventory-summary-card">
          <span className="inventory-summary-icon">₦</span>
          <p>Stock Value</p>
          <h2>
            {loading
              ? '...'
              : money(
                  products.reduce(
                    (total, product) =>
                      total +
                      (Number(product.costPrice) || 0) *
                        (Number(product.quantity) || 0),
                    0,
                  ),
                )}
          </h2>
          <span>Estimated value at cost price</span>
        </article>
      </section>

      {showForm && (
        <section className="inventory-form-panel">
          <div className="inventory-form-heading">
            <div>
              <p className="inventory-eyebrow">STOCK ACTIVITY</p>
              <h2>Record Stock Movement</h2>
              <p>Choose a product and record the quantity change.</p>
            </div>

            <button
              className="inventory-close-button"
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
              disabled={saving}
            >
              ×
            </button>
          </div>

          <form onSubmit={recordStock}>
            <div className="inventory-form-grid">
              <label>
                Product *
                <select
                  name="productId"
                  value={form.productId}
                  onChange={handleChange}
                  required
                  disabled={saving}
                >
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name} ({product.sku}) · {product.quantity} available
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Movement Type *
                <select
                  name="movementType"
                  value={form.movementType}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="received">Receive stock</option>
                  <option value="adjusted">Set actual stock count</option>
                  <option value="removed">Remove damaged or missing stock</option>
                </select>
              </label>

              <label>
                {form.movementType === 'adjusted'
                  ? 'New Actual Quantity *'
                  : 'Quantity *'}
                <input
                  name="quantity"
                  type="number"
                  min={form.movementType === 'adjusted' ? '0' : '1'}
                  step="1"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder={
                    form.movementType === 'adjusted'
                      ? 'Enter the total stock count'
                      : 'Enter quantity'
                  }
                  required
                  disabled={saving}
                />
              </label>

              <label>
                Note (optional)
                <input
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="e.g. Supplier delivery or damaged goods"
                  disabled={saving}
                />
              </label>
            </div>

            {error && (
              <p className="inventory-form-error" role="alert">
                {error}
              </p>
            )}

            <div className="inventory-form-actions">
              <button
                className="inventory-cancel-button"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="inventory-save-button"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Stock Movement'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="inventory-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Stock Levels</h2>
            <p>Review the available quantity for every product.</p>
          </div>

          <div className="inventory-toolbar">
            <input
              type="search"
              className="inventory-search"
              placeholder="Search name or SKU..."
              aria-label="Search inventory"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="inventory-filter"
              aria-label="Filter stock status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All stock</option>
              <option value="In stock">In stock</option>
              <option value="Low stock">Low stock</option>
              <option value="Out of stock">Out of stock</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="inventory-history-empty">
            Loading inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="inventory-empty">
            <div className="inventory-empty-icon">▤</div>
            <strong>
              {products.length === 0
                ? 'No products to track yet'
                : 'No matching inventory'}
            </strong>
            <p>
              {products.length === 0
                ? 'Add products on the Products page first. They will appear here automatically.'
                : 'Try changing your search or stock status filter.'}
            </p>
          </div>
        ) : (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Alert Level</th>
                  <th>Stock Value</th>
                  <th>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStatus(product)

                  return (
                    <tr key={product.id}>
                      <td className="inventory-product-name">{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.category || 'Uncategorised'}</td>
                      <td className="inventory-quantity">
                        {Number(product.quantity) || 0}
                      </td>
                      <td>{Number(product.lowStockLevel ?? 5)}</td>
                      <td>
                        {money(
                          (Number(product.costPrice) || 0) *
                            (Number(product.quantity) || 0),
                        )}
                      </td>
                      <td>
                        <span
                          className={`inventory-status ${
                            status === 'In stock'
                              ? 'status-good'
                              : status === 'Low stock'
                                ? 'status-low'
                                : 'status-empty'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="inventory-footer">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
      </section>

      <section className="inventory-panel inventory-history">
        <div className="inventory-panel-heading">
          <div>
            <h2>Recent Stock Movements</h2>
            <p>Review stock received, removed or adjusted.</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-history-empty">
            Loading stock movement history...
          </div>
        ) : movements.length === 0 ? (
          <div className="inventory-history-empty">
            No stock movements recorded yet. Use “Record Stock” to add one.
          </div>
        ) : (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Movement</th>
                  <th>Change</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 20).map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      {new Date(movement.date).toLocaleString('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="inventory-product-name">
                      {movement.productName}
                    </td>
                    <td>{movement.type}</td>
                    <td
                      className={
                        movement.change >= 0
                          ? 'movement-increase'
                          : 'movement-decrease'
                      }
                    >
                      {movement.change > 0 ? '+' : ''}
                      {movement.change}
                    </td>
                    <td>{movement.previousQuantity}</td>
                    <td>{movement.newQuantity}</td>
                    <td>{movement.note || 'No note'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Inventory
