import { gte, eq, sql, and } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { withSystemContext } from '../db/rls.js';
import {
  restaurants,
  subscriptions,
  billingPlans,
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

  private runSystem<T>(fn: (executor: Database) => Promise<T>): Promise<T> {
    return this.database !== db
      ? fn(this.database)
      : withSystemContext('platform_metrics_aggregation', fn);
  }

  /**
   * Aggregates platform-wide telemetry, billing estimates, and 30-day activity trends via SQL.
   */
  async getGlobalMetrics(): Promise<PlatformMetricsResponse> {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      restaurantStatsRows,
      scanSummaryRows,
      scanDailyRows,
      tipSummaryRows,
      tipDailyRows,
      reviewSummaryRows,
      reviewDailyRows,
      leadSummaryRows,
    ] = await this.runSystem((executor) =>
      Promise.all([
        executor
          .select({
            totalRestaurants: sql<number>`count(*)::int`,
            suspendedRestaurants: sql<number>`count(*) filter (where ${restaurants.isSuspended} = true)::int`,
            churnedRestaurants: sql<number>`count(*) filter (where ${subscriptions.status} = 'cancelled')::int`,
            activeRestaurants: sql<number>`count(*) filter (where ${restaurants.isSuspended} = false and ${restaurants.isActive} = true and coalesce(${subscriptions.status}, 'unpaid') not in ('unpaid', 'cancelled'))::int`,
            newRestaurants30d: sql<number>`count(*) filter (where ${restaurants.createdAt} >= ${thirtyDaysAgo})::int`,
            estimatedMrrInr: sql<number>`coalesce(sum(${billingPlans.monthlyFeeInr}) filter (where ${restaurants.isSuspended} = false and ${restaurants.isActive} = true and coalesce(${subscriptions.status}, 'unpaid') not in ('unpaid', 'cancelled')), 0)::int`,
          })
          .from(restaurants)
          .leftJoin(subscriptions, eq(restaurants.id, subscriptions.restaurantId))
          .leftJoin(billingPlans, eq(subscriptions.planId, billingPlans.id)),

        executor
          .select({
            scansAllTime: sql<number>`count(*)::int`,
            scansToday: sql<number>`count(*) filter (where ${pageEvents.createdAt} >= ${startOfToday})::int`,
          })
          .from(pageEvents)
          .where(eq(pageEvents.eventType, 'qr_scan')),

        executor
          .select({
            date: sql<string>`to_char(${pageEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
            scans: sql<number>`count(*)::int`,
          })
          .from(pageEvents)
          .where(and(eq(pageEvents.eventType, 'qr_scan'), gte(pageEvents.createdAt, thirtyDaysAgo)))
          .groupBy(sql`to_char(${pageEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`),

        executor
          .select({
            tipsAllTimeCount: sql<number>`count(*)::int`,
            tipsAllTimeVolumeInr: sql<number>`coalesce(sum(${tipIntents.amountInr}), 0)::int`,
            tipsTodayCount: sql<number>`count(*) filter (where ${tipIntents.createdAt} >= ${startOfToday})::int`,
            tipsTodayVolumeInr: sql<number>`coalesce(sum(${tipIntents.amountInr}) filter (where ${tipIntents.createdAt} >= ${startOfToday}), 0)::int`,
          })
          .from(tipIntents),

        executor
          .select({
            date: sql<string>`to_char(${tipIntents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
            volume: sql<number>`coalesce(sum(${tipIntents.amountInr}), 0)::int`,
          })
          .from(tipIntents)
          .where(gte(tipIntents.createdAt, thirtyDaysAgo))
          .groupBy(sql`to_char(${tipIntents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`),

        executor
          .select({
            reviewTapsAllTime: sql<number>`count(*)::int`,
            reviewTapsToday: sql<number>`count(*) filter (where ${reviewTaps.createdAt} >= ${startOfToday})::int`,
          })
          .from(reviewTaps),

        executor
          .select({
            date: sql<string>`to_char(${reviewTaps.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
          })
          .from(reviewTaps)
          .where(gte(reviewTaps.createdAt, thirtyDaysAgo))
          .groupBy(sql`to_char(${reviewTaps.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`),

        executor
          .select({
            inboundLeadsCount: sql<number>`count(*)::int`,
            pendingLeadsCount: sql<number>`count(*) filter (where ${leads.status} = 'new')::int`,
          })
          .from(leads),
      ]),
    );

    const rStats = restaurantStatsRows[0];
    const totalRestaurants = rStats?.totalRestaurants ?? 0;
    const activeRestaurants = rStats?.activeRestaurants ?? 0;
    const suspendedRestaurants = rStats?.suspendedRestaurants ?? 0;
    const churnedRestaurants = rStats?.churnedRestaurants ?? 0;
    const newRestaurants30d = rStats?.newRestaurants30d ?? 0;
    const estimatedMrrInr = rStats?.estimatedMrrInr ?? 0;
    const churnRatePercent =
      totalRestaurants > 0 ? Number(((churnedRestaurants / totalRestaurants) * 100).toFixed(1)) : 0;

    const scansDailyMap = new Map(scanDailyRows.map((row) => [row.date, row.scans]));
    const tipsDailyMap = new Map(
      tipDailyRows.map((row) => [row.date, { count: row.count, volume: row.volume }]),
    );
    const reviewDailyMap = new Map(reviewDailyRows.map((row) => [row.date, row.count]));

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
        scansToday: scanSummaryRows[0]?.scansToday ?? 0,
        scansAllTime: scanSummaryRows[0]?.scansAllTime ?? 0,
        tipsInitiatedTodayCount: tipSummaryRows[0]?.tipsTodayCount ?? 0,
        tipsInitiatedTodayVolumeInr: tipSummaryRows[0]?.tipsTodayVolumeInr ?? 0,
        tipsInitiatedAllTimeCount: tipSummaryRows[0]?.tipsAllTimeCount ?? 0,
        tipsInitiatedAllTimeVolumeInr: tipSummaryRows[0]?.tipsAllTimeVolumeInr ?? 0,
        reviewTapsToday: reviewSummaryRows[0]?.reviewTapsToday ?? 0,
        reviewTapsAllTime: reviewSummaryRows[0]?.reviewTapsAllTime ?? 0,
        estimatedMrrInr,
        inboundLeadsCount: leadSummaryRows[0]?.inboundLeadsCount ?? 0,
        pendingLeadsCount: leadSummaryRows[0]?.pendingLeadsCount ?? 0,
      },
      timeline30d,
    };
  }
}

export const platformMetricsRepository = new PlatformMetricsRepository();
