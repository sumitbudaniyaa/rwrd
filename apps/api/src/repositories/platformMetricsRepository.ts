import { gte, eq } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import {
  restaurants,
  subscriptions,
  pageEvents,
  tipIntents,
  reviewTaps,
  leads,
} from '../db/schema/index.js';

export interface GlobalMetricsSummary {
  activeRestaurants: number;
  suspendedRestaurants: number;
  totalRestaurants: number;
  newRestaurants30d: number;
  churnedRestaurants: number;
  churnRatePercent: number;
  scansToday: number;
  scansAllTime: number;
  tipsInitiatedTodayCount: number;
  tipsInitiatedTodayVolumeInr: number;
  tipsInitiatedAllTimeCount: number;
  tipsInitiatedAllTimeVolumeInr: number;
  reviewTapsToday: number;
  reviewTapsAllTime: number;
  estimatedMrrInr: number;
  inboundLeadsCount: number;
  pendingLeadsCount: number;
}

export interface DailyPlatformMetric {
  date: string;
  scans: number;
  tipsInitiatedCount: number;
  tipsInitiatedVolumeInr: number;
  reviewTaps: number;
}

export interface PlatformMetricsResponse {
  summary: GlobalMetricsSummary;
  timeline30d: DailyPlatformMetric[];
}

export class PlatformMetricsRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Aggregates platform-wide telemetry, billing estimates, and 30-day activity trends.
   */
  async getGlobalMetrics(): Promise<PlatformMetricsResponse> {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch Restaurant counts with joined subscription status
    const allRestaurants = await this.database
      .select({
        id: restaurants.id,
        isActive: restaurants.isActive,
        isSuspended: restaurants.isSuspended,
        deletedAt: restaurants.deletedAt,
        createdAt: restaurants.createdAt,
        subscriptionStatus: subscriptions.status,
      })
      .from(restaurants)
      .leftJoin(subscriptions, eq(restaurants.id, subscriptions.restaurantId));

    let activeRestaurants = 0;
    let suspendedRestaurants = 0;
    let totalRestaurants = 0;
    let churnedRestaurants = 0;
    let newRestaurants30d = 0;

    for (const r of allRestaurants) {
      if (r.deletedAt) {
        churnedRestaurants++;
      } else {
        totalRestaurants++;
        if (r.isSuspended) {
          suspendedRestaurants++;
        } else if (
          r.isActive &&
          r.subscriptionStatus !== 'unpaid' &&
          r.subscriptionStatus !== 'cancelled'
        ) {
          activeRestaurants++;
        }

        if (r.createdAt >= thirtyDaysAgo) {
          newRestaurants30d++;
        }
      }
    }

    const totalEver = totalRestaurants + churnedRestaurants;
    const churnRatePercent =
      totalEver > 0 ? Number(((churnedRestaurants / totalEver) * 100).toFixed(1)) : 0;

    // Flat monthly platform fee per active restaurant in INR (₹999 standard)
    const FLAT_MONTHLY_FEE_INR = 999;
    const estimatedMrrInr = activeRestaurants * FLAT_MONTHLY_FEE_INR;

    // 2. Fetch Page Events (Scans)
    const recentEvents = await this.database
      .select({
        eventType: pageEvents.eventType,
        createdAt: pageEvents.createdAt,
      })
      .from(pageEvents)
      .where(gte(pageEvents.createdAt, thirtyDaysAgo));

    let scansToday = 0;
    let scans30d = 0;
    const scansDailyMap = new Map<string, number>();

    for (const ev of recentEvents) {
      if (ev.eventType === 'qr_scan') {
        scans30d++;
        if (ev.createdAt >= startOfToday) {
          scansToday++;
        }
        const day = ev.createdAt.toISOString().slice(0, 10);
        scansDailyMap.set(day, (scansDailyMap.get(day) || 0) + 1);
      }
    }

    // 3. Fetch Tip Intents
    const recentIntents = await this.database
      .select({
        amountInr: tipIntents.amountInr,
        createdAt: tipIntents.createdAt,
      })
      .from(tipIntents)
      .where(gte(tipIntents.createdAt, thirtyDaysAgo));

    let tipsInitiatedTodayCount = 0;
    let tipsInitiatedTodayVolumeInr = 0;
    let tipsInitiated30dCount = 0;
    let tipsInitiated30dVolumeInr = 0;
    const tipsDailyMap = new Map<string, { count: number; volume: number }>();

    for (const ti of recentIntents) {
      tipsInitiated30dCount++;
      tipsInitiated30dVolumeInr += ti.amountInr;

      if (ti.createdAt >= startOfToday) {
        tipsInitiatedTodayCount++;
        tipsInitiatedTodayVolumeInr += ti.amountInr;
      }

      const day = ti.createdAt.toISOString().slice(0, 10);
      const current = tipsDailyMap.get(day) || { count: 0, volume: 0 };
      current.count++;
      current.volume += ti.amountInr;
      tipsDailyMap.set(day, current);
    }

    // 4. Fetch Google Review Taps
    const recentReviews = await this.database
      .select({
        createdAt: reviewTaps.createdAt,
      })
      .from(reviewTaps)
      .where(gte(reviewTaps.createdAt, thirtyDaysAgo));

    let reviewTapsToday = 0;
    let reviewTaps30d = 0;
    const reviewDailyMap = new Map<string, number>();

    for (const rt of recentReviews) {
      reviewTaps30d++;
      if (rt.createdAt >= startOfToday) {
        reviewTapsToday++;
      }
      const day = rt.createdAt.toISOString().slice(0, 10);
      reviewDailyMap.set(day, (reviewDailyMap.get(day) || 0) + 1);
    }

    // 5. Inbound Leads count
    const leadRows = await this.database
      .select({
        status: leads.status,
      })
      .from(leads);

    const inboundLeadsCount = leadRows.length;
    const pendingLeadsCount = leadRows.filter((l) => l.status === 'new').length;

    // 6. Generate 30-Day Chronological Timeline
    const timeline30d: DailyPlatformMetric[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const tipsData = tipsDailyMap.get(dateStr) || { count: 0, volume: 0 };

      timeline30d.push({
        date: dateStr,
        scans: scansDailyMap.get(dateStr) || 0,
        tipsInitiatedCount: tipsData.count,
        tipsInitiatedVolumeInr: tipsData.volume,
        reviewTaps: reviewDailyMap.get(dateStr) || 0,
      });
    }

    return {
      summary: {
        activeRestaurants,
        suspendedRestaurants,
        totalRestaurants,
        newRestaurants30d,
        churnedRestaurants,
        churnRatePercent,
        scansToday,
        scansAllTime: scans30d,
        tipsInitiatedTodayCount,
        tipsInitiatedTodayVolumeInr,
        tipsInitiatedAllTimeCount: tipsInitiated30dCount,
        tipsInitiatedAllTimeVolumeInr: tipsInitiated30dVolumeInr,
        reviewTapsToday,
        reviewTapsAllTime: reviewTaps30d,
        estimatedMrrInr,
        inboundLeadsCount,
        pendingLeadsCount,
      },
      timeline30d,
    };
  }
}

export const platformMetricsRepository = new PlatformMetricsRepository();
