import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { ProtectedRoute, AuthInitializer } from './components';
import { MainLayout } from './components/layouts/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import {
  WarehousesPage,
  ZonesPage,
  ProductsPage,
  CategoriesPage,
  SuppliersPage,
  CustomersPage,
} from './pages/master-data';
import { ReceiptsPage } from './pages/operations/ReceiptsPage';
import { IssuesPage } from './pages/operations/IssuesPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { UsersPage } from './pages/users/UsersPage';
import { ProfilePage } from './pages/users/ProfilePage';

function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        },
      }}
    >
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Master Data */}
              <Route path="/warehouses" element={<WarehousesPage />} />
              <Route path="/zones" element={<ZonesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/customers" element={<CustomersPage />} />

              {/* Operations */}
              <Route path="/receipts" element={<ReceiptsPage />} />
              <Route path="/issues" element={<IssuesPage />} />

              {/* Inventory */}
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/stock-summary" element={<InventoryPage />} />
              <Route path="/inventory/transactions" element={<InventoryPage />} />

              {/* Analytics - reuse Dashboard */}
              <Route path="/analytics/reports" element={<DashboardPage />} />
              <Route path="/analytics/kpis" element={<DashboardPage />} />

              {/* Users */}
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
