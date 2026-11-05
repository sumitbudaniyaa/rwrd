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
            {/* Public Auth Routes */}
            <Route path="/admin/login" element={<LoginScreen />} />
            <Route path="/admin/mfa" element={<MfaChallengeScreen />} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="staff" element={<StaffManagementScreen />} />
                <Route
                  path="qr"
                  element={
                    <div className="p-6 bg-white border border-stone-200 rounded-2xl">
                      <h2 className="text-lg font-semibold text-stone-900">QR Management</h2>
                      <p className="text-xs text-stone-500 mt-1">
                        Generate and rotate table QR tokens.
                      </p>
                    </div>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <div className="p-6 bg-white border border-stone-200 rounded-2xl">
                      <h2 className="text-lg font-semibold text-stone-900">Analytics</h2>
                      <p className="text-xs text-stone-500 mt-1">
                        Scans, staff views, and tips initiated.
                      </p>
                    </div>
                  }
                />
                <Route path="settings" element={<SettingsScreen />} />
                <Route
                  path="audit"
                  element={
                    <div className="p-6 bg-white border border-stone-200 rounded-2xl">
                      <h2 className="text-lg font-semibold text-stone-900">Audit Log</h2>
                      <p className="text-xs text-stone-500 mt-1">
                        Account activity and changes history.
                      </p>
                    </div>
                  }
                />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
