import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { PortalLayout } from './layouts/PortalLayout.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { DashboardOverview } from './screens/DashboardOverview.js';
import { RestaurantManagementScreen } from './screens/RestaurantManagementScreen.js';
import { BillingManagementScreen } from './screens/BillingManagementScreen.js';
import { LeadsManagementScreen } from './screens/LeadsManagementScreen.js';
import { SystemHealthScreen } from './screens/SystemHealthScreen.js';
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
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Portal Auth Route (Root & Subdomain-Ready) */}
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/portal/login" element={<LoginScreen />} />

              {/* Protected Platform Staff Routes */}
              <Route path="/" element={<ProtectedRoute />}>
                <Route element={<PortalLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="restaurants" element={<RestaurantManagementScreen />} />
                  <Route path="billing" element={<BillingManagementScreen />} />
                  <Route path="leads" element={<LeadsManagementScreen />} />
                  <Route path="audit" element={<AuditLogScreen />} />
                  <Route path="health" element={<SystemHealthScreen />} />
                </Route>
              </Route>

              {/* Backwards compatibility aliases for /portal/* */}
              <Route path="/portal" element={<Navigate to="/" replace />} />
              <Route path="/portal/restaurants" element={<Navigate to="/restaurants" replace />} />
              <Route path="/portal/billing" element={<Navigate to="/billing" replace />} />
              <Route path="/portal/leads" element={<Navigate to="/leads" replace />} />
              <Route path="/portal/audit" element={<Navigate to="/audit" replace />} />
              <Route path="/portal/health" element={<Navigate to="/health" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
