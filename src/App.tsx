import type { ReactNode } from 'react';
import type { BankRole } from './api/types';
import { Navigate, Route, Routes } from 'react-router';
import { CorpLayout } from './layouts/CorpLayout';
import { TerminalLayout } from './layouts/TerminalLayout';
import { useAuth } from './lib/auth-context';
import { AlertsPage } from './pages/corp/AlertsPage';
import { FundPage } from './pages/corp/FundPage';
import { HomePage } from './pages/corp/HomePage';
import { MyInfoPage } from './pages/corp/MyInfoPage';
import { OrderDetailPage } from './pages/corp/OrderDetailPage';
import { OrderNewPage } from './pages/corp/OrderNewPage';
import { OrdersPage } from './pages/corp/OrdersPage';
import { AlertDetailPage } from './pages/bank/loan/AlertDetailPage';
import { EventsPage } from './pages/bank/loan/EventsPage';
import { LoanDashboardPage } from './pages/bank/loan/LoanDashboardPage';
import { LoanDetailPage } from './pages/bank/loan/LoanDetailPage';
import { LoansPage } from './pages/bank/loan/LoansPage';
import { RiskAlertsPage } from './pages/bank/loan/RiskAlertsPage';
import { AuditLogPage } from './pages/bank/ops/AuditLogPage';
import { OpsDashboardPage } from './pages/bank/ops/OpsDashboardPage';
import { SettingsPage } from './pages/bank/ops/SettingsPage';
import { SignupDetailPage } from './pages/bank/ops/SignupDetailPage';
import { SignupApprovalsPage } from './pages/bank/ops/SignupApprovalsPage';
import { TerminalChainPage } from './pages/bank/review/TerminalChainPage';
import { CompanyReviewPage } from './pages/bank/review/CompanyReviewPage';
import { ReviewApplicationsPage } from './pages/bank/review/ReviewApplicationsPage';
import { ReviewDashboardPage } from './pages/bank/review/ReviewDashboardPage';
import { ReviewDetailPage } from './pages/bank/review/ReviewDetailPage';
import { NoticesPage } from './pages/bank/NoticesPage';
import { LoginPage } from './pages/login/LoginPage';
import { SignupPage } from './pages/signup/SignupPage';

function RequireCorp({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.type === 'corp' ? children : <Navigate to="/login" replace />;
}

/** 해당 역할의 은행 직원만 들어올 수 있습니다. */
function RequireBank({ role, children }: { role: BankRole; children: ReactNode }) {
  const { user } = useAuth();
  return user?.type === 'bank' && user.role === role ? (
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
          <RequireBank role="review">
            <TerminalLayout />
          </RequireBank>
        }
      >
        <Route index element={<ReviewDashboardPage />} />
        <Route path="applications" element={<ReviewApplicationsPage />} />
        <Route path="applications/:id" element={<ReviewDetailPage />} />
        <Route path="companies" element={<CompanyReviewPage />} />
        <Route path="chain" element={<TerminalChainPage view="chains" />} />
        <Route path="chain-loans" element={<TerminalChainPage view="loans" />} />
        <Route path="notices" element={<NoticesPage />} />
      </Route>
      <Route
        path="/bank/loan"
        element={
          <RequireBank role="loan">
            <TerminalLayout />
          </RequireBank>
        }
      >
        <Route index element={<LoanDashboardPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="loans/:id" element={<LoanDetailPage />} />
        <Route path="alerts" element={<RiskAlertsPage />} />
        <Route path="alerts/:id" element={<AlertDetailPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="chain" element={<TerminalChainPage />} />
        <Route path="notices" element={<NoticesPage />} />
      </Route>
      <Route
        path="/bank/ops"
        element={
          <RequireBank role="ops">
            <TerminalLayout />
          </RequireBank>
        }
      >
        <Route index element={<OpsDashboardPage />} />
        <Route path="signups" element={<SignupApprovalsPage />} />
        <Route path="signups/:id" element={<SignupDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="logs" element={<AuditLogPage />} />
        <Route path="notices" element={<NoticesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
