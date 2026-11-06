import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Calculator01Icon,
  Coins01Icon,
  StarIcon,
  Shield01Icon,
} from '@hugeicons/core-free-icons';

export const PricingCalculator: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [tableCount, setTableCount] = useState<number>(20);
  const [coversPerTable, setCoversPerTable] = useState<number>(12);
  const [avgTipAmount, setAvgTipAmount] = useState<number>(75);
  const [tipRate, setTipRate] = useState<number>(18); // 18% of covers initiate a tip

  // Calculations
  const dailyCovers = tableCount * coversPerTable;
  const monthlyCovers = dailyCovers * 30;
  const monthlyTipsInitiated = Math.round(monthlyCovers * (tipRate / 100));
  const estimatedStaffEarnings = monthlyTipsInitiated * avgTipAmount;
  // Estimated review growth: ~35% of tippers proceed to leave an un-gated 5-star Google review
  const estimatedReviewsGained = Math.round(monthlyTipsInitiated * 0.35);

  // Platform cost
  const monthlyCost = billingCycle === 'annual' ? 832.5 : 999;
  const totalBilled = billingCycle === 'annual' ? 9990 : 999;

  // Comparison: legacy 3% commission gateway cut
  const legacyCommissionCost = Math.round(estimatedStaffEarnings * 0.03);

  return (
    <div className="space-y-12">
      {/* Billing Switch */}
      <div className="flex justify-center items-center gap-3">
        <span
          className={`text-xs font-semibold cursor-pointer ${
            billingCycle === 'monthly' ? 'text-stone-900' : 'text-stone-400'
          }`}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly Billing
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={billingCycle === 'annual'}
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
            billingCycle === 'annual' ? 'bg-emerald-600' : 'bg-stone-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              billingCycle === 'annual' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => setBillingCycle('annual')}
        >
          <span
            className={`text-xs font-semibold ${
              billingCycle === 'annual' ? 'text-stone-900' : 'text-stone-400'
            }`}
          >
            Annual Billing
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 rounded-full">
            Save 17% (2 Mo Free)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive ROI Estimator */}
        <div className="lg:col-span-7 bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <HugeiconsIcon icon={Calculator01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Restaurant ROI & Impact Calculator
              </h3>
              <p className="text-xs text-stone-500">
                Adjust table metrics to calculate projected staff earnings and Google reviews.
              </p>
            </div>
          </div>

          <div className="space-y-5 pt-2">
            {/* Slider 1: Dining Tables */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-stone-700">
                <span>Active Dining Tables:</span>
                <span className="font-bold text-stone-900 font-mono">{tableCount} Tables</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                aria-label="Active Dining Tables"
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>5 tables</span>
                <span>50 tables</span>
                <span>100 tables</span>
              </div>
            </div>

            {/* Slider 2: Daily Covers per table */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-stone-700">
                <span>Average Daily Covers per Table:</span>
                <span className="font-bold text-stone-900 font-mono">{coversPerTable} Diners</span>
              </div>
              <input
                type="range"
                min="4"
                max="30"
                step="1"
                aria-label="Average Daily Covers per Table"
                value={coversPerTable}
                onChange={(e) => setCoversPerTable(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>4 diners</span>
                <span>15 diners</span>
                <span>30 diners</span>
              </div>
            </div>

            {/* Slider 3: Average Tip Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-stone-700">
                <span>Average Diner Tip:</span>
                <span className="font-bold text-stone-900 font-mono">₹{avgTipAmount}</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                aria-label="Average Diner Tip"
                value={avgTipAmount}
                onChange={(e) => setAvgTipAmount(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>₹20</span>
                <span>₹100</span>
                <span>₹250</span>
              </div>
            </div>

            {/* Slider 4: Tip Conversion Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-stone-700">
                <span>Diner Tip Initiation Rate:</span>
                <span className="font-bold text-stone-900 font-mono">{tipRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                aria-label="Diner Tip Initiation Rate"
                value={tipRate}
                onChange={(e) => setTipRate(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>5% conservative</span>
                <span>18% avg</span>
                <span>40% high</span>
              </div>
            </div>
          </div>

          {/* Results Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <HugeiconsIcon icon={Coins01Icon} className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monthly Staff Tips</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                ₹{estimatedStaffEarnings.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">
                100% direct to staff bank accounts &bull; ₹0 deducted
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <HugeiconsIcon icon={StarIcon} className="w-3.5 h-3.5 text-amber-500" />
                <span>Google 5-Star Reviews</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                +{estimatedReviewsGained.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-stone-500">/ mo</span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">
                Un-gated organic reviews directly on Google Maps
              </p>
            </div>
          </div>

          {/* Zero Custody Callout */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
            <HugeiconsIcon
              icon={Shield01Icon}
              className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
            />
            <div>
              <strong>Savings vs Legacy 3% Commission Models:</strong> You save{' '}
              <span className="font-bold underline">
                ₹{legacyCommissionCost.toLocaleString('en-IN')}/month
              </span>{' '}
              that traditional payment aggregators or escrow middlemen would skim off your
              staff&apos;s hard-earned tips.
            </div>
          </div>
        </div>

        {/* Right: Flat SaaS Pricing Card */}
        <div className="lg:col-span-5 bg-white border-2 border-stone-900 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="inline-block px-2.5 py-1 bg-stone-100 text-stone-800 text-[10px] font-bold uppercase tracking-wider rounded-md">
              Flat Transparent SaaS
            </div>
            <h3 className="text-xl font-bold text-stone-900">Standard Platform License</h3>
            <p className="text-xs text-stone-500">
              One predictable subscription for your entire outlet. No hidden surprises.
            </p>
          </div>

          <div className="flex items-baseline gap-1.5 pb-4 border-b border-stone-100">
            <span className="text-4xl sm:text-5xl font-black text-stone-900">
              ₹{Math.round(monthlyCost).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold text-stone-500">/ month per outlet</span>
          </div>

          <div className="text-xs text-stone-600 space-y-1">
            {billingCycle === 'annual' ? (
              <p className="text-emerald-700 font-semibold">
                Billed annually at ₹{totalBilled.toLocaleString('en-IN')} (saves ₹1,998/year)
              </p>
            ) : (
              <p className="text-stone-500">Billed monthly &bull; Cancel anytime with 1 click</p>
            )}
            <p className="text-[11px] text-stone-400">Includes 14-day free trial on all features</p>
          </div>

          <ul className="space-y-3 text-xs text-stone-700">
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>0% commission on tips</strong> &bull; Direct diner-to-staff UPI
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>Unlimited tables & placards</strong> (vector SVG & PDF exports)
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>Unlimited waitstaff profiles</strong> with AES-256 encrypted VPAs
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>Google Reviews Flywheel</strong> &bull; 100% anti-gating compliant
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>Realtime Analytics & Shift Leaderboard</strong>
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={1.5}
              />
              <span>
                <strong>Zero hardware required</strong> &bull; Works alongside any POS
              </span>
            </li>
          </ul>

          <div className="pt-2">
            <a
              href="#demo-form"
              className="block w-full text-center py-3.5 px-4 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              Start 14-Day Free Trial
            </a>
            <p className="text-center text-[10px] text-stone-400 mt-2">
              No credit card required upfront &bull; Setup in under 15 mins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
