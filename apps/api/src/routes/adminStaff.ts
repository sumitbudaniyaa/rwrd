import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { staffRepository } from '../repositories/staffRepository.js';
import { encryptVpa, maskVpa } from '../services/crypto.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireTenant } from '../middleware/rbac.js';
import { NotFoundError } from '../errors/appError.js';

export const adminStaffRouter = Router();

const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

const CreateStaffSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(100),
  roleLabel: z.string().trim().max(50).optional().default('Server'),
  vpa: z
    .string()
    .trim()
    .regex(VPA_REGEX, 'Invalid UPI VPA format. Must be handle@psp (e.g. name@okaxis)'),
  photoUrl: z.string().trim().url().optional(),
});

const UpdateStaffSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  roleLabel: z.string().trim().max(50).optional(),
  vpa: z.string().trim().regex(VPA_REGEX, 'Invalid UPI VPA format').optional(),
  photoUrl: z.string().trim().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

interface StaffAdminDTO {
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

/**
 * GET /api/v1/admin/restaurants/:restaurantId/staff
 * Lists all waitstaff (active and inactive) with masked VPAs.
 */
adminStaffRouter.get(
  '/admin/restaurants/:restaurantId/staff',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const staffList = await staffRepository.findAllByRestaurant(restaurantId);

      const dtoList: StaffAdminDTO[] = staffList.map((s) => ({
        id: s.id,
        restaurantId: s.restaurantId,
        displayName: s.displayName,
        roleLabel: s.roleLabel,
        maskedVpa: s.vpaMasked,
        photoUrl: s.photoUrl,
        isActive: s.isActive,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      res.status(200).json({ staff: dtoList });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/staff
 * Creates a new waitstaff record with encrypted VPA and audit logging.
 */
adminStaffRouter.post(
  '/admin/restaurants/:restaurantId/staff',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const body = CreateStaffSchema.parse(req.body);

      // Encrypt VPA using AES-256-GCM
      const encrypted = encryptVpa(body.vpa);

      const created = await staffRepository.create(restaurantId, {
        displayName: body.displayName,
        roleLabel: body.roleLabel || 'Server',
        vpaEncrypted: encrypted.ciphertext,
        vpaIv: encrypted.iv,
        vpaTag: encrypted.tag,
        vpaMasked: maskVpa(body.vpa),
        photoUrl: body.photoUrl,
        isActive: true,
        isOnShift: true,
        consentRecordedAt: new Date(),
      });

      // Record audit log
      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'STAFF_CREATED',
          entityType: 'staff',
          entityId: created.id,
          afterState: {
            displayName: created.displayName,
            roleLabel: created.roleLabel,
            maskedVpa: created.vpaMasked,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      const dto: StaffAdminDTO = {
        id: created.id,
        restaurantId: created.restaurantId,
        displayName: created.displayName,
        roleLabel: created.roleLabel,
        maskedVpa: created.vpaMasked,
        photoUrl: created.photoUrl,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      res.status(201).json({ staff: dto });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/admin/restaurants/:restaurantId/staff/:staffId
 */
adminStaffRouter.get(
  '/admin/restaurants/:restaurantId/staff/:staffId',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const staffId = req.params.staffId as string;

      const found = await staffRepository.findById(restaurantId, staffId);
      if (!found) {
        throw new NotFoundError('Staff member not found');
      }

      const dto: StaffAdminDTO = {
        id: found.id,
        restaurantId: found.restaurantId,
        displayName: found.displayName,
        roleLabel: found.roleLabel,
        maskedVpa: found.vpaMasked,
        photoUrl: found.photoUrl,
        isActive: found.isActive,
        createdAt: found.createdAt.toISOString(),
        updatedAt: found.updatedAt.toISOString(),
      };

      res.status(200).json({ staff: dto });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/v1/admin/restaurants/:restaurantId/staff/:staffId
 * Updates staff details. If VPA is updated, re-encrypts and records audit log.
 */
adminStaffRouter.put(
  '/admin/restaurants/:restaurantId/staff/:staffId',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const staffId = req.params.staffId as string;
      const body = UpdateStaffSchema.parse(req.body);

      const existing = await staffRepository.findById(restaurantId, staffId);
      if (!existing) {
        throw new NotFoundError('Staff member not found');
      }

      const updateData: Parameters<typeof staffRepository.update>[2] = {};

      if (body.displayName !== undefined) updateData.displayName = body.displayName;
      if (body.roleLabel !== undefined) updateData.roleLabel = body.roleLabel;
      if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      let vpaChanged = false;
      if (body.vpa) {
        const encrypted = encryptVpa(body.vpa);
        updateData.vpaEncrypted = encrypted.ciphertext;
        updateData.vpaIv = encrypted.iv;
        updateData.vpaTag = encrypted.tag;
        updateData.vpaMasked = maskVpa(body.vpa);
        vpaChanged = true;
      }

      const updated = await staffRepository.update(restaurantId, staffId, updateData);
      if (!updated) {
        throw new NotFoundError('Staff member not found');
      }

      // Record audit log
      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: vpaChanged ? 'STAFF_VPA_UPDATED' : 'STAFF_UPDATED',
          entityType: 'staff',
          entityId: updated.id,
          beforeState: {
            displayName: existing.displayName,
            roleLabel: existing.roleLabel,
            maskedVpa: existing.vpaMasked,
            isActive: existing.isActive,
          },
          afterState: {
            displayName: updated.displayName,
            roleLabel: updated.roleLabel,
            maskedVpa: updated.vpaMasked,
            isActive: updated.isActive,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      const dto: StaffAdminDTO = {
        id: updated.id,
        restaurantId: updated.restaurantId,
        displayName: updated.displayName,
        roleLabel: updated.roleLabel,
        maskedVpa: updated.vpaMasked,
        photoUrl: updated.photoUrl,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      res.status(200).json({ staff: dto });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/admin/restaurants/:restaurantId/staff/:staffId
 * Soft deletes a staff member within the tenant context.
 */
adminStaffRouter.delete(
  '/admin/restaurants/:restaurantId/staff/:staffId',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const staffId = req.params.staffId as string;

      const existing = await staffRepository.findById(restaurantId, staffId);
      if (!existing) {
        throw new NotFoundError('Staff member not found');
      }

      const deleted = await staffRepository.softDelete(restaurantId, staffId);
      if (!deleted) {
        throw new NotFoundError('Staff member not found');
      }

      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'STAFF_DELETED',
          entityType: 'staff',
          entityId: staffId,
          beforeState: {
            displayName: existing.displayName,
            roleLabel: existing.roleLabel,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      res.status(200).json({ message: 'Staff member removed successfully' });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/admin/restaurants/:restaurantId/staff/:staffId/toggle-active
 * Toggles active/inactive state for a staff member.
 */
adminStaffRouter.post(
  '/admin/restaurants/:restaurantId/staff/:staffId/toggle-active',
  requireAuth('admin'),
  requireTenant('restaurantId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.params.restaurantId as string;
      const staffId = req.params.staffId as string;

      const existing = await staffRepository.findById(restaurantId, staffId);
      if (!existing) {
        throw new NotFoundError('Staff member not found');
      }

      const newStatus = !existing.isActive;
      const updated = await staffRepository.update(restaurantId, staffId, {
        isActive: newStatus,
      });

      if (!updated) {
        throw new NotFoundError('Staff member not found');
      }

      if (req.user?.id) {
        await auditService.record({
          restaurantId,
          actorId: req.user.id,
          actorType: 'restaurant_user',
          action: 'STAFF_STATUS_CHANGED',
          entityType: 'staff',
          entityId: staffId,
          beforeState: { isActive: existing.isActive },
          afterState: { isActive: newStatus },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      const dto: StaffAdminDTO = {
        id: updated.id,
        restaurantId: updated.restaurantId,
        displayName: updated.displayName,
        roleLabel: updated.roleLabel,
        maskedVpa: updated.vpaMasked,
        photoUrl: updated.photoUrl,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      res.status(200).json({ staff: dto });
    } catch (error) {
      next(error);
    }
  },
);
