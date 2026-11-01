
import { Navigate, Route, Routes } from 'react-router-dom'

import Welcome from './pages/Welcome.jsx'
import BusinessSetup from './pages/BusinessSetup.jsx'
import Settings from './pages/Settings.jsx'
import MainLayout from './layouts/MainLayout.jsx'

import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import Inventory from './pages/Inventory.jsx'
import Sales from './pages/Sales.jsx'
import Transactions from './pages/Transactions.jsx'
import Reports from './pages/Reports.jsx'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/welcome" replace />}
      />

      <Route path="/welcome" element={<Welcome />} />
      <Route path="/setup" element={<BusinessSetup />} />

      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/welcome" replace />}
      />
    </Routes>
  )
}

export default App
