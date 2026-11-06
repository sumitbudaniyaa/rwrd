import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Shield01Icon,
  Legal01Icon,
  CheckmarkCircle02Icon,
  LockIcon,
  Mail01Icon,
} from '@hugeicons/core-free-icons';

export interface LegalScreenProps {
  title?: string;
  subtitle?: string;
}

export const LegalScreen: React.FC<LegalScreenProps> = () => {
  const location = useLocation();
  const isTerms = location.pathname.includes('/terms');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10">
      {/* Tab Switcher Header */}
      <div className="space-y-4 border-b border-stone-200 pb-6">
        <div className="flex items-center gap-2">
          <Link
            to="/privacy"
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              !isTerms
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
            }`}
          >
            <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Privacy Policy (DPDP Act)</span>
          </Link>
          <Link
            to="/terms"
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              isTerms
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
            }`}
          >
            <HugeiconsIcon icon={Legal01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Terms of Service (Non-Custodial)</span>
          </Link>
        </div>

        {isTerms ? (
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Terms of Service & Non-Custodial Facilitator Agreement
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1.5">
              Governing use of the TipTable platform, flat SaaS subscription terms, 0% tip cut
              guarantee, and P2P UPI execution.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-stone-400 mt-2">
              <span>Effective Date: November 6, 2026</span>
              <span>&bull;</span>
              <span>Jurisdiction: Bengaluru, India</span>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Privacy Policy & DPDP Act 2023 Compliance
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1.5">
              Exhaustive disclosure of our non-custodial architecture, zero-diner-tracking data
              minimization, and AES-256-GCM encrypted waitstaff VPAs.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-stone-400 mt-2">
              <span>Effective Date: November 6, 2026</span>
              <span>&bull;</span>
              <span>Governing Law: Digital Personal Data Protection Act 2023</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Legal Content */}
      {isTerms ? (
        /* TERMS OF SERVICE CONTENT */
        <article className="space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">1.</span>
              The 100% Non-Custodial Architecture Invariant
            </h2>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
              <p className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="w-4 h-4 text-emerald-700 shrink-0"
                />
                Zero Escrow, Zero Money Transmission, Zero Custody
              </p>
              <p className="text-xs text-emerald-900 leading-relaxed">
                TipTable Hospitality Technologies Private Limited (&ldquo;TipTable&rdquo;) is an
                information technology provider and digital directory interface. TipTable is NOT a
                bank, non-banking financial company (NBFC), payment aggregator (PA), payment gateway
                (PG), prepaid payment instrument (PPI) issuer, or money transmission business under
                the Reserve Bank of India (RBI) regulations.
              </p>
            </div>
            <p>
              TipTable never touches, holds, pools, settles, or routes customer tip funds through
              any corporate, escrow, or nodal bank account. When a diner initiates a gratuity,
              TipTable constructs a standardized NPCI UPI deep link (
              <code className="text-[11px] bg-stone-100 px-1 py-0.5 rounded font-mono">
                upi://pay?pa=...
              </code>
              ). The payment transaction executes entirely peer-to-peer (P2P) between the
              diner&apos;s UPI app and the waitstaff member&apos;s personal bank account.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">2.</span>
              Zero Commission Policy on Staff Gratuities
            </h2>
            <p>
              TipTable guarantees a <strong>0.00% commission rate</strong> on all gratuities paid by
              diners to waitstaff. Unlike conventional payment aggregators or tipping apps that
              charge 2% to 5% plus per-transaction interchange fees, TipTable retains exactly ₹0
              from diner tips. Staff receive 100% of the funds transferred by customers directly
              into their bank accounts.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">3.</span>
              SaaS Subscription Fees & Billing
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>
                <strong>Monthly SaaS License:</strong> ₹999 per outlet/month billed monthly, or
                ₹9,990/year billed annually (includes 2 months free).
              </li>
              <li>
                <strong>14-Day Zero-Risk Trial:</strong> New restaurant outlets receive an
                uninhibited 14-day free trial without requiring credit card or payment authorization
                upfront.
              </li>
              <li>
                <strong>7-Day Grace Period:</strong> In the event of an overdue invoice, restaurant
                outlets are granted a 7-calendar-day grace period. Inactive accounts beyond the
                grace period are automatically suspended without data loss.
              </li>
              <li>
                <strong>Cancellation:</strong> Subscriptions may be cancelled at any time through
                the Admin Console without lock-in contracts or penalty fees.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">4.</span>
              Restaurant Partner Obligations & Warranties
            </h2>
            <p>
              As a restaurant subscriber (&ldquo;Partner&rdquo;), you represent and warrant that:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-stone-600">
              <li>
                All Virtual Payment Addresses (VPAs) registered for staff members belong to the
                respective employees and have been provided with their voluntary, informed consent.
              </li>
              <li>
                The restaurant will not withhold, offset, levy management fees, or redirect tips
                intended for waitstaff into management or restaurant accounts.
              </li>
              <li>
                Placard QR codes displayed on dining tables will remain unaltered and correspond to
                the authorized tables assigned in the Admin Console.
              </li>
            </ol>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">5.</span>
              Google Maps Anti-Gating Compliance
            </h2>
            <p>
              TipTable strictly abides by Google Maps user-generated content policies prohibiting
              review gating. TipTable provides an un-gated, unfiltered redirect to the
              restaurant&apos;s public Google Maps review listing. Neither the restaurant nor
              TipTable screens, filters, incentivizes, or conditions review submission based on
              positive or negative diner sentiment.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">6.</span>
              Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p className="text-stone-600">
              TipTable provides the service &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
              Because UPI payment confirmation and execution occur out-of-band in third-party
              banking apps (e.g., Google Pay, PhonePe, Paytm, BHIM), TipTable shall not be liable
              for bank server outages, NPCI latency, or failed bank settlements. In no event shall
              TipTable&apos;s cumulative liability exceed the total subscription fees paid by the
              restaurant in the three (3) months preceding the claim.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">7.</span>
              Governing Law & Dispute Resolution
            </h2>
            <p className="text-stone-600">
              These Terms are governed by and construed in accordance with the laws of the Republic
              of India. Any disputes arising out of or in connection with these Terms shall be
              subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka,
              India.
            </p>
          </section>
        </article>
      ) : (
        /* PRIVACY POLICY CONTENT (DPDP ACT 2023) */
        <article className="space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">1.</span>
              Data Fiduciary & Digital Personal Data Protection (DPDP) Act 2023
            </h2>
            <p>
              TipTable Hospitality Technologies Private Limited (&ldquo;TipTable&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates as a <strong>Data Fiduciary</strong>{' '}
              under the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;). This
              Privacy Policy explains how personal data of restaurant personnel (&ldquo;Staff Data
              Principals&rdquo;), administrators (&ldquo;Admin Data Principals&rdquo;), and diners
              (&ldquo;Customer Data Principals&rdquo;) is collected, processed, and safeguarded.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">2.</span>
              Diner Data Minimization: Zero Account, Zero Tracking
            </h2>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
              <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                Complete Anonymity for Diners:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600 text-xs">
                <li>
                  <strong>No Account Required:</strong> Diners scan a table QR code and interact
                  with TipTable without registering an account, providing a phone number, or
                  entering an email address.
                </li>
                <li>
                  <strong>Zero Tracking Cookies:</strong> TipTable does not use persistent tracking
                  cookies, cross-site trackers, or advertising pixels on customer-facing screens.
                </li>
                <li>
                  <strong>Ephemeral Sessions:</strong> Table QR tokens are strictly validated for
                  active dining sessions. When a diner clicks a tip preset, TipTable hands off to
                  the native UPI application immediately.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">3.</span>
              Cryptographic Security & AES-256-GCM Encryption
            </h2>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <HugeiconsIcon icon={LockIcon} className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-emerald-950">
                <p className="font-semibold text-xs sm:text-sm">
                  Staff VPAs Encrypted at Rest (AES-256-GCM)
                </p>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Waitstaff UPI Virtual Payment Addresses (VPAs) are stored encrypted at rest using
                  industry-standard AES-256-GCM authenticated encryption. Staff VPAs are never
                  exposed in bulk directory APIs, never leaked to third parties, and only decrypted
                  in-memory for individual, rate-limited tip intent requests.
                </p>
              </div>
            </div>
            <p>
              Administrator credentials are safeguarded using Argon2id password hashing with custom
              memory/time parameters, and Time-Based One-Time Password (TOTP) two-factor
              authentication secrets are encrypted at rest with dedicated cryptographic keys.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">4.</span>
              Data Retention & Automated Audit Logging
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>
                <strong>Audit Logs:</strong> Administrative and platform actions (staff creation,
                VPA updates, role modifications, tenant onboarding) are recorded in tamper-evident
                audit logs and retained for exactly 180 days for security anomaly detection before
                automated purging.
              </li>
              <li>
                <strong>Staff Data:</strong> Retained for the duration of the restaurant&apos;s
                active subscription. Upon staff deactivation or restaurant termination, staff
                records and encrypted VPAs are soft-deleted and permanently erased following the
                statutory 30-day retention window.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">5.</span>
              Rights of Data Principals under DPDP Act 2023
            </h2>
            <p>Every Data Principal possesses the following statutory rights:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">Right to Access</span>
                <p className="text-[11px] text-stone-500">
                  Request a summary of your personal data processed by TipTable.
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">
                  Right to Correction & Erasure
                </span>
                <p className="text-[11px] text-stone-500">
                  Request rectification of inaccurate data or deletion of personal data.
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">
                  Right of Grievance Redressal
                </span>
                <p className="text-[11px] text-stone-500">
                  Register grievances directly with our Data Protection Officer.
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">Right to Nominate</span>
                <p className="text-[11px] text-stone-500">
                  Nominate an individual to exercise rights on your behalf in case of incapacity.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">6.</span>
              Grievance Redressal & Data Protection Officer (DPO)
            </h2>
            <p>
              In accordance with the DPDP Act 2023, TipTable has designated a dedicated Grievance
              Redressal Officer:
            </p>
            <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
                  <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                    Ananya Deshmukh &bull; Grievance Redressal Officer
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    TipTable Hospitality Technologies Private Limited
                  </p>
                </div>
              </div>
              <div className="text-xs text-stone-600 space-y-1 pl-10">
                <p>
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:grievance@tiptable.in"
                    className="text-stone-900 underline font-semibold"
                  >
                    grievance@tiptable.in
                  </a>
                </p>
                <p>
                  <strong>Physical Address:</strong> 4th Floor, Salarpuria Horizon, 100 Feet Road,
                  HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038, India
                </p>
                <p className="text-[11px] text-stone-400 pt-1">
                  SLA: Inquiries acknowledged within 24 hours; resolved within 7 business days.
                </p>
              </div>
            </div>
          </section>
        </article>
      )}

      {/* Main Legal Content */}
      {isTerms ? (
        /* TERMS OF SERVICE CONTENT */
        <article className="space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">1.</span>
              The 100% Non-Custodial Architecture Invariant
            </h2>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
              <p className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="w-4 h-4 text-emerald-700 shrink-0"
                />
                Zero Escrow, Zero Money Transmission, Zero Custody
              </p>
              <p className="text-xs text-emerald-900 leading-relaxed">
                TipTable Hospitality Technologies Private Limited (&ldquo;TipTable&rdquo;) is an
                information technology provider and digital directory interface. TipTable is NOT a
                bank, non-banking financial company (NBFC), payment aggregator (PA), payment gateway
                (PG), prepaid payment instrument (PPI) issuer, or money transmission business under
                the Reserve Bank of India (RBI) regulations.
              </p>
            </div>
            <p>
              TipTable never touches, holds, pools, settles, or routes customer tip funds through
              any corporate, escrow, or nodal bank account. When a diner initiates a gratuity,
              TipTable constructs a standardized NPCI UPI deep link (
              <code className="text-[11px] bg-stone-100 px-1 py-0.5 rounded font-mono">
                upi://pay?pa=...
              </code>
              ). The payment transaction executes entirely peer-to-peer (P2P) between the
              diner&apos;s UPI app and the waitstaff member&apos;s personal bank account.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">2.</span>
              Zero Commission Policy on Staff Gratuities
            </h2>
            <p>
              TipTable guarantees a <strong>0.00% commission rate</strong> on all gratuities paid by
              diners to waitstaff. Unlike conventional payment aggregators or tipping apps that
              charge 2% to 5% plus per-transaction interchange fees, TipTable retains exactly ₹0
              from diner tips. Staff receive 100% of the funds transferred by customers directly
              into their bank accounts.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">3.</span>
              SaaS Subscription Fees & Billing
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>
                <strong>Monthly SaaS License:</strong> ₹999 per outlet/month billed monthly, or
                ₹9,990/year billed annually (includes 2 months free).
              </li>
              <li>
                <strong>14-Day Zero-Risk Trial:</strong> New restaurant outlets receive an
                uninhibited 14-day free trial without requiring credit card or payment authorization
                upfront.
              </li>
              <li>
                <strong>7-Day Grace Period:</strong> In the event of an overdue invoice, restaurant
                outlets are granted a 7-calendar-day grace period. Inactive accounts beyond the
                grace period are automatically suspended without data loss.
              </li>
              <li>
                <strong>Cancellation:</strong> Subscriptions may be cancelled at any time through
                the Admin Console without lock-in contracts or penalty fees.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">4.</span>
              Restaurant Partner Obligations & Warranties
            </h2>
            <p>
              As a restaurant subscriber (&ldquo;Partner&rdquo;), you represent and warrant that:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-stone-600">
              <li>
                All Virtual Payment Addresses (VPAs) registered for staff members belong to the
                respective employees and have been provided with their voluntary, informed consent.
              </li>
              <li>
                The restaurant will not withhold, offset, levy management fees, or redirect tips
                intended for waitstaff into management or restaurant accounts.
              </li>
              <li>
                Placard QR codes displayed on dining tables will remain unaltered and correspond to
                the authorized tables assigned in the Admin Console.
              </li>
            </ol>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">5.</span>
              Google Maps Anti-Gating Compliance
            </h2>
            <p>
              TipTable strictly abides by Google Maps user-generated content policies prohibiting
              review gating. TipTable provides an un-gated, unfiltered redirect to the
              restaurant&apos;s public Google Maps review listing. Neither the restaurant nor
              TipTable screens, filters, incentivizes, or conditions review submission based on
              positive or negative diner sentiment.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">6.</span>
              Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p className="text-stone-600">
              TipTable provides the service &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
              Because UPI payment confirmation and execution occur out-of-band in third-party
              banking apps (e.g., Google Pay, PhonePe, Paytm, BHIM), TipTable shall not be liable
              for bank server outages, NPCI latency, or failed bank settlements. In no event shall
              TipTable&apos;s cumulative liability exceed the total subscription fees paid by the
              restaurant in the three (3) months preceding the claim.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">7.</span>
              Governing Law & Dispute Resolution
            </h2>
            <p className="text-stone-600">
              These Terms are governed by and construed in accordance with the laws of the Republic
              of India. Any disputes arising out of or in connection with these Terms shall be
              subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka,
              India.
            </p>
          </section>
        </article>
      ) : (
        /* PRIVACY POLICY CONTENT (DPDP ACT 2023) */
        <article className="space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">1.</span>
              Data Fiduciary & Digital Personal Data Protection (DPDP) Act 2023
            </h2>
            <p>
              TipTable Hospitality Technologies Private Limited (&ldquo;TipTable&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates as a <strong>Data Fiduciary</strong>{' '}
              under the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;). This
              Privacy Policy explains how personal data of restaurant personnel (&ldquo;Staff Data
              Principals&rdquo;), administrators (&ldquo;Admin Data Principals&rdquo;), and diners
              (&ldquo;Customer Data Principals&rdquo;) is collected, processed, and safeguarded.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">2.</span>
              Diner Data Minimization: Zero Account, Zero Tracking
            </h2>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
              <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                Complete Anonymity for Diners:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-600 text-xs">
                <li>
                  <strong>No Account Required:</strong> Diners scan a table QR code and interact
                  with TipTable without registering an account, providing a phone number, or
                  entering an email address.
                </li>
                <li>
                  <strong>Zero Tracking Cookies:</strong> TipTable does not use persistent tracking
                  cookies, cross-site trackers, or advertising pixels on customer-facing screens.
                </li>
                <li>
                  <strong>Ephemeral Sessions:</strong> Table QR tokens are strictly validated for
                  active dining sessions. When a diner clicks a tip preset, TipTable hands off to
                  the native UPI application immediately.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">3.</span>
              Cryptographic Security & AES-256-GCM Encryption
            </h2>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <HugeiconsIcon icon={LockIcon} className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-emerald-950">
                <p className="font-semibold text-xs sm:text-sm">
                  Staff VPAs Encrypted at Rest (AES-256-GCM)
                </p>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Waitstaff UPI Virtual Payment Addresses (VPAs) are stored encrypted at rest using
                  industry-standard AES-256-GCM authenticated encryption. Staff VPAs are never
                  exposed in bulk directory APIs, never leaked to third parties, and only decrypted
                  in-memory for individual, rate-limited tip intent requests.
                </p>
              </div>
            </div>
            <p>
              Administrator credentials are safeguarded using Argon2id password hashing with custom
              memory/time parameters, and Time-Based One-Time Password (TOTP) two-factor
              authentication secrets are encrypted at rest with dedicated cryptographic keys.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">4.</span>
              Data Retention & Automated Audit Logging
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>
                <strong>Audit Logs:</strong> Administrative and platform actions (staff creation,
                VPA updates, role modifications, tenant onboarding) are recorded in tamper-evident
                audit logs and retained for exactly 180 days for security anomaly detection before
                automated purging.
              </li>
              <li>
                <strong>Staff Data:</strong> Retained for the duration of the restaurant&apos;s
                active subscription. Upon staff deactivation or restaurant termination, staff
                records and encrypted VPAs are soft-deleted and permanently erased following the
                statutory 30-day retention window.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">5.</span>
              Rights of Data Principals under DPDP Act 2023
            </h2>
            <p>Every Data Principal possesses the following statutory rights:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">Right to Access</span>
                <p className="text-[11px] text-stone-500">
                  Request a summary of your personal data processed by TipTable.
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">
                  Right to Correction & Erasure
                </span>
                <p className="text-[11px] text-stone-500">
                  Request rectification of inaccurate data or deletion of personal data.
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">
                  Right of Grievance Redressal
                </span>
                <p className="text-[11px] text-stone-500">
                  Register grievances directly with our Data Protection Officer.
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="font-bold text-stone-900 text-xs">Right to Nominate</span>
                <p className="text-[11px] text-stone-500">
                  Nominate an individual to exercise rights on your behalf in case of incapacity.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="text-stone-400 font-mono text-xs">6.</span>
              Grievance Redressal & Data Protection Officer (DPO)
            </h2>
            <p>
              In accordance with the DPDP Act 2023, TipTable has designated a dedicated Grievance
              Redressal Officer:
            </p>
            <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
                  <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                    Ananya Deshmukh &bull; Grievance Redressal Officer
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    TipTable Hospitality Technologies Private Limited
                  </p>
                </div>
              </div>
              <div className="text-xs text-stone-600 space-y-1 pl-10">
                <p>
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:grievance@tiptable.in"
                    className="text-stone-900 underline font-semibold"
                  >
                    grievance@tiptable.in
                  </a>
                </p>
                <p>
                  <strong>Physical Address:</strong> 4th Floor, Salarpuria Horizon, 100 Feet Road,
                  HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038, India
                </p>
                <p className="text-[11px] text-stone-400 pt-1">
                  SLA: Inquiries acknowledged within 24 hours; resolved within 7 business days.
                </p>
              </div>
            </div>
          </section>
        </article>
      )}
    </div>
  );
};
