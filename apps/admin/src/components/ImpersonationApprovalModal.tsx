import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FadeIn, useToast } from '@tiptable/ui';
import { MotionButton } from './motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

export const ImpersonationApprovalModal: React.FC = () => {
  const { restaurant, impersonation } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);

  const isImpersonated = Boolean(impersonation?.isImpersonated);
  const restaurantId = restaurant?.id;

  const { data } = useQuery({
    queryKey: ['admin-pending-impersonation-request', restaurantId],
    queryFn: () => (restaurantId ? api.getPendingImpersonationRequest(restaurantId) : null),
    enabled: Boolean(restaurantId && !isImpersonated),
    refetchInterval: 3000, // Poll every 3 seconds for support requests
  });

  const pendingRequest = data?.pendingRequest;

  const respondMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'decline' }) =>
      api.respondToImpersonationRequest(restaurantId!, requestId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin-pending-impersonation-request', restaurantId],
      });
      if (variables.action === 'approve') {
        toast.success(
          'Support Access Approved',
          'Platform support staff has been granted temporary administrative access.',
        );
      } else {
        toast.info('Support Request Declined', 'The platform support access request was declined.');
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to process support request.';
      toast.error('Response Failed', msg);
    },
  });

  if (
    !pendingRequest ||
    pendingRequest.id === dismissedRequestId ||
    isImpersonated ||
    typeof document === 'undefined'
  ) {
    return null;
  }

  const handleRespond = (action: 'approve' | 'decline') => {
    if (action === 'approve') {
      setDismissedRequestId(pendingRequest.id);
    }
    respondMutation.mutate({
      requestId: pendingRequest.id,
      action,
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="impersonation-request-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in font-sans"
    >
      <FadeIn>
        <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200/90 shadow-2xl overflow-hidden p-6 space-y-4">
          <div>
            <h3
              id="impersonation-request-title"
              className="text-base font-semibold text-stone-900 tracking-tight"
            >
              support access request
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              A platform engineer is requesting temporary admin access.
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-600">
              <span className="font-medium text-stone-500">Requested By:</span>
              <span className="font-mono text-stone-900 font-semibold">
                {pendingRequest.impersonatorEmail}
              </span>
            </div>
            <div className="flex flex-col gap-1 pt-1.5 border-t border-stone-200/60">
              <span className="font-medium text-stone-500">Reason / Reference:</span>
              <span className="text-stone-800 bg-white p-2 rounded-lg border border-stone-200/60 font-mono text-[11px]">
                {pendingRequest.reason || 'Customer support assistance'}
              </span>
            </div>
            <div className="text-[11px] text-amber-700 pt-1">
              <span>This request will automatically expire in 5 minutes if unaddressed.</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-semibold text-[11px]">
              <span>security & consent notice</span>
            </p>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Approving grants the platform support team 1-hour delegated access to assist with your
              account. Every action taken is immutably audited. You can decline if you did not
              request support.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
            <MotionButton
              type="button"
              variant="outline"
              size="sm"
              disabled={respondMutation.isPending}
              onClick={() => handleRespond('decline')}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
            >
              {respondMutation.isPending ? 'Processing...' : 'Decline'}
            </MotionButton>
            <MotionButton
              type="button"
              variant="primary"
              size="sm"
              disabled={respondMutation.isPending}
              onClick={() => handleRespond('approve')}
              className="px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <span>{respondMutation.isPending ? 'approving...' : 'approve access'}</span>
            </MotionButton>
          </div>
        </div>
      </FadeIn>
    </div>,
    document.body,
  );
};
