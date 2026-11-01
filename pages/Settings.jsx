
import { useEffect, useState } from 'react'
import './Settings.css'

const BUSINESS_KEY = 'profitTrackBusiness'
const API_URL = 'http://127.0.0.1:8000/api/businesses/'

const initialBusiness = {
  id: null,
  businessName: '',
  businessType: '',
  industry: '',
  businessModel: '',
  currency: 'NGN',
  email: '',
  phone: '',
}

function readBusinessInformation() {
  try {
    const saved = localStorage.getItem(BUSINESS_KEY)

    if (!saved) return initialBusiness

    const parsed = JSON.parse(saved)

    if (!parsed || typeof parsed !== 'object') {
      return initialBusiness
    }

    return {
      ...initialBusiness,
      ...parsed,
      email: parsed.email ?? parsed.businessEmail ?? '',
      phone: parsed.phone ?? parsed.businessPhone ?? '',
    }
  } catch {
    return initialBusiness
  }
}

function Settings() {
  const [business, setBusiness] = useState(initialBusiness)
  const [savedMessage, setSavedMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadBusiness() {
      const savedBusiness = readBusinessInformation()

      setBusiness(savedBusiness)

      if (!savedBusiness.id) {
        setErrorMessage(
          'No saved business ID was found. Please complete Business Setup first.',
        )
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${API_URL}${savedBusiness.id}/`,
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.detail || 'Could not load your business information.',
          )
        }

        const loadedBusiness = {
          ...savedBusiness,
          ...data,
          email: data.email ?? '',
          phone: data.phone ?? '',
        }

        setBusiness(loadedBusiness)

        localStorage.setItem(
          BUSINESS_KEY,
          JSON.stringify(loadedBusiness),
        )

        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Could not load your business from the backend.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadBusiness()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setBusiness((current) => ({
      ...current,
      [name]: value,
    }))

    setSavedMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanedBusiness = {
      ...business,
      businessName: business.businessName.trim(),
      email: business.email.trim(),
      phone: business.phone.trim(),
    }

    if (!cleanedBusiness.businessName) {
      setErrorMessage('Please enter your business name.')
      setSavedMessage('')
      return
    }

    if (!cleanedBusiness.id) {
      setErrorMessage(
        'No business ID was found. Please complete Business Setup first.',
      )
      setSavedMessage('')
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSavedMessage('')

    try {
      const response = await fetch(
        `${API_URL}${cleanedBusiness.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessName: cleanedBusiness.businessName,
            businessType: cleanedBusiness.businessType,
            industry: cleanedBusiness.industry,
            businessModel: cleanedBusiness.businessModel,
            currency: cleanedBusiness.currency,
            email: cleanedBusiness.email,
            phone: cleanedBusiness.phone,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        const details =
          typeof data === 'object'
            ? Object.entries(data)
                .map(([field, messages]) => {
                  const message = Array.isArray(messages)
                    ? messages.join(' ')
                    : String(messages)

                  return `${field}: ${message}`
                })
                .join(' ')
            : 'Could not update your business.'

        throw new Error(details)
      }

      const updatedBusiness = {
        ...cleanedBusiness,
        ...data,
        id: data.id ?? cleanedBusiness.id,
        email: data.email ?? cleanedBusiness.email,
        phone: data.phone ?? cleanedBusiness.phone,
      }

      localStorage.setItem(
        BUSINESS_KEY,
        JSON.stringify(updatedBusiness),
      )

      setBusiness(updatedBusiness)
      setSavedMessage(
        'Your business settings have been saved successfully.',
      )

      window.dispatchEvent(
        new Event('profitTrackBusinessUpdated'),
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Your settings could not be saved. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <p className="settings-eyebrow">WORKSPACE PREFERENCES</p>
          <h1>Settings</h1>
          <p className="settings-subtitle">
            Manage your business information and application preferences.
          </p>
        </div>
      </header>

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <h2>Business Information</h2>
            <p>Details about the business using ProfitTrack.</p>
          </div>
          <span className="settings-status">Business profile</span>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-field">
            <label htmlFor="businessName">Business name *</label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="Your business name"
              value={business.businessName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="settings-field">
            <label htmlFor="businessType">Business type</label>
            <select
              id="businessType"
              name="businessType"
              value={business.businessType}
              onChange={handleChange}
            >
              <option value="">Select business type</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Services">Services</option>
              <option value="Mixed">Mixed</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="industry">Industry</label>
            <input
              id="industry"
              name="industry"
              type="text"
              placeholder="Your business industry"
              value={business.industry}
              onChange={handleChange}
            />
          </div>

          <div className="settings-field">
            <label htmlFor="businessModel">What your business offers</label>
            <select
              id="businessModel"
              name="businessModel"
              value={business.businessModel}
              onChange={handleChange}
            >
              <option value="">Select what you offer</option>
              <option value="Products">Products</option>
              <option value="Services">Services</option>
              <option value="Both">Products and services</option>
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="currency">Business currency</label>
            <select
              id="currency"
              name="currency"
              value={business.currency || 'NGN'}
              onChange={handleChange}
            >
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="USD">USD - US Dollar</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="EUR">EUR - Euro</option>
            </select>
            <span className="settings-field-help">
              Used when displaying business amounts on the Dashboard.
            </span>
          </div>

          <div className="settings-field">
            <label htmlFor="email">Business email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="business@example.com"
              value={business.email}
              onChange={handleChange}
            />
          </div>

          <div className="settings-field">
            <label htmlFor="phone">Business phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Business phone number"
              value={business.phone}
              onChange={handleChange}
            />
          </div>

          {errorMessage && (
            <p className="settings-message settings-error" role="alert">
              {errorMessage}
            </p>
          )}

          {savedMessage && (
            <p className="settings-message settings-success" role="status">
              <span aria-hidden="true">✓</span> {savedMessage}
            </p>
          )}

          <div className="settings-actions">
            <button
              type="submit"
              className="settings-save-button"
              disabled={loading || saving}
            >
              {loading
                ? 'Loading...'
                : saving
                  ? 'Saving...'
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default Settings
