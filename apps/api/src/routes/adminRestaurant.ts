import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { eq, and, desc, gt } from 'drizzle-orm';
import { z } from 'zod';
import {
  UpdateRestaurantSettingsSchema,
  PlacesSearchRequestSchema,
  type GooglePlaceResult,
} from '@tiptable/shared';
import { withTenantContext } from '../db/rls.js';
import { subscriptions, billingPlans, impersonationRequests } from '../db/schema/index.js';
import { restaurantRepository } from '../repositories/restaurantRepository.js';
import { staffRepository } from '../repositories/staffRepository.js';
import { auditService } from '../services/auditService.js';
import { authService } from '../services/authService.js';
import { impersonationSessionService } from '../services/impersonationSessionService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { NotFoundError, BadRequestError, ConflictError } from '../errors/appError.js';
import { env } from '../config/env.js';

export const adminRestaurantRouter = Router();

const UuidParamSchema = z.string().uuid('Valid UUID identifier is required');

function isAllowedGoogleHost(hostname: string, pathname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return false;
  }
  if (isIP(host) !== 0) {
    return false;
  }
  if (host === 'maps.app.goo.gl') {
    return true;
  }
  if (host === 'goo.gl') {
    return pathname.startsWith('/maps');
  }
  if (host === 'maps.google.com' || host === 'search.google.com') {
    return true;
  }
  if (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(host)) {
    return pathname.startsWith('/maps') || pathname.startsWith('/search');
  }
  return false;
}

function parseSafeGoogleMapsUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return null;
    }
    return isAllowedGoogleHost(parsed.hostname, parsed.pathname) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/admin/restaurants/:restaurantId/settings
 * Retrieves restaurant profile and operational configuration.
 */
adminRestaurantRouter.get(
  '/admin/restaurants/:restaurantId/settings',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const restaurant = await restaurantRepository.findById(restaurantId);

      if (!restaurant) {
        throw new NotFoundError('Restaurant not found');
      }

      const [sub] = await withTenantContext(restaurantId, (executor) =>
        executor
          .select({
            id: subscriptions.id,
            status: subscriptions.status,
            currentPeriodStart: subscriptions.currentPeriodStart,
            currentPeriodEnd: subscriptions.currentPeriodEnd,
            trialEndsAt: subscriptions.trialEndsAt,
            planId: billingPlans.id,
            planName: billingPlans.name,
            planCode: billingPlans.code,
            priceInr: billingPlans.priceInr,
            durationMonths: billingPlans.durationMonths,
            monthlyFeeInr: billingPlans.monthlyFeeInr,
          })
          .from(subscriptions)
          .leftJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
          .where(eq(subscriptions.restaurantId, restaurantId))
          .limit(1),
      );

      const hasActiveStaff = await staffRepository.hasActiveStaff(restaurantId);
      const hasReviewUrl = Boolean(
        restaurant.googleReviewUrl && restaurant.googleReviewUrl.trim().length > 0,
      );

      res.status(200).json({
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          googleReviewUrl: restaurant.googleReviewUrl,
          tipPresets: restaurant.tipPresets,
          minTipInr: restaurant.minTipInr,
          maxTipInr: restaurant.maxTipInr,
          tippingEnabled: hasActiveStaff ? restaurant.tippingEnabled : false,
          reviewsEnabled: hasReviewUrl ? restaurant.reviewsEnabled : false,
          hasActiveStaff,
          isActive: restaurant.isActive,
          createdAt: restaurant.createdAt.toISOString(),
          updatedAt: restaurant.updatedAt.toISOString(),
        },
        subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              planId: sub.planId,
              planName: sub.planName,
              planCode: sub.planCode,
              priceInr: sub.priceInr,
              durationMonths: sub.durationMonths,
              monthlyFeeInr: sub.monthlyFeeInr,
              currentPeriodStart: sub.currentPeriodStart.toISOString(),
              currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
              trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/v1/admin/restaurants/:restaurantId/settings
 * Updates restaurant settings: name, logoUrl, googleReviewUrl, tipPresets, min/max tips.
 * Role check: Manager cannot change fundamental owner identity settings (name).
 */
adminRestaurantRouter.put(
  '/admin/restaurants/:restaurantId/settings',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const body = UpdateRestaurantSettingsSchema.parse(req.body);

      const existing = await restaurantRepository.findById(restaurantId);
      if (!existing) {
        throw new NotFoundError('Restaurant not found');
      }

      if (body.tippingEnabled === true) {
        const hasStaff = await staffRepository.hasActiveStaff(restaurantId);
        if (!hasStaff) {
          throw new BadRequestError(
            'Cannot enable waitstaff tipping without active team members. Please add staff in Staff Roster first.',
            'ACTIVE_STAFF_REQUIRED',
          );
        }
      }

      if (body.reviewsEnabled === true) {
        const effectiveReviewUrl =
          body.googleReviewUrl !== undefined ? body.googleReviewUrl : existing.googleReviewUrl;
        if (!effectiveReviewUrl || effectiveReviewUrl.trim().length === 0) {
          throw new BadRequestError(
            'Cannot enable Google reviews without a valid review URL. Please configure your Google review link first.',
            'REVIEW_URL_REQUIRED',
          );
        }
      }

      const updateData: Parameters<typeof restaurantRepository.update>[1] = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
      if (body.googleReviewUrl !== undefined) {
        updateData.googleReviewUrl = body.googleReviewUrl;
        // Auto-enable Google reviews when a valid review URL is provided (unless explicitly set)
        if (body.reviewsEnabled === undefined) {
          if (body.googleReviewUrl && body.googleReviewUrl.trim().length > 0) {
            updateData.reviewsEnabled = true;
          } else {
            updateData.reviewsEnabled = false;
          }
        }
      }
      if (body.tipPresets !== undefined) updateData.tipPresets = body.tipPresets;
      if (body.minTipInr !== undefined) updateData.minTipInr = body.minTipInr;
      if (body.maxTipInr !== undefined) updateData.maxTipInr = body.maxTipInr;
      if (body.tippingEnabled !== undefined) updateData.tippingEnabled = body.tippingEnabled;
      if (body.reviewsEnabled !== undefined) updateData.reviewsEnabled = body.reviewsEnabled;

      const updated = await restaurantRepository.update(restaurantId, updateData);
      if (!updated) {
        throw new NotFoundError('Restaurant not found');
      }

      // Record audit event
      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'RESTAURANT_SETTINGS_UPDATED',
          entityType: 'restaurant',
          entityId: restaurantId,
          beforeState: {
            name: existing.name,
            logoUrl: existing.logoUrl,
            googleReviewUrl: existing.googleReviewUrl,
            tipPresets: existing.tipPresets,
            minTipInr: existing.minTipInr,
            maxTipInr: existing.maxTipInr,
            tippingEnabled: existing.tippingEnabled,
            reviewsEnabled: existing.reviewsEnabled,
          },
          afterState: {
            name: updated.name,
            logoUrl: updated.logoUrl,
            googleReviewUrl: updated.googleReviewUrl,
            tipPresets: updated.tipPresets,
            minTipInr: updated.minTipInr,
            maxTipInr: updated.maxTipInr,
            tippingEnabled: updated.tippingEnabled,
            reviewsEnabled: updated.reviewsEnabled,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      const hasActiveStaff = await staffRepository.hasActiveStaff(restaurantId);
      const hasReviewUrl = Boolean(
        updated.googleReviewUrl && updated.googleReviewUrl.trim().length > 0,
      );

      res.status(200).json({
        restaurant: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          logoUrl: updated.logoUrl,
          googleReviewUrl: updated.googleReviewUrl,
          tipPresets: updated.tipPresets,
          minTipInr: updated.minTipInr,
          maxTipInr: updated.maxTipInr,
          tippingEnabled: hasActiveStaff ? updated.tippingEnabled : false,
          reviewsEnabled: hasReviewUrl ? updated.reviewsEnabled : false,
          hasActiveStaff,
          isActive: updated.isActive,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Extracts Place ID from a raw string, URL, or search query.
 */
function extractPlaceId(text: string): string | null {
  const trimmed = text.trim();
  // Direct Place ID match (ChIJ followed by at least 20 alphanumeric or _ - chars)
  const directMatch = trimmed.match(/\b(ChIJ[0-9A-Za-z_-]{20,})\b/);
  if (directMatch) {
    return directMatch[1]!;
  }

  // URL query parameter: ?placeid=... or ?place_id=...
  try {
    const url = new URL(trimmed);
    const placeIdParam =
      url.searchParams.get('placeid') ||
      url.searchParams.get('place_id') ||
      url.searchParams.get('placeId');
    if (placeIdParam && /^ChIJ[0-9A-Za-z_-]{20,}$/.test(placeIdParam)) {
      return placeIdParam;
    }
  } catch {
    // Not a valid URL, ignore
  }

  return null;
}

/**
 * Resolves short Google Maps URLs safely with strict hop/host validation to prevent SSRF.
 */
async function resolveShortGoogleUrl(initialUrl: URL): Promise<string> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop < 5; hop++) {
    if (!isAllowedGoogleHost(currentUrl.hostname, currentUrl.pathname)) {
      break;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const resp = await fetch(currentUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      await resp.body?.cancel();

      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get('location');
        if (!location) {
          return currentUrl.toString();
        }
        const nextUrl = new URL(location, currentUrl);
        if (nextUrl.protocol !== 'https:' || nextUrl.username || nextUrl.password) {
          return currentUrl.toString();
        }
        if (extractPlaceId(nextUrl.toString())) {
          return nextUrl.toString();
        }
        if (!isAllowedGoogleHost(nextUrl.hostname, nextUrl.pathname)) {
          return currentUrl.toString();
        }
        currentUrl = nextUrl;
        continue;
      }

      return resp.url || currentUrl.toString();
    } catch {
      return currentUrl.toString();
    } finally {
      clearTimeout(timeout);
    }
  }

  return currentUrl.toString();
}

/**
 * POST /api/v1/admin/restaurants/:restaurantId/places-search
 * Searches Google Places by business name or location to retrieve Google Place IDs
 * and generate official direct review submission links (https://search.google.com/local/writereview?placeid=...).
 */
adminRestaurantRouter.post(
  '/admin/restaurants/:restaurantId/places-search',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const parseResult = PlacesSearchRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors[0]?.message || 'Invalid search query');
      }

      const { query } = parseResult.data;
      const restaurant = await restaurantRepository.findById(restaurantId);
      if (!restaurant) {
        throw new NotFoundError('Restaurant not found');
      }

      const results: GooglePlaceResult[] = [];

      // 1. Direct Place ID check or Place ID in URL parameter
      let placeId = extractPlaceId(query);

      // 2. If query is a verified Google Maps share link (e.g. maps.app.goo.gl), resolve redirect safely
      if (!placeId) {
        const safeGoogleUrl = parseSafeGoogleMapsUrl(query);
        if (safeGoogleUrl) {
          const resolvedUrl = await resolveShortGoogleUrl(safeGoogleUrl);
          placeId = extractPlaceId(resolvedUrl);
        }
      }

      if (placeId) {
        results.push({
          placeId,
          name: restaurant.name,
          address: 'Verified Google Place ID',
          reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
        });
        res.status(200).json({
          results,
          hasApiKey: Boolean(env.GOOGLE_PLACES_API_KEY),
        });
        return;
      }

      // 3. If Google Places API key is configured, query Places API (New) Text Search
      if (env.GOOGLE_PLACES_API_KEY) {
        try {
          const newApiUrl = 'https://places.googleapis.com/v1/places:searchText';
          const newApiController = new AbortController();
          const newApiTimeout = setTimeout(() => newApiController.abort(), 5000);
          let newResponse: globalThis.Response;
          try {
            newResponse = await fetch(newApiUrl, {
              method: 'POST',
              signal: newApiController.signal,
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
              },
              body: JSON.stringify({ textQuery: query, pageSize: 5 }),
            });
          } finally {
            clearTimeout(newApiTimeout);
          }

          if (newResponse.ok) {
            const data = (await newResponse.json()) as {
              places?: Array<{
                id: string;
                displayName?: { text: string };
                formattedAddress?: string;
              }>;
            };
            if (Array.isArray(data.places) && data.places.length > 0) {
              for (const p of data.places) {
                if (p.id) {
                  results.push({
                    placeId: p.id,
                    name: p.displayName?.text || query,
                    address: p.formattedAddress || '',
                    reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(p.id)}`,
                  });
                  if (results.length >= 5) break;
                }
              }
            }
          } else {
            // Fallback to legacy endpoint if legacy API is enabled instead
            const googleUrl = new URL(
              'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
            );
            googleUrl.searchParams.set('input', query);
            googleUrl.searchParams.set('inputtype', 'textquery');
            googleUrl.searchParams.set('fields', 'place_id,name,formatted_address');
            googleUrl.searchParams.set('key', env.GOOGLE_PLACES_API_KEY);

            const legacyController = new AbortController();
            const legacyTimeout = setTimeout(() => legacyController.abort(), 5000);
            let legacyResponse: globalThis.Response;
            try {
              legacyResponse = await fetch(googleUrl.toString(), {
                signal: legacyController.signal,
              });
            } finally {
              clearTimeout(legacyTimeout);
            }
            if (legacyResponse.ok) {
              const data = (await legacyResponse.json()) as {
                status?: string;
                candidates?: Array<{ place_id: string; name: string; formatted_address: string }>;
              };
              if (
                data.status === 'OK' &&
                Array.isArray(data.candidates) &&
                data.candidates.length > 0
              ) {
                for (const cand of data.candidates) {
                  if (cand.place_id) {
                    results.push({
                      placeId: cand.place_id,
                      name: cand.name || query,
                      address: cand.formatted_address || '',
                      reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(cand.place_id)}`,
                    });
                    if (results.length >= 5) break;
                  }
                }
              }
            }
          }
        } catch {
          // Ignore external network error, fall through to results
        }
      }

      const topResults = results.slice(0, 5);

      res.status(200).json({
        results: topResults,
        hasApiKey: Boolean(env.GOOGLE_PLACES_API_KEY),
        message:
          topResults.length === 0
            ? env.GOOGLE_PLACES_API_KEY
              ? 'No matching places found on Google Maps for this query.'
              : 'Google Places API key is not configured for automatic name search. Please paste your Google Maps link or Place ID directly, or use the Google Place ID Finder.'
            : undefined,
      });
    } catch (error) {
      next(error);
    }
  },
);

const RespondImpersonationSchema = z.object({
  action: z.enum(['approve', 'decline', 'revoke']),
});

/**
 * GET /api/v1/admin/restaurants/:restaurantId/impersonation-requests/pending
 * Returns active pending impersonation requests awaiting restaurant administrator decision,
 * as well as currently active approved support access sessions.
 */
adminRestaurantRouter.get(
  '/admin/restaurants/:restaurantId/impersonation-requests/pending',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const now = new Date();

      const { pending, activeApproved } = await withTenantContext(
        restaurantId,
        async (executor) => {
          const [pendingRow] = await executor
            .select()
            .from(impersonationRequests)
            .where(
              and(
                eq(impersonationRequests.restaurantId, restaurantId),
                eq(impersonationRequests.status, 'pending'),
                gt(impersonationRequests.expiresAt, now),
              ),
            )
            .orderBy(desc(impersonationRequests.createdAt))
            .limit(1);

          // Check for actively approved support access within 1-hour session window
          const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
          const [activeRow] = await executor
            .select()
            .from(impersonationRequests)
            .where(
              and(
                eq(impersonationRequests.restaurantId, restaurantId),
                eq(impersonationRequests.status, 'approved'),
                gt(impersonationRequests.updatedAt, oneHourAgo),
              ),
            )
            .orderBy(desc(impersonationRequests.updatedAt))
            .limit(1);

          return { pending: pendingRow, activeApproved: activeRow };
        },
      );

      res.status(200).json({
        pendingRequest: pending
          ? {
              id: pending.id,
              impersonatorEmail: pending.impersonatorEmail,
              reason: pending.reason,
              expiresAt: pending.expiresAt,
              createdAt: pending.createdAt,
            }
          : null,
        activeAccess: activeApproved
          ? {
              id: activeApproved.id,
              impersonatorEmail: activeApproved.impersonatorEmail,
              reason: activeApproved.reason,
              approvedAt: activeApproved.respondedAt || activeApproved.updatedAt,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/impersonation-requests/:requestId/respond
 * Restaurant administrator approves, declines, or revokes an impersonation request.
 */
adminRestaurantRouter.post(
  '/admin/restaurants/:restaurantId/impersonation-requests/:requestId/respond',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = UuidParamSchema.parse(req.params.restaurantId);
      const requestId = UuidParamSchema.parse(req.params.requestId);
      const { action } = RespondImpersonationSchema.parse(req.body);

      const result = await withTenantContext(restaurantId, async (executor) => {
        const [requestRecord] = await executor
          .select()
          .from(impersonationRequests)
          .where(
            and(
              eq(impersonationRequests.id, requestId),
              eq(impersonationRequests.restaurantId, restaurantId),
            ),
          )
          .limit(1);

        if (!requestRecord) {
          throw new NotFoundError('Impersonation request not found');
        }

        const now = new Date();

        if (action === 'revoke') {
          await executor
            .update(impersonationRequests)
            .set({
              status: 'revoked',
              token: null,
              updatedAt: now,
            })
            .where(eq(impersonationRequests.id, requestRecord.id));

          await impersonationSessionService.markRevoked(requestRecord.id);

          await auditService.record({
            restaurantId: restaurantId!,
            actorId: req.user!.id,
            actorType: 'restaurant_user',
            action: 'IMPERSONATION_REVOKED',
            entityType: 'impersonation_request',
            entityId: requestRecord.id,
            beforeState: { status: requestRecord.status },
            afterState: {
              status: 'revoked',
              impersonatorId: requestRecord.impersonatorId,
              impersonatorEmail: requestRecord.impersonatorEmail,
              reason: requestRecord.reason,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });

          return {
            message: 'Support access revoked',
            status: 'revoked',
          };
        }

        if (requestRecord.status !== 'pending') {
          throw new ConflictError(`This request has already been ${requestRecord.status}`);
        }

        if (now > new Date(requestRecord.expiresAt)) {
          await executor
            .update(impersonationRequests)
            .set({ status: 'expired', updatedAt: now })
            .where(eq(impersonationRequests.id, requestRecord.id));
          throw new ConflictError('This support request has expired');
        }

        if (action === 'approve') {
          // Issue delegated impersonation token bound to impersonationRequestId for revocation enforcement
          const impersonationToken = authService.generateAccessToken({
            sub: req.user!.id,
            role: 'admin',
            realm: 'admin',
            restaurantId,
            isImpersonated: true,
            impersonationRequestId: requestRecord.id,
            impersonatorId: requestRecord.impersonatorId,
            impersonatorEmail: requestRecord.impersonatorEmail,
            jti: randomUUID(),
          });

          await executor
            .update(impersonationRequests)
            .set({
              status: 'approved',
              token: impersonationToken,
              respondedAt: now,
              updatedAt: now,
            })
            .where(eq(impersonationRequests.id, requestRecord.id));

          await auditService.record({
            restaurantId: restaurantId!,
            actorId: req.user!.id,
            actorType: 'restaurant_user',
            action: 'IMPERSONATION_APPROVED',
            entityType: 'impersonation_request',
            entityId: requestRecord.id,
            beforeState: { status: 'pending' },
            afterState: {
              status: 'approved',
              impersonatorId: requestRecord.impersonatorId,
              impersonatorEmail: requestRecord.impersonatorEmail,
              reason: requestRecord.reason,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });

          return {
            message: 'Support access request approved',
            status: 'approved',
          };
        }

        await executor
          .update(impersonationRequests)
          .set({
            status: 'declined',
            respondedAt: now,
            updatedAt: now,
          })
          .where(eq(impersonationRequests.id, requestRecord.id));

        await auditService.record({
          restaurantId: restaurantId!,
          actorId: req.user!.id,
          actorType: 'restaurant_user',
          action: 'IMPERSONATION_DECLINED',
          entityType: 'impersonation_request',
          entityId: requestRecord.id,
          beforeState: { status: 'pending' },
          afterState: {
            status: 'declined',
            impersonatorId: requestRecord.impersonatorId,
            impersonatorEmail: requestRecord.impersonatorEmail,
            reason: requestRecord.reason,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        return {
          message: 'Support access request declined',
          status: 'declined',
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);
