import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { CorpLayout } from './layouts/CorpLayout';
import { useAuth } from './lib/auth-context';
import { AlertsPage } from './pages/corp/AlertsPage';
import { FundPage } from './pages/corp/FundPage';
import { HomePage } from './pages/corp/HomePage';
import { MyInfoPage } from './pages/corp/MyInfoPage';
import { OrderDetailPage } from './pages/corp/OrderDetailPage';
import { OrderNewPage } from './pages/corp/OrderNewPage';
import { OrdersPage } from './pages/corp/OrdersPage';
import { LoginPage } from './pages/login/LoginPage';
import { SignupPage } from './pages/signup/SignupPage';

function RequireCorp({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.type === 'corp' ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/corp"
        element={
          <RequireCorp>
            <CorpLayout />
          </RequireCorp>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<OrderNewPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="fund" element={<FundPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="me" element={<MyInfoPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
