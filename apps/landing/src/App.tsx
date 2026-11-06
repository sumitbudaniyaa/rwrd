import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingLayout } from './layouts/LandingLayout.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { LegalScreen } from './screens/LegalScreen.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LandingLayout />}>
          <Route index element={<HomeScreen />} />
          <Route
            path="privacy"
            element={
              <LegalScreen
                title="Privacy Policy"
                subtitle="Digital Personal Data Protection (DPDP) Act Compliance & Non-Custodial Safeguards"
              />
            }
          />
          <Route
            path="terms"
            element={
              <LegalScreen
                title="Terms of Service"
                subtitle="Restaurant SaaS Subscription Terms, Disclaimers, and Zero-Commission Policy"
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
