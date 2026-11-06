import { portalEnv } from '../config/env.js';
import type { ProblemDetails } from '@tiptable/shared';

export class ApiError extends Error {
  constructor(
    public readonly problem: ProblemDetails,
    public readonly status: number,
  ) {
    super(problem.detail || problem.title || `API error (${status})`);
    this.name = 'ApiError';
  }
}

export type PlatformRole = 'super_admin' | 'support' | 'finance';

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  isActive?: boolean;
}

export interface PortalLoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: PlatformUser;
}

export interface RefreshResponse {
  accessToken: string;
  expiresInSeconds: number;
}

export interface MeResponse {
  user: PlatformUser;
}

export interface PortalRestaurantItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  googleReviewUrl: string;
  tipPresets: number[];
  minTipInr: number;
  maxTipInr: number;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PortalRestaurantsResponse {
  restaurants: PortalRestaurantItem[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface OnboardRestaurantInput {
  name: string;
  slug: string;
  googleReviewUrl: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
  tipPresets?: number[];
  minTipInr?: number;
  maxTipInr?: number;
}

let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const url = `${portalEnv.VITE_API_BASE_URL}/api/v1${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 Unauthorized by attempting a single silent refresh
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes('/portal/auth/login') &&
    !endpoint.includes('/portal/auth/refresh')
  ) {
    try {
      const refreshRes = await fetch(`${portalEnv.VITE_API_BASE_URL}/api/v1/portal/auth/refresh`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = (await refreshRes.json()) as RefreshResponse;
        setAccessToken(refreshData.accessToken);
        return request<T>(endpoint, options, true);
      }
    } catch {
      // Refresh failed, proceed to handle initial 401
    }
  }

  if (!response.ok) {
    let problem: ProblemDetails;
    try {
      problem = (await response.json()) as ProblemDetails;
    } catch {
      problem = {
        type: 'https://tiptable.in/errors/unknown',
        title: response.statusText || 'Error',
        status: response.status,
        detail: `HTTP request failed with status ${response.status}`,
        code: 'HTTP_ERROR',
        requestId: response.headers.get('x-request-id') || 'unknown',
      };
    }
    throw new ApiError(problem, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string): Promise<PortalLoginResponse> {
    return request<PortalLoginResponse>('/portal/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  refresh(): Promise<RefreshResponse> {
    return request<RefreshResponse>('/portal/auth/refresh', {
      method: 'POST',
    });
  },

  getMe(): Promise<MeResponse> {
    return request<MeResponse>('/portal/auth/me', {
      method: 'GET',
    });
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/portal/auth/logout', {
      method: 'POST',
    });
  },

  getRestaurants(params?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PortalRestaurantsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return request<PortalRestaurantsResponse>(`/portal/restaurants${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  onboardRestaurant(data: OnboardRestaurantInput): Promise<{
    restaurant: PortalRestaurantItem;
    owner: { id: string; email: string; fullName: string; role: string };
    rootQrToken: string;
  }> {
    return request<{
      restaurant: PortalRestaurantItem;
      owner: { id: string; email: string; fullName: string; role: string };
      rootQrToken: string;
    }>('/portal/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRestaurantStatus(
    id: string,
    action: 'suspend' | 'reactivate',
    reason?: string,
  ): Promise<{ restaurant: PortalRestaurantItem }> {
    return request<{ restaurant: PortalRestaurantItem }>(`/portal/restaurants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason }),
    });
  },

  deleteRestaurant(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/portal/restaurants/${id}`, {
      method: 'DELETE',
    });
  },
};
