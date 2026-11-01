
import { useNavigate } from 'react-router-dom'
import './Welcome.css'

function Welcome() {
  const navigate = useNavigate()

  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <a
          className="welcome-brand"
          href="/welcome"
          onClick={(event) => {
            event.preventDefault()
            navigate('/welcome')
          }}
        >
          <span className="welcome-logo">P</span>
          <span className="welcome-brand-name">ProfitTrack</span>
        </a>

        <span className="welcome-header-label">
          BUSINESS MANAGEMENT
        </span>
      </header>

      <section className="welcome-hero">
        <div className="welcome-content">
          <div className="welcome-status">
            <span className="welcome-status-dot" />
            YOUR BUSINESS, ORGANIZED
          </div>

          <h1>
            Your business.
            <br />
            <span>Your numbers.</span>
            <br />
            All in one place.
          </h1>

          <p className="welcome-description">
            Take control of your daily business activities.
            Organize products, record sales and expenses,
            monitor inventory, and see how your business is
            performing from one workspace.
          </p>

          <button
            className="welcome-button"
            type="button"
            onClick={() => navigate('/setup')}
          >
            Set up your business
            <span aria-hidden="true">→</span>
          </button>

          <p className="welcome-footnote">
            Get your workspace ready in a few simple steps.
          </p>
        </div>

        <div className="welcome-preview" aria-label="ProfitTrack dashboard preview">
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-dots">
                <span />
                <span />
                <span />
              </div>
              <span>YOUR BUSINESS OVERVIEW</span>
            </div>

            <div className="preview-body">
              <p className="preview-greeting">Business overview</p>
              <p className="preview-subtitle">
                Your activity, at a glance.
              </p>

              <div className="preview-metrics">
                <div className="preview-metric">
                  <span>Total sales</span>
                  <strong>₦0.00</strong>
                  <small>No sales recorded yet</small>
                </div>

                <div className="preview-metric">
                  <span>Net profit</span>
                  <strong>₦0.00</strong>
                  <small>Based on your records</small>
                </div>
              </div>

              <div className="preview-chart">
                <div className="preview-chart-heading">
                  <span>Sales overview</span>
                  <span>This month</span>
                </div>

                <div className="preview-chart-area">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="preview-chart-baseline" />
              </div>

              <div className="preview-bottom">
                <span>Products</span>
                <strong>Ready to organize</strong>
              </div>
            </div>
          </div>

          <div className="welcome-preview-note">
            <span className="preview-note-icon">✓</span>
            One workspace for your business
          </div>
        </div>
      </section>

      <footer className="welcome-footer">
        <span>Built for clearer business decisions.</span>
        <span>PROFITTRACK ©</span>
      </footer>
    </main>
  )
}

export default Welcome
