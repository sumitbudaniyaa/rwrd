import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const ProtectedRoute: React.FC<{ allowUnpaid?: boolean }> = ({ allowUnpaid = false }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-stone-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isPrefixed = location.pathname.startsWith('/admin');
    return (
      <Navigate to={isPrefixed ? '/admin/login' : '/login'} state={{ from: location }} replace />
    );
  }

  const isPrefixed = location.pathname.startsWith('/admin');
  const paymentPath = isPrefixed ? '/admin/onboarding/payment' : '/onboarding/payment';

  // If user has not completed plan payment, strictly gate access and redirect to payment screen
  if (user && user.hasActivePlan === false) {
    if (!allowUnpaid && location.pathname !== paymentPath) {
      return <Navigate to={paymentPath} replace />;
    }
  }

  // If user already has an active plan and tries to visit payment wall, send to dashboard
  if (user && user.hasActivePlan === true && location.pathname === paymentPath) {
    return <Navigate to={isPrefixed ? '/admin' : '/'} replace />;
  }

  return <Outlet />;
};
