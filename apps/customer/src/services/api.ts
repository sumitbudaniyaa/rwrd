import { clientEnv } from '../config/env.js';
import type {
  ResolveTokenResponse,
  StaffPublic,
  TipIntentResponse,
  CreateTipIntentInput,
  ReviewTapRequest,
  ProblemDetails,
} from '@tiptable/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails,
  ) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${clientEnv.VITE_API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let problem: ProblemDetails;
    try {
      problem = (await response.json()) as ProblemDetails;
    } catch {
      problem = {
        type: 'https://tiptable.in/errors/unknown',
        title: response.statusText,
        status: response.status,
        detail: 'An unexpected network error occurred.',
        instance: endpoint,
        code: 'NETWORK_ERROR',
        requestId: 'unknown',
      };
    }
    throw new ApiError(response.status, problem);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const api = {
  /**
   * Resolves table QR token to retrieve restaurant branding and table data.
   */
  resolveToken: (token: string): Promise<ResolveTokenResponse> => {
    return request<ResolveTokenResponse>(
      `/api/v1/public/restaurants/token/${encodeURIComponent(token)}`,
    );
  },

  /**
   * Retrieves active waitstaff for diner selection.
   */
  getStaff: (restaurantId: string): Promise<{ staff: StaffPublic[] }> => {
    return request<{ staff: StaffPublic[] }>(
      `/api/v1/public/restaurants/${encodeURIComponent(restaurantId)}/staff`,
    );
  },

  /**
   * Generates tip intent and standardized UPI deep link.
   */
  createTipIntent: (input: CreateTipIntentInput): Promise<TipIntentResponse> => {
    return request<TipIntentResponse>('/api/v1/public/tips/intent', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Tracks customer tap on Google Review link.
   */
  trackReviewTap: (restaurantId: string, input: ReviewTapRequest): Promise<void> => {
    return request<void>(
      `/api/v1/public/restaurants/${encodeURIComponent(restaurantId)}/review-tap`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },
};
