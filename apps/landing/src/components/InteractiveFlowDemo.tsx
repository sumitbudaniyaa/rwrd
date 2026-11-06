import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  QrCodeIcon,
  CheckmarkCircle02Icon,
  StarIcon,
  SecurityCheckIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';

type DemoStep = 1 | 2 | 3;

export const InteractiveFlowDemo: React.FC = () => {
  const [step, setStep] = useState<DemoStep>(1);
  const [selectedStaff, setSelectedStaff] = useState('Ramesh Kumar');
  const [selectedAmount, setSelectedAmount] = useState(100);

  return (
    <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-10 border border-stone-800 shadow-2xl max-w-5xl mx-auto overflow-hidden">
      {/* Demo Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6 mb-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Interactive Experience Simulator
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Test the Diner Scan-to-Tip Journey
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            See how diners complete UPI tips and Google reviews in under 15 seconds.
          </p>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-2 bg-stone-800 p-1 rounded-xl shrink-0">
          {[
            { s: 1 as DemoStep, label: '1. Scan Placard' },
            { s: 2 as DemoStep, label: '2. Pick Tip' },
            { s: 3 as DemoStep, label: '3. UPI & Review' },
          ].map((item) => (
            <button
              key={item.s}
              type="button"
              onClick={() => setStep(item.s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                step === item.s
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Step Narrative & Features */}
        <div className="lg:col-span-5 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-stone-500">STEP 1 OF 3</span>
              <h4 className="text-lg font-bold text-white">Acrylic Table Placard</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Every dining table gets a tamper-resistant placard with a dedicated QR code. Diners
                simply scan with their standard phone camera—no native app downloads or account
                logins required.
              </p>
              <ul className="text-xs text-stone-400 space-y-2">
                <li className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="w-4 h-4 text-emerald-400"
                    strokeWidth={1.5}
                  />
                  <span>Instant web app load (&lt;1s on 4G)</span>
                </li>
                <li className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="w-4 h-4 text-emerald-400"
                    strokeWidth={1.5}
                  />
                  <span>Branded restaurant logo and welcome message</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-stone-900 hover:bg-stone-100 font-semibold text-xs rounded-xl shadow-md transition-colors"
              >
                Scan Table QR Placard &rarr;
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-stone-500">STEP 2 OF 3</span>
              <h4 className="text-lg font-bold text-white">Select Server & Amount</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                The diner sees active floor waitstaff and pre-configured tip denominations (₹50,
                ₹100, ₹200). 100% of the funds go straight to the server—rwrd deducts ₹0 commission.
              </p>
              <ul className="text-xs text-stone-400 space-y-2">
                <li className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={SecurityCheckIcon}
                    className="w-4 h-4 text-emerald-400"
                    strokeWidth={1.5}
                  />
                  <span>Encrypted staff VPAs (AES-256-GCM)</span>
                </li>
                <li className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="w-4 h-4 text-emerald-400"
                    strokeWidth={1.5}
                  />
                  <span>Customizable tip presets & min/max bounds</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-stone-900 hover:bg-stone-100 font-semibold text-xs rounded-xl shadow-md transition-colors"
              >
                Trigger Direct UPI Pay &rarr;
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-stone-500">STEP 3 OF 3</span>
              <h4 className="text-lg font-bold text-white">Direct Transfer & Review Flywheel</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Standard UPI deep link opens diner’s preferred app (Google Pay, PhonePe, Paytm).
                Upon completion, diners are redirected seamlessly to your Google review page.
              </p>
              <ul className="text-xs text-stone-400 space-y-2">
                <li className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={StarIcon}
                    className="w-4 h-4 text-amber-400"
                    strokeWidth={1.5}
                  />
                  <span>Direct 5-star Google review acceleration</span>
                </li>
                <li className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="w-4 h-4 text-emerald-400"
                    strokeWidth={1.5}
                  />
                  <span>100% compliant with Google Anti-Gating policy</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white hover:bg-stone-700 font-semibold text-xs rounded-xl transition-colors border border-stone-700"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                Replay Flow
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Simulated Phone Device */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-[300px] sm:w-[320px] bg-stone-950 rounded-[40px] p-3.5 border-4 border-stone-700 shadow-2xl relative">
            {/* Phone Speaker Notch */}
            <div className="w-24 h-4 bg-stone-800 rounded-full mx-auto mb-3" />

            {/* Phone Screen Canvas */}
            <div className="bg-white text-stone-900 rounded-[30px] p-5 h-[440px] flex flex-col justify-between overflow-hidden shadow-inner text-xs">
              {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-sm">
                    TT
                  </div>
                  <div>
                    <h5 className="font-serif text-base font-bold text-stone-900">
                      The Bombay Canteen
                    </h5>
                    <p className="text-[11px] text-stone-400 font-medium">
                      Table 12 &bull; Indiranagar
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <HugeiconsIcon
                      icon={QrCodeIcon}
                      className="w-24 h-24 text-stone-900 mx-auto"
                      strokeWidth={1.5}
                    />
                    <p className="text-[10px] text-stone-500 font-mono mt-1">
                      Scan to tip your server
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-2 bg-stone-900 text-white font-semibold rounded-xl text-xs hover:bg-stone-800"
                  >
                    Simulate Scan &rarr;
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="font-serif font-bold text-stone-900">Table 12</span>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                        0% Fee
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-stone-700 mt-2">
                      Who took care of your table?
                    </p>
                  </div>

                  {/* Staff Selection */}
                  <div className="space-y-1.5">
                    {['Ramesh Kumar', 'Ananya Sen'].map((name) => (
                      <div
                        key={name}
                        onClick={() => setSelectedStaff(name)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedStaff === name
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                        }`}
                      >
                        <span className="font-semibold text-xs">{name}</span>
                        <span className="text-[10px] opacity-80">Server</span>
                      </div>
                    ))}
                  </div>

                  {/* Amount Selection */}
                  <div>
                    <p className="text-[11px] font-semibold text-stone-700 mb-1.5">
                      Select tip amount:
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[50, 100, 200].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSelectedAmount(amt)}
                          className={`py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                            selectedAmount === amt
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                  >
                    Pay ₹{selectedAmount} via UPI &rarr;
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="flex-1 flex flex-col justify-between text-center space-y-3 py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="w-6 h-6"
                      strokeWidth={1.5}
                    />
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-stone-900">
                      ₹{selectedAmount} Tip Initiated!
                    </h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Directly into {selectedStaff}&apos;s verified UPI account.
                    </p>
                  </div>

                  {/* Review Prompt Card */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                    <div className="flex justify-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <HugeiconsIcon
                          key={s}
                          icon={StarIcon}
                          className="w-3.5 h-3.5 fill-current"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-bold text-stone-900">
                      Enjoyed your meal at The Bombay Canteen?
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Tap below to share a 5-star Google review!
                    </p>
                  </div>

                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-stone-900 text-white font-semibold rounded-xl text-xs hover:bg-stone-800"
                  >
                    Open Google Review &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
