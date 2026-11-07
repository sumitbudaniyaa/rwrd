import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { MotionCard, MotionButton, SlideUp } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';

export const MfaChallengeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { tempToken, verifyMfa, cancelMfa } = useAuth();

  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If no pending MFA temp token exists, redirect back to login
  if (!tempToken) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  const handleTotpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setTotpCode(val);
  };

  const handleRecoveryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    if (val.length > 4) {
      val = `${val.slice(0, 4)}-${val.slice(4)}`;
    }
    setRecoveryCode(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const codeToVerify = isRecoveryMode ? recoveryCode : totpCode;
    if (!codeToVerify.trim()) {
      setErrorMessage(
        isRecoveryMode
          ? 'Please enter an 8-character recovery code.'
          : 'Please enter your 6-digit authenticator code.',
      );
      return;
    }

    setIsLoading(true);

    try {
      await verifyMfa(codeToVerify, isRecoveryMode);
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || err.problem.title);
      } else {
        setErrorMessage('Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    cancelMfa();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <SlideUp>
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center text-indigo-600 mb-4">
            <HugeiconsIcon
              icon={isRecoveryMode ? Key01Icon : Shield01Icon}
              className="w-6 h-6"
              strokeWidth={1.5}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {isRecoveryMode ? 'enter recovery code' : 'two-factor authentication'}
          </h1>
          <p className="mt-2 text-xs text-stone-500 max-w-sm mx-auto">
            {isRecoveryMode
              ? 'Enter one of your 8-character emergency backup recovery codes.'
              : 'Enter the 6-digit code from your authenticator app (e.g. Google Authenticator, 1Password).'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <MotionCard className="py-8 px-6 sm:px-10 border border-stone-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed"
                >
                  {errorMessage}
                </div>
              )}

              {isRecoveryMode ? (
                <div>
                  <label
                    htmlFor="recovery-code"
                    className="block text-xs font-medium text-stone-700 mb-1.5"
                  >
                    Emergency recovery code
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    value={recoveryCode}
                    onChange={handleRecoveryChange}
                    placeholder="ABCD-EFGH"
                    autoFocus
                    className="w-full text-center tracking-widest font-mono text-lg py-3 rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="totp-code"
                    className="block text-xs font-medium text-stone-700 mb-1.5 text-center"
                  >
                    6-digit verification code
                  </label>
                  <input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={handleTotpChange}
                    placeholder="123456"
                    autoFocus
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-stone-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
                  />
                </div>
              )}

              <div className="space-y-3 pt-2">
                <MotionButton
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-600"
                >
                  Verify and continue
                </MotionButton>

                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(!isRecoveryMode);
                    setErrorMessage(null);
                  }}
                  className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium py-1"
                >
                  {isRecoveryMode
                    ? 'Use authenticator app code instead'
                    : 'Lost your device? Use recovery code'}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-stone-500 hover:text-stone-700 font-medium"
              >
                ← Back to sign in
              </button>
            </div>
          </MotionCard>
        </div>
      </SlideUp>
    </div>
  );
};
