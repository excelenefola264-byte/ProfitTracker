
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './BusinessSetup.css'

function BusinessSetup() {
  const navigate = useNavigate()

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [industry, setIndustry] = useState('')
  const [businessModel, setBusinessModel] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const business = {
      businessName: businessName.trim(),
      businessType,
      industry,
      businessModel,
      currency,
      email: email.trim(),
      phone: phone.trim(),
    }

    if (
      !business.businessName ||
      !business.businessType ||
      !business.industry ||
      !business.businessModel ||
      !business.currency
    ) {
      alert('Please complete all required fields.')
      return
    }

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/businesses/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(business),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        console.error('Django validation errors:', data)
        alert(
          'Could not save your business. Please check the details and try again.',
        )
        return
      }

      // Save the business details AND its Django database ID.
      const savedBusiness = {
        ...business,
        id: data.id,
      }

      localStorage.setItem(
        'profitTrackBusiness',
        JSON.stringify(savedBusiness),
      )

      alert('Business saved successfully!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Error connecting to Django:', error)
      alert(
        'Could not connect to the backend. Make sure Django is running and try again.',
      )
    }
  }

  return (
    <main className="setup-page">
      <section className="setup-card">
        <header className="setup-header">
          <div className="setup-logo">P</div>
          <span>ProfitTrack</span>
        </header>

        <div className="setup-intro">
          <p className="setup-eyebrow">
            YOUR BUSINESS STARTS HERE
          </p>

          <h1>Let's get to know your business.</h1>

          <p>
            Tell us a little about what you do. We'll use these
            details to help organize your workspace.
          </p>
        </div>

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-divider">
            <span>01 · BUSINESS PROFILE</span>
            <small>Required</small>
          </div>

          <div className="setup-field">
            <label htmlFor="businessName">
              What is your business called? *
            </label>

            <input
              id="businessName"
              type="text"
              placeholder="Enter your business name"
              value={businessName}
              onChange={(event) =>
                setBusinessName(event.target.value)
              }
              required
            />
          </div>

          <div className="setup-field">
            <label htmlFor="businessType">
              How does your business operate? *
            </label>

            <select
              id="businessType"
              value={businessType}
              onChange={(event) =>
                setBusinessType(event.target.value)
              }
              required
            >
              <option value="">Choose a business type</option>
              <option value="Retail">
                Retail — selling directly to customers
              </option>
              <option value="Wholesale">
                Wholesale — selling in bulk
              </option>
              <option value="Manufacturing">
                Manufacturing — making products
              </option>
              <option value="Services">
                Services — providing a service
              </option>
              <option value="Mixed">
                A combination of business types
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="setup-field">
            <label htmlFor="industry">
              Which industry are you in? *
            </label>

            <select
              id="industry"
              value={industry}
              onChange={(event) =>
                setIndustry(event.target.value)
              }
              required
            >
              <option value="">Choose your industry</option>
              <option value="Groceries and food">
                Groceries and food
              </option>
              <option value="Clothing and fashion">
                Clothing and fashion
              </option>
              <option value="Electronics">Electronics</option>
              <option value="Beauty and personal care">
                Beauty and personal care
              </option>
              <option value="Home and household">
                Home and household
              </option>
              <option value="Health and wellness">
                Health and wellness
              </option>
              <option value="Technology">Technology</option>
              <option value="Professional services">
                Professional services
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="setup-field">
            <label htmlFor="businessModel">
              What do you sell or provide? *
            </label>

            <select
              id="businessModel"
              value={businessModel}
              onChange={(event) =>
                setBusinessModel(event.target.value)
              }
              required
            >
              <option value="">
                Choose what your business offers
              </option>
              <option value="Products">Physical products</option>
              <option value="Services">Services</option>
              <option value="Both">
                Products and services
              </option>
            </select>
          </div>

          <div className="setup-divider">
            <span>02 · FINANCIAL PREFERENCES</span>
            <small>Required</small>
          </div>

          <div className="setup-field">
            <label htmlFor="currency">
              Which currency does your business use? *
            </label>

            <select
              id="currency"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value)
              }
              required
            >
              <option value="NGN">
                NGN — Nigerian Naira (₦)
              </option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="GBP">GBP — British Pound (£)</option>
              <option value="EUR">EUR — Euro (€)</option>
            </select>

            <small className="setup-help">
              This sets the currency displayed for your business.
            </small>
          </div>

          <div className="setup-divider">
            <span>03 · CONTACT DETAILS</span>
            <small>Optional</small>
          </div>

          <div className="setup-field">
            <label htmlFor="email">Business email</label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="setup-field">
            <label htmlFor="phone">
              Business phone number
            </label>

            <input
              id="phone"
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <button className="setup-submit" type="submit">
            Create my workspace <span>→</span>
          </button>

  
        </form>
      </section>
    </main>
  )
}

export default BusinessSetup
