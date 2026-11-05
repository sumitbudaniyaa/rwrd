import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { qrTokenRepository } from '../repositories/qrTokenRepository.js';
import { tableRepository } from '../repositories/tableRepository.js';
import { restaurantRepository } from '../repositories/restaurantRepository.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { NotFoundError } from '../errors/appError.js';
import { env } from '../config/env.js';

export const adminQrRouter = Router();

const RotateQrSchema = z.object({
  tableId: z.string().uuid().nullable().optional(),
});

const CreateTableSchema = z.object({
  tableNumber: z.string().trim().min(1, 'Table number is required').max(50),
  sectionName: z.string().trim().max(100).optional(),
});

interface QrItemDTO {
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

/**
 * GET /api/v1/admin/restaurants/:restaurantId/qr
 * Retrieves all active QR tokens for the restaurant, provisioning the default root token if none exists.
 */
adminQrRouter.get(
  '/admin/restaurants/:restaurantId/qr',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;

      const restaurant = await restaurantRepository.findById(restaurantId);
      if (!restaurant || restaurant.deletedAt) {
        throw new NotFoundError('Restaurant not found');
      }

      const [tablesList, rawTokens] = await Promise.all([
        tableRepository.findByRestaurant(restaurantId),
        qrTokenRepository.findByRestaurant(restaurantId),
      ]);

      let tokens = rawTokens;

      // If restaurant has no QR token at all, provision the default restaurant QR token
      if (tokens.length === 0) {
        const defaultToken = crypto.randomUUID();
        const created = await qrTokenRepository.rotate(restaurantId, null, defaultToken);
        tokens = [created];
      }

      const tableMap = new Map(tablesList.map((t) => [t.id, t]));

      const dtoList: QrItemDTO[] = tokens.map((tokenRow) => {
        const table = tokenRow.tableId ? tableMap.get(tokenRow.tableId) : null;
        return {
          id: tokenRow.id,
          restaurantId: tokenRow.restaurantId,
          tableId: tokenRow.tableId,
          tableNumber: table?.tableNumber || null,
          sectionName: table?.sectionName || null,
          token: tokenRow.token,
          customerUrl: `${env.CUSTOMER_APP_URL}/r/${tokenRow.token}`,
          isActive: tokenRow.isActive,
          createdAt: tokenRow.createdAt.toISOString(),
        };
      });

      res.status(200).json({
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
        },
        tokens: dtoList,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/qr/rotate
 * Invalidates the active token and provisions a new cryptographic token for the restaurant or specific table.
 */
adminQrRouter.post(
  '/admin/restaurants/:restaurantId/qr/rotate',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const body = RotateQrSchema.parse(req.body);
      const targetTableId = body.tableId || null;

      // Verify table belongs to tenant if specified
      if (targetTableId) {
        const table = await tableRepository.findById(restaurantId, targetTableId);
        if (!table) {
          throw new NotFoundError('Table not found within this restaurant');
        }
      }

      // Generate secure non-guessable token
      const newToken = crypto.randomUUID();
      const rotated = await qrTokenRepository.rotate(restaurantId, targetTableId, newToken);

      // Record audit event
      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'QR_TOKEN_ROTATED',
          entityType: 'qr_token',
          entityId: rotated.id,
          afterState: {
            tableId: targetTableId,
            token: rotated.token,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      res.status(200).json({
        token: {
          id: rotated.id,
          restaurantId: rotated.restaurantId,
          tableId: rotated.tableId,
          token: rotated.token,
          customerUrl: `${env.CUSTOMER_APP_URL}/r/${rotated.token}`,
          isActive: rotated.isActive,
          createdAt: rotated.createdAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/tables
 * Adds a new dining table and automatically provisions its unique QR token.
 */
adminQrRouter.post(
  '/admin/restaurants/:restaurantId/tables',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const body = CreateTableSchema.parse(req.body);

      const createdTable = await tableRepository.create(restaurantId, {
        tableNumber: body.tableNumber,
        sectionName: body.sectionName || null,
        isActive: true,
      });

      const tokenString = crypto.randomUUID();
      const qrRow = await qrTokenRepository.rotate(restaurantId, createdTable.id, tokenString);

      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'TABLE_CREATED',
          entityType: 'table',
          entityId: createdTable.id,
          afterState: {
            tableNumber: createdTable.tableNumber,
            sectionName: createdTable.sectionName,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      res.status(201).json({
        table: {
          id: createdTable.id,
          tableNumber: createdTable.tableNumber,
          sectionName: createdTable.sectionName,
        },
        token: {
          id: qrRow.id,
          token: qrRow.token,
          customerUrl: `${env.CUSTOMER_APP_URL}/r/${qrRow.token}`,
          isActive: qrRow.isActive,
          createdAt: qrRow.createdAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
