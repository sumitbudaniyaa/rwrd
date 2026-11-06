import { eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import { db, type Database } from '../db/index.js';
import { pageEvents, tipIntents, reviewTaps, staff, tables } from '../db/schema/index.js';

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface MetricSummary {
  scans: number;
  staffViews: number;
  tipsInitiatedCount: number;
  tipsInitiatedVolumeInr: number;
  reviewTaps: number;
}

export interface DailyDataPoint {
  date: string; // YYYY-MM-DD
  scans: number;
  staffViews: number;
  tipsInitiatedCount: number;
  tipsInitiatedVolumeInr: number;
  reviewTaps: number;
}

export interface StaffBreakdownItem {
  staffId: string;
  displayName: string;
  roleLabel: string;
  tipsInitiatedCount: number;
  tipsInitiatedVolumeInr: number;
  averageTipInr: number;
}

export interface AnalyticsResponse {
  dateRange: AnalyticsDateRange;
  metrics: MetricSummary;
  dailyTimeline: DailyDataPoint[];
  staffBreakdown: StaffBreakdownItem[];
}

export interface TipIntentExportRow {
  id: string;
  createdAt: string;
  staffName: string;
  roleLabel: string;
  amountInr: number;
  status: string;
  tableNumber: string;
}

export class AnalyticsRepository {
  constructor(private readonly database: Database = db) {}

  /**
   * Retrieves aggregated analytics for a restaurant within a specified date window.
   */
  async getAnalytics(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsResponse> {
    // 1. Fetch Page Events (Scans & Staff Views)
    const eventRows = await this.database
      .select({
        eventType: pageEvents.eventType,
        createdAt: pageEvents.createdAt,
      })
      .from(pageEvents)
      .where(
        and(
          eq(pageEvents.restaurantId, restaurantId),
          gte(pageEvents.createdAt, startDate),
          lte(pageEvents.createdAt, endDate),
        ),
      );

    // 2. Fetch Tip Intents
    const intentRows = await this.database
      .select({
        id: tipIntents.id,
        amountInr: tipIntents.amountInr,
        createdAt: tipIntents.createdAt,
        staffId: tipIntents.staffId,
        displayName: staff.displayName,
        roleLabel: staff.roleLabel,
      })
      .from(tipIntents)
      .innerJoin(staff, eq(tipIntents.staffId, staff.id))
      .where(
        and(
          eq(tipIntents.restaurantId, restaurantId),
          gte(tipIntents.createdAt, startDate),
          lte(tipIntents.createdAt, endDate),
        ),
      );

    // 3. Fetch Google Review Taps
    const reviewRows = await this.database
      .select({
        createdAt: reviewTaps.createdAt,
      })
      .from(reviewTaps)
      .where(
        and(
          eq(reviewTaps.restaurantId, restaurantId),
          gte(reviewTaps.createdAt, startDate),
          lte(reviewTaps.createdAt, endDate),
        ),
      );

    // 4. Fetch all active staff for the tenant
    const activeStaffRows = await this.database
      .select({
        id: staff.id,
        displayName: staff.displayName,
        roleLabel: staff.roleLabel,
      })
      .from(staff)
      .where(
        and(
          eq(staff.restaurantId, restaurantId),
          eq(staff.isActive, true),
          isNull(staff.deletedAt),
        ),
      );

    // Metrics aggregates
    let scans = 0;
    let staffViews = 0;
    const dailyMap = new Map<string, DailyDataPoint>();

    // Helper to get or init daily bucket
    const getDailyBucket = (dateStr: string): DailyDataPoint => {
      let bucket = dailyMap.get(dateStr);
      if (!bucket) {
        bucket = {
          date: dateStr,
          scans: 0,
          staffViews: 0,
          tipsInitiatedCount: 0,
          tipsInitiatedVolumeInr: 0,
          reviewTaps: 0,
        };
        dailyMap.set(dateStr, bucket);
      }
      return bucket;
    };

    // Populate events
    for (const ev of eventRows) {
      const day = ev.createdAt.toISOString().slice(0, 10);
      const bucket = getDailyBucket(day);
      if (ev.eventType === 'qr_scan') {
        scans++;
        bucket.scans++;
      } else if (ev.eventType === 'staff_view') {
        staffViews++;
        bucket.staffViews++;
      }
    }

    // Populate tip intents
    let tipsInitiatedCount = 0;
    let tipsInitiatedVolumeInr = 0;
    const staffMap = new Map<
      string,
      {
        staffId: string;
        displayName: string;
        roleLabel: string;
        count: number;
        volume: number;
      }
    >();

    // Initialize all active staff in the breakdown map
    for (const s of activeStaffRows) {
      staffMap.set(s.id, {
        staffId: s.id,
        displayName: s.displayName,
        roleLabel: s.roleLabel || 'Server',
        count: 0,
        volume: 0,
      });
    }

    for (const intent of intentRows) {
      tipsInitiatedCount++;
      tipsInitiatedVolumeInr += intent.amountInr;

      const day = intent.createdAt.toISOString().slice(0, 10);
      const bucket = getDailyBucket(day);
      bucket.tipsInitiatedCount++;
      bucket.tipsInitiatedVolumeInr += intent.amountInr;

      let staffEntry = staffMap.get(intent.staffId);
      if (!staffEntry) {
        staffEntry = {
          staffId: intent.staffId,
          displayName: intent.displayName,
          roleLabel: intent.roleLabel || 'Server',
          count: 0,
          volume: 0,
        };
        staffMap.set(intent.staffId, staffEntry);
      }
      staffEntry.count++;
      staffEntry.volume += intent.amountInr;
    }

    // Populate review taps
    const reviewTapsCount = reviewRows.length;
    for (const rev of reviewRows) {
      const day = rev.createdAt.toISOString().slice(0, 10);
      const bucket = getDailyBucket(day);
      bucket.reviewTaps++;
    }

    // Sort daily timeline chronologically
    const dailyTimeline = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Format staff breakdown sorted by total tips volume descending
    const staffBreakdown: StaffBreakdownItem[] = Array.from(staffMap.values())
      .map((item) => ({
        staffId: item.staffId,
        displayName: item.displayName,
        roleLabel: item.roleLabel,
        tipsInitiatedCount: item.count,
        tipsInitiatedVolumeInr: item.volume,
        averageTipInr: item.count > 0 ? Math.round(item.volume / item.count) : 0,
      }))
      .sort((a, b) => b.tipsInitiatedVolumeInr - a.tipsInitiatedVolumeInr);

    return {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metrics: {
        scans,
        staffViews,
        tipsInitiatedCount,
        tipsInitiatedVolumeInr,
        reviewTaps: reviewTapsCount,
      },
      dailyTimeline,
      staffBreakdown,
    };
  }

  /**
   * Retrieves raw tip intent records joined with staff and table details for CSV export.
   */
  async getTipIntentsForExport(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TipIntentExportRow[]> {
    const rows = await this.database
      .select({
        id: tipIntents.id,
        createdAt: tipIntents.createdAt,
        amountInr: tipIntents.amountInr,
        status: tipIntents.status,
        staffName: staff.displayName,
        roleLabel: staff.roleLabel,
        tableNumber: tables.tableNumber,
      })
      .from(tipIntents)
      .innerJoin(staff, eq(tipIntents.staffId, staff.id))
      .leftJoin(tables, eq(tipIntents.tableId, tables.id))
      .where(
        and(
          eq(tipIntents.restaurantId, restaurantId),
          gte(tipIntents.createdAt, startDate),
          lte(tipIntents.createdAt, endDate),
        ),
      )
      .orderBy(desc(tipIntents.createdAt));

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      staffName: r.staffName,
      roleLabel: r.roleLabel || 'Server',
      amountInr: r.amountInr,
      status: r.status,
      tableNumber: r.tableNumber ?? 'General',
    }));
  }
}

export const analyticsRepository = new AnalyticsRepository();
