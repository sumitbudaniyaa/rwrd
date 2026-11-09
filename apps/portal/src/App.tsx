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
              {/* Public Portal Auth Route */}
              <Route path="/portal/login" element={<LoginScreen />} />

              {/* Protected Platform Staff Routes */}
              <Route path="/portal" element={<ProtectedRoute />}>
                <Route element={<PortalLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="restaurants" element={<RestaurantManagementScreen />} />
                  <Route path="billing" element={<BillingManagementScreen />} />
                  <Route path="leads" element={<LeadsManagementScreen />} />
                  <Route
                    path="audit"
                    element={
                      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                          Platform Global Audit Log
                        </h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Cross-tenant and platform-level tamper-evident event stream.
                        </p>
                      </div>
                    }
                  />
                  <Route path="health" element={<SystemHealthScreen />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/portal" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
