import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

interface FaqItem {
  id: string;
  question: string;
  category: 'Billing & Custody' | 'Compliance & Legal' | 'Operations & Setup';
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'zero-commission',
    category: 'Billing & Custody',
    question: 'How does the 0% commission model work? Do you take any cut of staff tips?',
    answer:
      'rwrd takes exactly zero percentage cut of your staff tips. When a diner tips ₹100, the staff member receives ₹100 in their personal bank account. We facilitate direct peer-to-peer (P2P) transfers using standard NPCI UPI deep links (upi://pay). We only charge the restaurant a flat SaaS subscription of ₹999/month per outlet.',
  },
  {
    id: 'rbi-compliance',
    category: 'Compliance & Legal',
    question: 'Is rwrd compliant with Reserve Bank of India (RBI) payment aggregator regulations?',
    answer:
      'Yes, 100% compliant by design. Under RBI master directions for Payment Aggregators and Payment Gateways (PA/PG), an entity that handles customer funds in an escrow or nodal account must be licensed by the RBI. Because rwrd never touches, pools, holds, or routes diner money through any company account, we are fully exempt from payment aggregator licensing mandates.',
  },
  {
    id: 'google-anti-gating',
    category: 'Compliance & Legal',
    question: 'Does review redirection violate Google Maps Anti-Gating policies?',
    answer:
      'Not at all. Google strictly prohibits "review gating"—the practice of selectively filtering diners by showing a Google review prompt only to positive reviewers while hiding it from negative ones. rwrd offers a completely un-gated review redirect to all diners regardless of tip amount or rating, in strict accordance with Google Maps content guidelines.',
  },
  {
    id: 'tax-accounting',
    category: 'Billing & Custody',
    question: 'Do restaurant owners have to manage tip pooling, payroll taxation, or GST?',
    answer:
      'No. In traditional tip pooling or credit-card gratuity additions, funds pass through the restaurant’s merchant account, creating payroll complexity, potential GST disputes on service charges, and accounting reconciliation overhead. With rwrd, tips are direct P2P diner-to-server transfers. They never touch restaurant ledgers or bank statements.',
  },
  {
    id: 'pos-integration',
    category: 'Operations & Setup',
    question: 'What hardware, kitchen displays, or POS integrations are required?',
    answer:
      'Zero hardware is needed. rwrd operates independently alongside any existing POS system (such as Petpooja, POSist, Toast, or standard cash registers). We generate high-resolution QR placards that you print and display on dining tables. Diners scan with their standard phone camera without downloading any mobile app.',
  },
  {
    id: 'setup-speed',
    category: 'Operations & Setup',
    question: 'How quickly can our restaurant go live?',
    answer:
      'Your restaurant can go live in under 15 minutes. Self-serve onboarding allows you to register your restaurant, invite waitstaff to securely submit their encrypted UPI VPAs, download print-ready table QR codes, and place them on your tables immediately.',
  },
];

export const FaqAccordion: React.FC = () => {
  // Default first item open
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['zero-commission']));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div
            key={item.id}
            className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
              isOpen
                ? 'bg-stone-50/80 border-stone-300 shadow-xs'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {item.category}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-stone-900">{item.question}</h4>
              </div>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-stone-200 bg-white transition-transform duration-200 ${
                  isOpen ? 'rotate-180 bg-stone-100 text-stone-900' : 'text-stone-500'
                }`}
              >
                <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${item.id}`}
                className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-200/60 pt-3"
              >
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
