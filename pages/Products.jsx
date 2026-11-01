
import { useEffect, useMemo, useState } from 'react'
import './Products.css'

const API_URL = 'http://127.0.0.1:8000/api/products/'

const emptyProduct = {
  name: '',
  sku: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  quantity: '',
  lowStockLevel: '5',
}

function getSavedBusiness() {
  try {
    return JSON.parse(
      localStorage.getItem('profitTrackBusiness') || '{}',
    )
  } catch {
    return {}
  }
}

function mapProduct(product) {
  return {
    id: product.id,
    businessId: product.businessId,
    name: product.name,
    sku: product.sku,
    category: product.category,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    quantity: Number(product.quantity),
    lowStockLevel: Number(product.lowStockLevel),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      Object.entries(data)
        .map(([field, value]) => {
          const detail = Array.isArray(value)
            ? value.join(' ')
            : typeof value === 'string'
              ? value
              : JSON.stringify(value)

          return `${field}: ${detail}`
        })
        .join(' ') ||
      `The request failed (${response.status}).`

    throw new Error(message)
  }

  return data
}

function Products() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const business = getSavedBusiness()
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

  // Load this business's products from Django.
  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      setLoading(true)
      setPageError('')

      if (!businessId) {
        setProducts([])
        setPageError(
          'Your saved business ID is missing. Please complete Business Setup before managing products.',
        )
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${API_URL}?businessId=${encodeURIComponent(businessId)}`,
        )

        const data = await readResponse(response)

        if (!Array.isArray(data)) {
          throw new Error('The Products API returned an unexpected response.')
        }

        if (!cancelled) {
          setProducts(data.map(mapProduct))
        }
      } catch (requestError) {
        if (!cancelled) {
          setPageError(
            `Could not load products. ${requestError.message} Make sure Django is running.`,
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [businessId])

  const categories = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.category)
            .filter(Boolean),
        ),
      ].sort(),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)

      const matchesCategory =
        categoryFilter === 'All' ||
        product.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])

  const inventoryValue = products.reduce(
    (total, product) =>
      total + product.costPrice * product.quantity,
    0,
  )

  function openAddForm() {
    setEditingId(null)
    setForm(emptyProduct)
    setError('')
    setShowForm(true)
  }

  function openEditForm(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      quantity: String(product.quantity),
      lowStockLevel: String(product.lowStockLevel),
    })
    setError('')
    setShowForm(true)
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!businessId) {
      setError(
        'Your business ID is missing. Please complete Business Setup first.',
      )
      return
    }

    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      !form.category.trim()
    ) {
      setError(
        'Please complete the product name, SKU and category.',
      )
      return
    }

    const costPrice = Number(form.costPrice)
    const sellingPrice = Number(form.sellingPrice)
    const quantity = Number(form.quantity)
    const lowStockLevel = Number(form.lowStockLevel)

    if (
      form.costPrice === '' ||
      form.sellingPrice === '' ||
      form.quantity === '' ||
      form.lowStockLevel === '' ||
      ![
        costPrice,
        sellingPrice,
        quantity,
        lowStockLevel,
      ].every(Number.isFinite) ||
      costPrice < 0 ||
      sellingPrice < 0 ||
      quantity < 0 ||
      lowStockLevel < 0 ||
      !Number.isInteger(quantity) ||
      !Number.isInteger(lowStockLevel)
    ) {
      setError(
        'Enter valid, non-negative prices and whole-number stock quantities.',
      )
      return
    }

    const cleanSku = form.sku.trim()

    const duplicateSku = products.some(
      (product) =>
        product.sku.toLowerCase() === cleanSku.toLowerCase() &&
        product.id !== editingId,
    )

    if (duplicateSku) {
      setError(
        'That SKU already exists. Please use a different product code.',
      )
      return
    }

    const productData = {
      businessId: Number(businessId),
      name: form.name.trim(),
      sku: cleanSku,
      category: form.category.trim(),
      costPrice,
      sellingPrice,
      quantity,
      lowStockLevel,
    }

    setSaving(true)

    try {
      const isEditing = editingId !== null

      const response = await fetch(
        isEditing ? `${API_URL}${editingId}/` : API_URL,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        },
      )

      const savedData = await readResponse(response)
      const savedProduct = mapProduct(savedData)

      if (isEditing) {
        setProducts((current) =>
          current.map((product) =>
            product.id === editingId
              ? savedProduct
              : product,
          ),
        )
      } else {
        setProducts((current) => [
          savedProduct,
          ...current,
        ])
      }

      setShowForm(false)
      setEditingId(null)
      setForm(emptyProduct)
      setError('')
      setPageError('')
    } catch (requestError) {
      setError(
        `Could not save the product. ${requestError.message}`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from your product catalogue?`,
    )

    if (!confirmed) {
      return
    }

    setPageError('')

    try {
      const response = await fetch(
        `${API_URL}${product.id}/`,
        {
          method: 'DELETE',
        },
      )

      if (!response.ok) {
        await readResponse(response)
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      )

      if (editingId === product.id) {
        setShowForm(false)
        setEditingId(null)
        setForm(emptyProduct)
      }
    } catch (requestError) {
      setPageError(
        `Could not delete the product. ${requestError.message}`,
      )
    }
  }

  return (
    <div className="products-page">
      <header className="products-header">
        <div>
          <p className="products-eyebrow">BUSINESS MANAGEMENT</p>
          <h1>Products</h1>
          <p className="products-subtitle">
            Manage your catalogue, prices and available stock.
          </p>
        </div>

        <button
          className="products-add-button"
          type="button"
          onClick={openAddForm}
          disabled={loading || !businessId}
        >
          + Add Product
        </button>
      </header>

      <section className="products-summary">
        <article className="products-summary-card">
          <span className="products-summary-icon">▦</span>
          <p>Total Products</p>
          <h2>{products.length}</h2>
          <span className="products-summary-note">
            Products in your catalogue
          </span>
        </article>

        <article className="products-summary-card">
          <span className="products-summary-icon">▤</span>
          <p>Product Categories</p>
          <h2>{categories.length}</h2>
          <span className="products-summary-note">
            Unique categories
          </span>
        </article>

        <article className="products-summary-card">
          <span className="products-summary-icon">₦</span>
          <p>Inventory Value</p>
          <h2>{money(inventoryValue)}</h2>
          <span className="products-summary-note">
            Stock valued at cost price
          </span>
        </article>

        <article className="products-summary-card">
          <span className="products-summary-icon">!</span>
          <p>Low Stock</p>
          <h2>
            {
              products.filter(
                (product) =>
                  product.quantity <= product.lowStockLevel,
              ).length
            }
          </h2>
          <span className="products-summary-note">
            Products needing attention
          </span>
        </article>
      </section>

      {pageError && (
        <p className="products-form-error" role="alert">
          {pageError}
        </p>
      )}

      {showForm && (
        <section
          className="products-form-panel"
          aria-labelledby="product-form-title"
        >
          <div className="products-form-heading">
            <div>
              <p className="products-eyebrow">
                {editingId
                  ? 'UPDATE CATALOGUE'
                  : 'NEW CATALOGUE ITEM'}
              </p>
              <h2 id="product-form-title">
                {editingId ? 'Edit Product' : 'Add a Product'}
              </h2>
              <p>Enter the product details below.</p>
            </div>

            <button
              className="products-close-button"
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close product form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="products-form-grid">
              <label>
                Product Name *
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Notebook"
                  required
                />
              </label>

              <label>
                SKU / Product Code *
                <input
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="e.g. NOTE-001"
                  required
                />
              </label>

              <label>
                Category *
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="e.g. Stationery"
                  required
                />
              </label>

              <label>
                Cost Price ({currency}) *
                <input
                  name="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={handleChange}
                  placeholder="What you pay"
                  required
                />
              </label>

              <label>
                Selling Price ({currency}) *
                <input
                  name="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={handleChange}
                  placeholder="What you charge"
                  required
                />
              </label>

              <label>
                Stock Quantity *
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Units available"
                  required
                />
              </label>

              <label>
                Low-Stock Alert Level *
                <input
                  name="lowStockLevel"
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockLevel}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {form.costPrice !== '' &&
              form.sellingPrice !== '' && (
                <p className="products-profit-preview">
                  Profit per unit:{' '}
                  <strong>
                    {money(
                      Number(form.sellingPrice) -
                        Number(form.costPrice),
                    )}
                  </strong>
                </p>
              )}

            {error && (
              <p className="products-form-error" role="alert">
                {error}
              </p>
            )}

            <div className="products-form-actions">
              <button
                className="products-cancel-button"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="products-save-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Save Product'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="products-table-panel">
        <div className="products-table-heading">
          <div>
            <h2>All Products</h2>
            <p>Your business product catalogue.</p>
          </div>

          <div className="products-toolbar">
            <input
              className="products-search"
              type="search"
              placeholder="Search name, SKU or category..."
              aria-label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="products-filter"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
            >
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="products-empty-state">
            <h3>Loading products...</h3>
            <p>Connecting to your product catalogue.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="products-empty-state">
            <div className="products-empty-icon">▦</div>
            <h3>
              {products.length === 0
                ? 'No products yet'
                : 'No matching products'}
            </h3>
            <p>
              {products.length === 0
                ? 'Add your first product to start building your catalogue.'
                : 'Try another search term or choose a different category.'}
            </p>

            {products.length === 0 && (
              <button
                className="products-empty-button"
                type="button"
                onClick={openAddForm}
                disabled={!businessId}
              >
                + Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="products-table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Profit / Unit</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const lowStock =
                    product.quantity <= product.lowStockLevel

                  return (
                    <tr key={product.id}>
                      <td className="products-name-cell">
                        {product.name}
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.category}</td>
                      <td>{money(product.costPrice)}</td>
                      <td>{money(product.sellingPrice)}</td>
                      <td
                        className={
                          product.sellingPrice -
                            product.costPrice <
                          0
                            ? 'products-loss'
                            : 'products-profit'
                        }
                      >
                        {money(
                          product.sellingPrice -
                            product.costPrice,
                        )}
                      </td>
                      <td>{product.quantity}</td>
                      <td>
                        <span
                          className={`products-stock-badge ${
                            lowStock
                              ? 'is-low'
                              : 'is-available'
                          }`}
                        >
                          {lowStock ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td>
                        <div className="products-row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(product)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="products-delete-action"
                            type="button"
                            onClick={() =>
                              deleteProduct(product)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="products-table-footer">
            Showing {filteredProducts.length} of{' '}
            {products.length} products
          </div>
        )}
      </section>
    </div>
  )
}

export default Products
