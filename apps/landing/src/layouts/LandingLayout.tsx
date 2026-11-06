import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Menu01Icon,
  Cancel01Icon,
  SecurityCheckIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { landingEnv } from '../config/env.js';

export const LandingLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-stone-900 selection:bg-stone-900 selection:text-white">
      {/* Top Compliance Bar */}
      <div className="bg-stone-900 text-stone-300 text-[11px] py-1.5 px-4 text-center flex items-center justify-center gap-2">
        <HugeiconsIcon
          icon={SecurityCheckIcon}
          className="w-3.5 h-3.5 text-emerald-400"
          strokeWidth={1.5}
        />
        <span>
          <strong className="text-white">100% Non-Custodial:</strong> We never touch diner funds or
          take a percentage cut of staff tips.
        </span>
      </div>

      {/* Sticky Main Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm group-hover:scale-105 transition-transform">
              TT
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-stone-900">
              TipTable
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-stone-600">
            <a href="/#how-it-works" className="hover:text-stone-900 transition-colors">
              How It Works
            </a>
            <a href="/#benefits" className="hover:text-stone-900 transition-colors">
              Benefits
            </a>
            <a href="/#pricing" className="hover:text-stone-900 transition-colors">
              Pricing
            </a>
            <a href="/#faq" className="hover:text-stone-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={`${landingEnv.VITE_ADMIN_APP_URL}/login`}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/#demo-form"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-all active:scale-[0.98]"
            >
              Request Demo
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-600 hover:text-stone-900 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <HugeiconsIcon
              icon={mobileMenuOpen ? Cancel01Icon : Menu01Icon}
              className="w-5 h-5"
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-stone-200 bg-white px-4 pt-2 pb-6 space-y-3">
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-stone-700 hover:text-stone-900"
            >
              How It Works
            </a>
            <a
              href="/#benefits"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-stone-700 hover:text-stone-900"
            >
              Benefits
            </a>
            <a
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-stone-700 hover:text-stone-900"
            >
              Pricing
            </a>
            <a
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-stone-700 hover:text-stone-900"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
              <a
                href={`${landingEnv.VITE_ADMIN_APP_URL}/login`}
                className="text-center py-2 text-xs font-semibold text-stone-700 border border-stone-200 rounded-lg"
              >
                Sign In to Restaurant Console
              </a>
              <a
                href="/#demo-form"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg"
              >
                Request Demo
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand Summary */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-white text-stone-900 flex items-center justify-center font-bold text-xs">
                  TT
                </div>
                <span className="font-serif text-lg font-bold text-white tracking-tight">
                  TipTable
                </span>
              </div>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Empowering restaurant service staff with direct, zero-cut UPI tipping while
                accelerating organic 5-star Google review growth.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="/#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="/#benefits" className="hover:text-white transition-colors">
                    Restaurant Benefits
                  </a>
                </li>
                <li>
                  <a href="/#pricing" className="hover:text-white transition-colors">
                    Flat ₹999/mo Pricing
                  </a>
                </li>
                <li>
                  <a href="/#demo-form" className="hover:text-white transition-colors">
                    Book an On-Site Demo
                  </a>
                </li>
              </ul>
            </div>

            {/* Access Portals */}
            <div>
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
                Console Access
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href={`${landingEnv.VITE_ADMIN_APP_URL}/login`}
                    className="hover:text-white transition-colors"
                  >
                    Restaurant Admin Login
                  </a>
                </li>
                <li>
                  <a
                    href={`${landingEnv.VITE_PORTAL_APP_URL}/portal/login`}
                    className="hover:text-white transition-colors"
                  >
                    Platform Operations Portal
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Compliance */}
            <div>
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
                Trust & Compliance
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    DPDP Act Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a href="/#faq" className="hover:text-white transition-colors">
                    Google Review Gating Policy Alignment
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Legal Non-Custodial Disclaimer */}
          <div className="pt-8 border-t border-stone-800 text-[11px] text-stone-500 space-y-2 leading-relaxed">
            <p>
              <strong>Non-Custodial Invariant:</strong> TipTable operates strictly as a technology
              facilitator and communication protocol provider. TipTable never holds, aggregates,
              routes, or exercises custody over diner tips or customer funds. All financial
              transfers occur directly between the diner's personal UPI application and the
              designated waitstaff member's verified Virtual Payment Address (VPA) through standard
              NPCI UPI rails.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-stone-500">
              <p>
                &copy; {new Date().getFullYear()} TipTable Technologies India. All rights reserved.
              </p>
              <p className="mt-2 sm:mt-0">
                Built for hospitality in India &bull; Zero commission forever
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
