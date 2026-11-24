import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

export const ActiveImpersonationPill: React.FC = () => {
  const { restaurant, impersonation } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const isImpersonated = Boolean(impersonation?.isImpersonated);
  const restaurantId = restaurant?.id;

  const { data } = useQuery({
    queryKey: ['admin-pending-impersonation-request', restaurantId],
    queryFn: () => (restaurantId ? api.getPendingImpersonationRequest(restaurantId) : null),
    enabled: Boolean(restaurantId && !isImpersonated),
    refetchInterval: 3000,
  });

  const activeAccess = data?.activeAccess;

  const revokeMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.respondToImpersonationRequest(restaurantId!, requestId, 'revoke'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-pending-impersonation-request', restaurantId],
      });
      toast.info('Support Access Ended', 'Delegated platform support session has been terminated.');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to end support access.';
      toast.error('Termination Failed', msg);
    },
  });

  if (!activeAccess || isImpersonated) {
    return null;
  }

  const handleEndAccess = () => {
    revokeMutation.mutate(activeAccess.id);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/95 dark:bg-stone-900 text-white border border-stone-800 shadow-xl backdrop-blur-md text-xs animate-fade-in select-none"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      <span className="font-medium text-stone-200">on admin access</span>
      <span className="text-stone-500">•</span>
      <button
        type="button"
        onClick={handleEndAccess}
        disabled={revokeMutation.isPending}
        className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer transition-colors"
      >
        {revokeMutation.isPending ? 'ending...' : 'end access'}
      </button>
    </div>
  );
};
