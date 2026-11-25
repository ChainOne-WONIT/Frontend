import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { BankLayout } from './layouts/BankLayout';
import { CorpLayout } from './layouts/CorpLayout';
import { useAuth } from './lib/auth-context';
import { AlertsPage } from './pages/corp/AlertsPage';
import { FundPage } from './pages/corp/FundPage';
import { HomePage } from './pages/corp/HomePage';
import { MyInfoPage } from './pages/corp/MyInfoPage';
import { OrderDetailPage } from './pages/corp/OrderDetailPage';
import { OrderNewPage } from './pages/corp/OrderNewPage';
import { OrdersPage } from './pages/corp/OrdersPage';
import { ChainPage } from './pages/bank/review/ChainPage';
import { CompanyReviewPage } from './pages/bank/review/CompanyReviewPage';
import { ReviewApplicationsPage } from './pages/bank/review/ReviewApplicationsPage';
import { ReviewDashboardPage } from './pages/bank/review/ReviewDashboardPage';
import { ReviewDetailPage } from './pages/bank/review/ReviewDetailPage';
import { LoginPage } from './pages/login/LoginPage';
import { SignupPage } from './pages/signup/SignupPage';

function RequireCorp({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.type === 'corp' ? children : <Navigate to="/login" replace />;
}

/** 은행 심사 담당만 들어올 수 있습니다. */
function RequireReviewer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.type === 'bank' && user.role === 'review' ? (
    children
  ) : (
    <Navigate to="/login?type=bank" replace />
  );
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
      <Route
        path="/bank/review"
        element={
          <RequireReviewer>
            <BankLayout />
          </RequireReviewer>
        }
      >
        <Route index element={<ReviewDashboardPage />} />
        <Route path="applications" element={<ReviewApplicationsPage />} />
        <Route path="applications/:id" element={<ReviewDetailPage />} />
        <Route path="companies" element={<CompanyReviewPage />} />
        <Route path="chain" element={<ChainPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
