import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="mx-auto min-h-screen max-w-[440px] bg-cream-50 text-charcoal-900 shadow-sm flex flex-col">
          <Routes>
            <Route
              path="/t/:token"
              element={
                <div className="flex-1 flex flex-col p-6 items-center justify-center text-center">
                  <h1 className="font-serif text-3xl font-normal text-charcoal-900 tracking-tight">
                    You are here for...
                  </h1>
                  <p className="mt-2 text-sm text-charcoal-500 font-sans">
                    TipTable customer app scaffolded successfully.
                  </p>
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
