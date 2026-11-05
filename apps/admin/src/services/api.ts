import { adminEnv } from '../config/env.js';
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

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  restaurantId?: string;
  totpEnabled?: boolean;
}

export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export interface LoginResponse {
  mfaRequired: boolean;
  tempToken?: string;
  accessToken?: string;
  expiresInSeconds?: number;
  user: AdminUser;
}

export interface MfaChallengeResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AdminUser;
}

export interface RefreshResponse {
  accessToken: string;
  expiresInSeconds: number;
}

export interface MeResponse {
  user: AdminUser;
  restaurant: AdminRestaurant;
}

export interface StaffAdminItem {
  id: string;
  restaurantId: string;
  displayName: string;
  roleLabel: string | null;
  maskedVpa: string;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  displayName: string;
  roleLabel?: string;
  vpa: string;
  photoUrl?: string;
}

export interface UpdateStaffInput {
  displayName?: string;
  roleLabel?: string;
  vpa?: string;
  photoUrl?: string | null;
  isActive?: boolean;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  googleReviewUrl: string;
  tipPresets: number[];
  minTipInr: number;
  maxTipInr: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRestaurantSettingsInput {
  name?: string;
  logoUrl?: string | null;
  googleReviewUrl?: string;
  tipPresets?: number[];
  minTipInr?: number;
  maxTipInr?: number;
}

export interface QrTokenItem {
  id: string;
  restaurantId: string;
  tableId: string | null;
  tableNumber: string | null;
  sectionName: string | null;
  token: string;
  customerUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface QrListResponse {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  tokens: QrTokenItem[];
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
  const url = `${adminEnv.VITE_API_BASE_URL}/api/v1${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Double-submit CSRF protection for credentials
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes httpOnly refresh cookies
  });

  // Handle 401 Unauthorized by attempting a single silent refresh
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    try {
      const refreshRes = await fetch(`${adminEnv.VITE_API_BASE_URL}/api/v1/admin/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = (await refreshRes.json()) as RefreshResponse;
        setAccessToken(refreshData.accessToken);
        return request<T>(endpoint, options, true);
      }
    } catch {
      // Refresh failed
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
        detail: 'An unexpected network error occurred.',
        instance: endpoint,
        code: 'NETWORK_ERROR',
        requestId: 'unknown',
      };
    }
    throw new ApiError(problem, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  verifyMfa(
    tempToken: string,
    code: string,
    isRecoveryCode = false,
  ): Promise<MfaChallengeResponse> {
    return request<MfaChallengeResponse>('/admin/auth/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code, isRecoveryCode }),
    });
  },

  refresh(): Promise<RefreshResponse> {
    return request<RefreshResponse>('/admin/auth/refresh', {
      method: 'POST',
    });
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/admin/auth/logout', {
      method: 'POST',
    });
  },

  logoutAll(): Promise<{ message: string }> {
    return request<{ message: string }>('/admin/auth/logout-all', {
      method: 'POST',
    });
  },

  getMe(): Promise<MeResponse> {
    return request<MeResponse>('/admin/auth/me', {
      method: 'GET',
    });
  },

  getStaffList(restaurantId: string): Promise<{ staff: StaffAdminItem[] }> {
    return request<{ staff: StaffAdminItem[] }>(`/admin/restaurants/${restaurantId}/staff`, {
      method: 'GET',
    });
  },

  createStaff(restaurantId: string, data: CreateStaffInput): Promise<{ staff: StaffAdminItem }> {
    return request<{ staff: StaffAdminItem }>(`/admin/restaurants/${restaurantId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStaff(
    restaurantId: string,
    staffId: string,
    data: UpdateStaffInput,
  ): Promise<{ staff: StaffAdminItem }> {
    return request<{ staff: StaffAdminItem }>(
      `/admin/restaurants/${restaurantId}/staff/${staffId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
  },

  deleteStaff(restaurantId: string, staffId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/admin/restaurants/${restaurantId}/staff/${staffId}`, {
      method: 'DELETE',
    });
  },

  toggleStaffActive(restaurantId: string, staffId: string): Promise<{ staff: StaffAdminItem }> {
    return request<{ staff: StaffAdminItem }>(
      `/admin/restaurants/${restaurantId}/staff/${staffId}/toggle-active`,
      {
        method: 'POST',
      },
    );
  },

  getRestaurantSettings(restaurantId: string): Promise<{ restaurant: RestaurantSettings }> {
    return request<{ restaurant: RestaurantSettings }>(
      `/admin/restaurants/${restaurantId}/settings`,
      {
        method: 'GET',
      },
    );
  },

  updateRestaurantSettings(
    restaurantId: string,
    data: UpdateRestaurantSettingsInput,
  ): Promise<{ restaurant: RestaurantSettings }> {
    return request<{ restaurant: RestaurantSettings }>(
      `/admin/restaurants/${restaurantId}/settings`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
  },

  getQrList(restaurantId: string): Promise<QrListResponse> {
    return request<QrListResponse>(`/admin/restaurants/${restaurantId}/qr`, {
      method: 'GET',
    });
  },

  rotateQrToken(restaurantId: string, tableId?: string | null): Promise<{ token: QrTokenItem }> {
    return request<{ token: QrTokenItem }>(`/admin/restaurants/${restaurantId}/qr/rotate`, {
      method: 'POST',
      body: JSON.stringify({ tableId: tableId || null }),
    });
  },

  createTable(
    restaurantId: string,
    data: { tableNumber: string; sectionName?: string },
  ): Promise<{
    table: { id: string; tableNumber: string; sectionName: string | null };
    token: QrTokenItem;
  }> {
    return request<{
      table: { id: string; tableNumber: string; sectionName: string | null };
      token: QrTokenItem;
    }>(`/admin/restaurants/${restaurantId}/tables`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
