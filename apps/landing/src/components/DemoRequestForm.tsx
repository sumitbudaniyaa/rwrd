import React, { useState } from 'react';
import { z } from 'zod';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Store01Icon,
  Mail01Icon,
  SmartPhone01Icon,
  Location01Icon,
  AlertCircleIcon,
  Loading03Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { landingEnv } from '../config/env.js';

const leadFormSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100),
  contactName: z
    .string()
    .trim()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(100),
  email: z.string().trim().email('Please enter a valid business email address').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid 10-digit phone number'),
  city: z.string().trim().min(2, 'City is required').max(100),
  tableCount: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the DPDP privacy policy to proceed' }),
  }),
});

type LeadFormData = z.infer<typeof leadFormSchema>;
type FieldErrors = Partial<Record<keyof LeadFormData, string>>;

export const DemoRequestForm: React.FC = () => {
  const [formData, setFormData] = useState<LeadFormData>({
    restaurantName: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    tableCount: '10-25',
    notes: '',
    consent: false as unknown as true,
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof LeadFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = leadFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldIssues: FieldErrors = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as keyof LeadFormData;
        if (fieldName && !fieldIssues[fieldName]) {
          fieldIssues[fieldName] = issue.message;
        }
      }
      setErrors(fieldIssues);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const notesWithTables = [
        formData.tableCount ? `Tables: ${formData.tableCount}` : null,
        formData.notes?.trim() ? formData.notes.trim() : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const response = await fetch(`${landingEnv.VITE_API_BASE_URL}/api/v1/public/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName: formData.restaurantName.trim(),
          contactName: formData.contactName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim(),
          notes: notesWithTables || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const detail =
          errJson?.detail ||
          errJson?.message ||
          (errJson?.errors && errJson.errors[0]?.reason) ||
          'Failed to submit demo request. Please try again.';
        setServerError(detail);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      restaurantName: '',
      contactName: '',
      email: '',
      phone: '',
      city: '',
      tableCount: '10-25',
      notes: '',
      consent: false as unknown as true,
    });
    setErrors({});
    setServerError(null);
    setIsSuccess(false);
  };

  if (isSuccess) {
    return (
      <div className="p-8 sm:p-10 bg-white border border-stone-200 rounded-3xl shadow-md text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-stone-900">Demo Walkthrough Requested!</h3>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Thank you, <strong className="text-stone-900">{formData.contactName}</strong>. Our
            hospitality onboarding specialist will contact you at{' '}
            <strong className="text-stone-900">{formData.phone}</strong> or{' '}
            <strong className="text-stone-900">{formData.email}</strong> within 2 business hours.
          </p>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl text-xs text-stone-500 max-w-sm mx-auto space-y-1">
          <div className="font-semibold text-stone-700">{formData.restaurantName}</div>
          <div>
            {formData.city} &bull; Approx {formData.tableCount} dining tables
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-3xl shadow-md overflow-hidden">
      <div className="p-6 sm:p-8 bg-stone-900 text-white space-y-2">
        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white rounded-md">
          VIP Hospitality Trial
        </span>
        <h3 className="text-lg sm:text-xl font-bold">Experience rwrd in Your Restaurant</h3>
        <p className="text-xs text-stone-300">
          We&apos;ll prepare custom printed sample placards for your dining tables and guide your
          staff through the 15-minute setup.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5" noValidate>
        {serverError && (
          <div
            role="alert"
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800"
          >
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
            />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Restaurant Name */}
          <div className="space-y-1.5">
            <label htmlFor="restaurantName" className="block text-xs font-semibold text-stone-700">
              Restaurant / Outlet Name *
            </label>
            <div className="relative">
              <input
                id="restaurantName"
                name="restaurantName"
                type="text"
                placeholder="e.g. Bombay Brasserie"
                value={formData.restaurantName}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-hidden transition-colors ${
                  errors.restaurantName
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-stone-200 focus:border-stone-900'
                }`}
              />
              <HugeiconsIcon
                icon={Store01Icon}
                className="w-4 h-4 text-stone-400 absolute left-3 top-3"
                strokeWidth={1.5}
              />
            </div>
            {errors.restaurantName && (
              <p className="text-[11px] text-rose-600">{errors.restaurantName}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label htmlFor="city" className="block text-xs font-semibold text-stone-700">
              City *
            </label>
            <div className="relative">
              <input
                id="city"
                name="city"
                type="text"
                placeholder="e.g. Mumbai, Bengaluru, Delhi NCR"
                value={formData.city}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-hidden transition-colors ${
                  errors.city
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-stone-200 focus:border-stone-900'
                }`}
              />
              <HugeiconsIcon
                icon={Location01Icon}
                className="w-4 h-4 text-stone-400 absolute left-3 top-3"
                strokeWidth={1.5}
              />
            </div>
            {errors.city && <p className="text-[11px] text-rose-600">{errors.city}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Contact Person Name */}
          <div className="space-y-1.5">
            <label htmlFor="contactName" className="block text-xs font-semibold text-stone-700">
              Your Name / Title *
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              placeholder="e.g. Vikram Malhotra (General Manager)"
              value={formData.contactName}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-hidden transition-colors ${
                errors.contactName
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-stone-200 focus:border-stone-900'
              }`}
            />
            {errors.contactName && (
              <p className="text-[11px] text-rose-600">{errors.contactName}</p>
            )}
          </div>

          {/* Work Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-stone-700">
              Work Email *
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="vikram@restaurant.in"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-hidden transition-colors ${
                  errors.email
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-stone-200 focus:border-stone-900'
                }`}
              />
              <HugeiconsIcon
                icon={Mail01Icon}
                className="w-4 h-4 text-stone-400 absolute left-3 top-3"
                strokeWidth={1.5}
              />
            </div>
            {errors.email && <p className="text-[11px] text-rose-600">{errors.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phone */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-xs font-semibold text-stone-700">
              Phone / WhatsApp Number *
            </label>
            <div className="relative">
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-hidden transition-colors ${
                  errors.phone
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-stone-200 focus:border-stone-900'
                }`}
              />
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                className="w-4 h-4 text-stone-400 absolute left-3 top-3"
                strokeWidth={1.5}
              />
            </div>
            {errors.phone && <p className="text-[11px] text-rose-600">{errors.phone}</p>}
          </div>

          {/* Table Count */}
          <div className="space-y-1.5">
            <label htmlFor="tableCount" className="block text-xs font-semibold text-stone-700">
              Dining Table Count
            </label>
            <select
              id="tableCount"
              name="tableCount"
              value={formData.tableCount}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-white focus:border-stone-900 focus:outline-hidden"
            >
              <option value="1-10">1 to 10 tables (Boutique Cafe)</option>
              <option value="10-25">10 to 25 tables (Casual Dining)</option>
              <option value="25-50">25 to 50 tables (Full Service)</option>
              <option value="50+">50+ tables (Large Venue / Multi-floor)</option>
            </select>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-1.5">
          <label htmlFor="notes" className="block text-xs font-semibold text-stone-700">
            Special Requirements / Current POS (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="e.g. Using Petpooja POS, 18 waitstaff across 2 dining areas..."
            value={formData.notes}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-white focus:border-stone-900 focus:outline-hidden resize-none"
          />
        </div>

        {/* DPDP Consent */}
        <div className="space-y-1 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="consent"
              checked={Boolean(formData.consent)}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-0.5 w-4 h-4 rounded-md border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
            />
            <span className="text-[11px] text-stone-500 leading-tight">
              I agree to receive a demo walkthrough and consent to rwrd processing my contact
              information in compliance with the Digital Personal Data Protection (DPDP) Act 2023.
            </span>
          </label>
          {errors.consent && <p className="text-[11px] text-rose-600 pl-6">{errors.consent}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
              <span>Submitting Demo Request...</span>
            </>
          ) : (
            <>
              <span>Schedule Free Demo & Request Sample Placards</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-stone-400">
          No credit card required &bull; 14-day zero-risk trial &bull; Zero hardware cost
        </p>
      </form>
    </div>
  );
};
