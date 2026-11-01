
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Products', path: '/products', icon: 'products' },
  { name: 'Inventory', path: '/inventory', icon: 'inventory' },
  { name: 'Sales', path: '/sales', icon: 'sales' },
  { name: 'Transactions', path: '/transactions', icon: 'transactions' },
  { name: 'Reports', path: '/reports', icon: 'reports' },
]

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    products: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 16 9 5 9-5" />
      </>
    ),
    inventory: (
      <>
        <path d="M4 7h16v14H4z" />
        <path d="M8 7V4h8v3M4 12h16M10 12v3h4v-3" />
      </>
    ),
    sales: (
      <>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    transactions: (
      <>
        <path d="M7 7h13l-3-3" />
        <path d="M20 7l-3 3M17 17H4l3 3" />
        <path d="M4 17l3-3" />
      </>
    ),
    reports: (
      <>
        <path d="M5 3h10l4 4v14H5z" />
        <path d="M15 3v5h4M8 17v-4M12 17V9M16 17v-6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.1.9-1.5 2.6-1.4-.5a8 8 0 0 1-1.7 1l-.2 1.5h-3l-.3-1.5a8 8 0 0 1-1.7-1l-1.4.5-1.5-2.6 1.2-.9a7 7 0 0 1 0-2l-1.2-.9 1.5-2.6 1.4.5a8 8 0 0 1 1.7-1l.3-1.5h3l.2 1.5a8 8 0 0 1 1.7 1l1.4-.5 1.5 2.6-1.1.9a7 7 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.05)" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
  }

  return <svg {...common}>{paths[name]}</svg>
}

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(true)

  let businessName = 'My Business'

  try {
    const saved = JSON.parse(
      localStorage.getItem('profitTrackBusiness')
    )
    if (saved?.businessName?.trim()) {
      businessName = saved.businessName.trim()
    }
  } catch {
    // Use the default workspace name if saved data is unavailable.
  }

  function toggleSidebar() {
    setOpen((current) => !current)
  }

  return (
    <>
      {!open && (
        <button
          className="sidebar-reopen"
          type="button"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          title="Open navigation"
        >
          <Icon name="menu" size={23} />
        </button>
      )}

      {open && (
        <button
          className="sidebar-mobile-overlay"
          type="button"
          aria-label="Close navigation"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={[
          'sidebar',
          collapsed ? 'sidebar-collapsed' : '',
          open ? 'sidebar-open' : 'sidebar-hidden',
        ].filter(Boolean).join(' ')}
      >
        <div className="sidebar-brand">
          <div className="brand-icon">P</div>

          {!collapsed && (
            <div className="brand-copy">
              <h2>ProfitTrack</h2>
              <p>Business Manager</p>
            </div>
          )}

          <button
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <button
          className="sidebar-collapse"
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'right' : 'left'} size={18} />
          {!collapsed && <span>Collapse menu</span>}
        </button>

        <p className="nav-heading">
          {!collapsed && 'WORKSPACE'}
        </p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth <= 760) setOpen(false)
              }}
              title={collapsed ? item.name : undefined}
              aria-label={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              <span className="nav-icon">
                <Icon name={item.icon} />
              </span>
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            onClick={() => {
              if (window.innerWidth <= 760) setOpen(false)
            }}
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">
              <Icon name="settings" />
            </span>
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {!collapsed && (
            <div className="workspace-card">
              <div className="workspace-avatar">
                {businessName.charAt(0).toUpperCase()}
              </div>
              <div className="workspace-copy">
                <span className="workspace-caption">YOUR BUSINESS</span>
                <strong title={businessName}>{businessName}</strong>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
