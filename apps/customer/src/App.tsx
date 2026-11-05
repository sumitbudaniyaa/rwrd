import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantProvider } from './context/RestaurantContext.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { StaffScreen } from './screens/StaffScreen.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const RestaurantLayout: React.FC = () => {
  return (
    <RestaurantProvider>
      <Outlet />
    </RestaurantProvider>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="mx-auto min-h-screen max-w-[440px] bg-cream-50 text-charcoal-900 shadow-sm flex flex-col font-sans">
          <Routes>
            <Route path="/t/:token" element={<RestaurantLayout />}>
              <Route index element={<HomeScreen />} />
              <Route path="staff" element={<StaffScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
