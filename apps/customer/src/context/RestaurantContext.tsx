import React, { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.js';
import type { RestaurantPublic, TablePublic } from '@tiptable/shared';

interface RestaurantContextValue {
  token: string;
  restaurant: RestaurantPublic | null;
  table: TablePublic | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['restaurant-token', token],
    queryFn: () => (token ? api.resolveToken(token) : Promise.reject(new Error('No token'))),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const value: RestaurantContextValue = {
    token: token || '',
    restaurant: data?.restaurant ?? null,
    table: data?.table ?? null,
    isLoading,
    isError,
    error: error as Error | null,
  };

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return ctx;
}
