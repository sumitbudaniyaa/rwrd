import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SecurityCheckIcon,
  StarIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, Badge } from '@tiptable/ui';
import { landingEnv } from '../config/env.js';

export const HomeScreen: React.FC = () => {
  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* 1. Hero Pitch Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <SlideUp delay={0.05}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zero Platform Cut &bull; Direct-to-Staff UPI Tipping</span>
          </div>
        </SlideUp>

        <SlideUp delay={0.1}>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-stone-900 tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Empower your waitstaff.{' '}
            <span className="font-serif italic font-normal text-stone-700 block mt-1">
              Skyrocket 5-star reviews.
            </span>
          </h1>
        </SlideUp>

        <SlideUp delay={0.15}>
          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            TipTable is the non-custodial hospitality platform where diners scan table QR codes, tip
            service staff directly via UPI with{' '}
            <strong className="text-stone-900 font-semibold">0% platform commission</strong>, and
            leave authentic Google reviews.
          </p>
        </SlideUp>

        <SlideUp delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="#demo-form"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Book an In-Person Demo
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </a>
            <a
              href={`${landingEnv.VITE_CUSTOMER_APP_URL}/r/the-bombay-canteen?table=1`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all"
            >
              Test Live Diner Experience &rarr;
            </a>
          </div>
        </SlideUp>

        {/* Hero Invariant Badges */}
        <SlideUp delay={0.25}>
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                className="w-4 h-4 text-emerald-600"
                strokeWidth={1.5}
              />
              <span>0% Tip Commission</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600"
                strokeWidth={1.5}
              />
              <span>Zero App Downloads Needed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={StarIcon} className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              <span>Direct Google Maps Reviews</span>
            </div>
          </div>
        </SlideUp>
      </section>

      {/* 2. Three-Step Flow Preview Anchor */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <Badge variant="neutral">The 3-Step Flow</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Frictionless for diners. Transformational for staff.
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            From table scan to direct bank settlement in under 15 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 01</span>
            <h3 className="text-base font-bold text-stone-900">Scan Table Placard</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Diners point their phone camera at the customized acrylic table placard. The browser
              instantly opens the restaurant greeting without downloading an app.
            </p>
          </div>

          <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 02</span>
            <h3 className="text-base font-bold text-stone-900">Tip Directly via UPI</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Diners pick their server, choose a preset amount (₹20, ₹50, ₹100, ₹200), and tap pay.
              Standard UPI deep link routes funds directly into the staff's private VPA.
            </p>
          </div>

          <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 03</span>
            <h3 className="text-base font-bold text-stone-900">1-Tap 5-Star Review</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Happy diners are seamlessly redirected to your Google Maps review page with pre-filled
              5-star rating intent, completely un-gated for full policy compliance.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Restaurant Benefits Anchor */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <Badge variant="accent">Hospitality Advantages</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Why leading dining establishments choose TipTable
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            Retain top floor staff and outrank competitors on Google Maps search.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">Zero Escrow & Zero Payment Risk</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Because TipTable never holds customer money, restaurants have zero payment gateway
              withholding, no escrow compliance liability, and zero chargeback overhead.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">Cut Waitstaff Attrition by 35%</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Waitstaff earn ₹4,000 to ₹12,000 extra in direct digital tips monthly, deposited
              straight into their bank accounts. Motivated staff stay longer and deliver warmer
              service.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <HugeiconsIcon icon={StarIcon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">Google Review Flywheel</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Capture customer delight at the peak moment of satisfaction. Participating
              establishments see a 3x to 5x surge in weekly verified Google reviews.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Pricing Anchor */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="success">Predictable SaaS Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Simple, transparent, flat monthly pricing
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            Zero setup fees. Zero commission on tips. 14-day free trial.
          </p>
        </div>

        <div className="max-w-md mx-auto p-8 bg-white border-2 border-stone-900 rounded-3xl shadow-lg space-y-6">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-bold text-stone-900">Standard Platform License</h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-extrabold text-stone-900">₹999</span>
              <span className="text-xs font-semibold text-stone-500">/ month per outlet</span>
            </div>
            <p className="text-xs text-stone-400">Billed monthly &bull; Cancel anytime</p>
          </div>

          <ul className="space-y-3 text-xs text-stone-700 pt-2 border-t border-stone-100">
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>0% commission</strong> on all staff tips forever
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>Unlimited waitstaff profiles & table QR placards</span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>Google review redirect acceleration</span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>Real-time restaurant analytics dashboard & CSV export</span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>Printable high-resolution table placard designs (PDF/SVG)</span>
            </li>
          </ul>

          <a
            href="#demo-form"
            className="block text-center w-full py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors shadow-sm"
          >
            Get Started with 14-Day Trial
          </a>
        </div>
      </section>

      {/* 5. Demo Request Form Anchor */}
      <section id="demo-form" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="accent">Schedule Walkthrough</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Request an In-Person or Virtual Demo
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            See how TipTable fits seamlessly into your dining room operations.
          </p>
        </div>

        <div className="p-8 bg-stone-50 border border-stone-200 rounded-3xl">
          <p className="text-xs text-center text-stone-500">
            Demo request form interface will be enhanced in Milestone 5 (M5-T04).
          </p>
        </div>
      </section>

      {/* 6. FAQ Anchor */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="neutral">Frequently Asked Questions</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Common questions from restaurateurs
          </h2>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
            <h4 className="text-sm font-bold text-stone-900">
              Does TipTable take any cut or percentage of customer tips?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              No. TipTable takes exactly 0% commission. When a diner sends ₹100, the staff member
              receives ₹100 directly into their bank account via UPI. TipTable only charges the
              restaurant a flat ₹999/month subscription fee.
            </p>
          </div>

          <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
            <h4 className="text-sm font-bold text-stone-900">
              Is review gating compliant with Google Maps policies?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              TipTable strictly follows Google's Anti-Gating policy. All diners are offered the
              opportunity to leave a Google review regardless of tip status or rating, ensuring 100%
              compliance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
