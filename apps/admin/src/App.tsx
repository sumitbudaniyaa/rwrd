import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { MfaChallengeScreen } from './screens/MfaChallengeScreen.js';
import { DashboardOverview } from './screens/DashboardOverview.js';
import { StaffManagementScreen } from './screens/StaffManagementScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { QrManagementScreen } from './screens/QrManagementScreen.js';
import { AnalyticsScreen } from './screens/AnalyticsScreen.js';
import { AuditLogScreen } from './screens/AuditLogScreen.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes (Root & Subdomain-Ready) */}
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/admin/login" element={<LoginScreen />} />
            <Route path="/mfa" element={<MfaChallengeScreen />} />
            <Route path="/admin/mfa" element={<MfaChallengeScreen />} />

            {/* Protected Admin Routes - Clean Root Routes */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="staff" element={<StaffManagementScreen />} />
                <Route path="qr" element={<QrManagementScreen />} />
                <Route path="analytics" element={<AnalyticsScreen />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="audit" element={<AuditLogScreen />} />
              </Route>
            </Route>

            {/* Backwards compatibility aliases for /admin/* */}
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/admin/staff" element={<Navigate to="/staff" replace />} />
            <Route path="/admin/qr" element={<Navigate to="/qr" replace />} />
            <Route path="/admin/analytics" element={<Navigate to="/analytics" replace />} />
            <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
            <Route path="/admin/audit" element={<Navigate to="/audit" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
