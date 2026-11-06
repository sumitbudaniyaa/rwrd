import { Router, type Request, type Response, type NextFunction } from 'express';
import { platformMetricsRepository } from '../repositories/platformMetricsRepository.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { portalIpAllowlist } from '../middleware/ipAllowlist.js';

export const portalMetricsRouter = Router();

// Enforce portal IP allowlist protection
portalMetricsRouter.use(portalIpAllowlist());

/**
 * GET /api/v1/portal/metrics
 * Returns platform-wide KPIs, active/suspended/churned establishments, MRR, and 30-day activity timeline.
 * Accessible to super_admin, support, and finance roles.
 */
portalMetricsRouter.get(
  '/portal/metrics',
  requireAuth('portal'),
  requireRole(['super_admin', 'support', 'finance']),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await platformMetricsRepository.getGlobalMetrics();
      res.status(200).json(metrics);
    } catch (error) {
      next(error);
    }
  },
);
