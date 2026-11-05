import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantProvider } from './context/RestaurantContext.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { StaffScreen } from './screens/StaffScreen.js';
import { AmountScreen } from './screens/AmountScreen.js';
import { PayScreen } from './screens/PayScreen.js';
import { ThanksScreen } from './screens/ThanksScreen.js';

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
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  // Detect when customer returns to browser tab from UPI app
  useEffect(() => {
    const checkReturnFromUpi = () => {
      try {
        const savedTip = sessionStorage.getItem('tiptable_active_tip');
        if (savedTip && document.visibilityState === 'visible') {
          const parsed = JSON.parse(savedTip);
          // If tip was initiated within the last 15 minutes, advance to thanks screen
          if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
            navigate(`/t/${token}/thanks`, { state: parsed, replace: true });
          }
        }
      } catch {
        // Ignore
      }
    };

    document.addEventListener('visibilitychange', checkReturnFromUpi);
    window.addEventListener('pageshow', checkReturnFromUpi);

    return () => {
      document.removeEventListener('visibilitychange', checkReturnFromUpi);
      window.removeEventListener('pageshow', checkReturnFromUpi);
    };
  }, [token, navigate]);

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
              <Route path="staff/:staffId" element={<AmountScreen />} />
              <Route path="staff/:staffId/pay" element={<PayScreen />} />
              <Route path="thanks" element={<ThanksScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
