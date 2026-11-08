import React, { useEffect } from 'react';
import './i18n/index.js';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantProvider } from './context/RestaurantContext.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { StaffScreen } from './screens/StaffScreen.js';
import { AmountScreen } from './screens/AmountScreen.js';
import { PayScreen } from './screens/PayScreen.js';
import { ThanksScreen } from './screens/ThanksScreen.js';
import { NoTokenScreen } from './screens/NoTokenScreen.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const RedirectQrRoute: React.FC = () => {
  const { token, '*': splat } = useParams<{ token: string; '*': string }>();
  const target = splat ? `/t/${token}/${splat}` : `/t/${token}`;
  return <Navigate to={target} replace />;
};

const RestaurantLayout: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const location = useLocation();

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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.99 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col w-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </RestaurantProvider>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="mx-auto min-h-screen max-w-[420px] bg-[#FAFAF9] text-stone-900 sm:border-x sm:border-stone-200/70 shadow-sm flex flex-col font-sans">
          <Routes>
            {/* Direct QR Link: /r/:token -> /t/:token */}
            <Route path="/r/:token/*" element={<RedirectQrRoute />} />
            <Route path="/r/:token" element={<RedirectQrRoute />} />

            <Route path="/t/:token" element={<RestaurantLayout />}>
              <Route index element={<HomeScreen />} />
              <Route path="staff" element={<StaffScreen />} />
              <Route path="staff/:staffId" element={<AmountScreen />} />
              <Route path="staff/:staffId/pay" element={<PayScreen />} />
              <Route path="thanks" element={<ThanksScreen />} />
            </Route>

            {/* Direct visit without token */}
            <Route path="/" element={<NoTokenScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
