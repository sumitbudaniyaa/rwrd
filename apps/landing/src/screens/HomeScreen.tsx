import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SecurityCheckIcon,
  StarIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  UserGroupIcon,
  Shield01Icon,
  Store01Icon,
  QrCodeIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, Badge } from '@tiptable/ui';
import { landingEnv } from '../config/env.js';
import { InteractiveFlowDemo } from '../components/InteractiveFlowDemo.js';
import { PricingCalculator } from '../components/PricingCalculator.js';
import { FaqAccordion } from '../components/FaqAccordion.js';
import { DemoRequestForm } from '../components/DemoRequestForm.js';

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

      {/* 2. Interactive Flow Demo Simulator Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SlideUp delay={0.3}>
          <InteractiveFlowDemo />
        </SlideUp>
      </section>

      {/* 3. Three-Step Flow Section */}
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
          <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 hover:border-stone-300 transition-colors">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 01</span>
            <h3 className="text-base font-bold text-stone-900">Scan Table Placard</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Diners point their standard phone camera at the customized acrylic table placard. The
              browser instantly opens the restaurant greeting without downloading an app or signing
              in.
            </p>
          </div>

          <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 hover:border-stone-300 transition-colors">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 02</span>
            <h3 className="text-base font-bold text-stone-900">Tip Directly via UPI</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Diners pick their server, choose a preset amount (₹20, ₹50, ₹100, ₹200), and tap pay.
              Standard NPCI UPI deep link routes funds directly into the staff's private VPA.
            </p>
          </div>

          <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 hover:border-stone-300 transition-colors">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 03</span>
            <h3 className="text-base font-bold text-stone-900">1-Tap 5-Star Review</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Happy diners are seamlessly redirected to your Google Maps review page with pre-filled
              5-star rating intent, completely un-gated for full Google policy compliance.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Restaurant Benefits Grid */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <Badge variant="accent">Hospitality Advantages</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Why leading dining establishments choose TipTable
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            Retain top floor staff, eliminate cash handling headaches, and outrank competitors on
            Google Maps search.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2.5 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">
              Zero Escrow & Zero Payment Liability
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Because TipTable never touches customer money, restaurants have zero payment gateway
              withholding, no escrow compliance liability, and zero chargeback overhead.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2.5 hover:shadow-sm transition-all">
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

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2.5 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <HugeiconsIcon icon={StarIcon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">Google Review Flywheel</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Capture customer delight at the peak moment of satisfaction. Participating
              establishments see a 3x to 5x surge in weekly verified Google reviews.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2.5 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
              <HugeiconsIcon icon={Store01Icon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">100% Tax & Legal Cleanliness</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Tips flow peer-to-peer from diner to waiter VPA. The restaurant's books remain
              completely clean of tip accounting, GST liabilities, or pooled fund disputes.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2.5 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">AES-256-GCM Encrypted VPAs</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Staff VPAs are never exposed in bulk listings or public HTML. All account identifiers
              are stored encrypted at rest with hardware-accelerated AES-256-GCM.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2.5 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <HugeiconsIcon icon={QrCodeIcon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-sm font-bold text-stone-900">
              High-Res Placards & Granular Analytics
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Generate ready-to-print SVG and PDF placards for every table. Track scans, tip
              intents, and review conversions per dining area and service shift.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Pricing Section & ROI Calculator */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <Badge variant="success">Predictable SaaS Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Simple, transparent, flat monthly pricing
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            Zero setup fees. Zero commission on tips. 14-day free trial on all features.
          </p>
        </div>

        <PricingCalculator />
      </section>

      {/* 6. Demo Request Form Anchor */}
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

        <DemoRequestForm />
      </section>

      {/* 7. FAQ Accordion Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="neutral">Frequently Asked Questions</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Common questions from restaurateurs
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            Everything you need to know about our non-custodial architecture, RBI compliance, and
            operational setup.
          </p>
        </div>

        <FaqAccordion />
      </section>
    </div>
  );
};
