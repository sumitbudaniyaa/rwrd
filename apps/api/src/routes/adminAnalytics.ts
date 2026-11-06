import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { analyticsRepository } from '../repositories/analyticsRepository.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { ValidationError } from '../errors/appError.js';

export const adminAnalyticsRouter = Router();

const AnalyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function parseDateRange(query: unknown): { startDate: Date; endDate: Date } {
  const parsed = AnalyticsQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', [
      {
        name: parsed.error.issues[0]?.path.join('.') || 'query',
        reason: parsed.error.issues[0]?.message || 'Invalid query',
      },
    ]);
  }

  const { startDate: startStr, endDate: endStr } = parsed.data;

  let endDate: Date;
  if (endStr) {
    const endMs = Date.parse(endStr);
    if (isNaN(endMs)) {
      throw new ValidationError('Invalid endDate format. Expected ISO-8601 string or YYYY-MM-DD.', [
        { name: 'endDate', reason: 'Invalid date format' },
      ]);
    }
    endDate = new Date(endMs);
    // If date string is YYYY-MM-DD, set to end of that day (23:59:59.999 UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(endStr.trim())) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
  } else {
    endDate = new Date();
  }

  let startDate: Date;
  if (startStr) {
    const startMs = Date.parse(startStr);
    if (isNaN(startMs)) {
      throw new ValidationError(
        'Invalid startDate format. Expected ISO-8601 string or YYYY-MM-DD.',
        [{ name: 'startDate', reason: 'Invalid date format' }],
      );
    }
    startDate = new Date(startMs);
    // If date string is YYYY-MM-DD, set to start of that day (00:00:00.000 UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(startStr.trim())) {
      startDate.setUTCHours(0, 0, 0, 0);
    }
  } else {
    // Default to 30 days prior to endDate
    startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);
  }

  if (startDate.getTime() > endDate.getTime()) {
    throw new ValidationError('startDate cannot be after endDate', [
      { name: 'startDate', reason: 'startDate must be before or equal to endDate' },
    ]);
  }

  return { startDate, endDate };
}

/**
 * GET /api/v1/admin/restaurants/:restaurantId/analytics
 * Returns aggregated telemetry metrics, daily timeline, and per-waiter initiated tip metrics.
 * Invariant: Label everything strictly as "Tips initiated", never "Tips received".
 */
adminAnalyticsRouter.get(
  '/admin/restaurants/:restaurantId/analytics',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const { startDate, endDate } = parseDateRange(req.query);

      const data = await analyticsRepository.getAnalytics(restaurantId, startDate, endDate);

      res.json(data);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/admin/restaurants/:restaurantId/analytics/export
 * Downloads RFC 4180 CSV export of tip intents initiated in the date window.
 */
adminAnalyticsRouter.get(
  '/admin/restaurants/:restaurantId/analytics/export',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const { startDate, endDate } = parseDateRange(req.query);

      const rows = await analyticsRepository.getTipIntentsForExport(
        restaurantId,
        startDate,
        endDate,
      );

      const escapeCsv = (val: string | number): string => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = [
        'Tip Intent ID',
        'Date (UTC)',
        'Staff Name',
        'Role',
        'Amount (INR)',
        'Status',
        'Table Number',
      ];

      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(
          [
            escapeCsv(row.id),
            escapeCsv(row.createdAt),
            escapeCsv(row.staffName),
            escapeCsv(row.roleLabel),
            escapeCsv(row.amountInr),
            escapeCsv(row.status),
            escapeCsv(row.tableNumber),
          ].join(','),
        );
      }

      const csvData = csvLines.join('\r\n');
      const filename = `tiptable-tips-initiated-${restaurantId}-${startDate.toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } catch (error) {
      next(error);
    }
  },
);
