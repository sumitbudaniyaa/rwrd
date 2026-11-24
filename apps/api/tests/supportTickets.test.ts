import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/authService.js';
import { auditService } from '../src/services/auditService.js';
import { db } from '../src/db/index.js';

describe('Support Tickets Routes', () => {
  const app = createApp();
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const adminUserId = '33333333-3333-3333-3333-333333333333';
  const superAdminId = '99999999-9999-9999-9999-999999999999';

  const adminToken = authService.generateAccessToken({
    sub: adminUserId,
    role: 'admin',
    realm: 'admin',
    restaurantId,
  });

  const superAdminToken = authService.generateAccessToken({
    sub: superAdminId,
    role: 'super_admin',
    realm: 'portal',
  });

  const mockTicket = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    restaurantId,
    createdById: adminUserId,
    ticketNumber: 'TICK-123456789',
    category: 'complaint',
    priority: 'high',
    status: 'open',
    subject: 'UPI QR code not scanning at Table 4',
    description: 'Customers are reporting camera unable to recognize the code printed on table 4.',
    assignedStaffId: null,
    assignedStaffEmail: null,
    resolutionNote: null,
    resolvedAt: null,
    createdAt: new Date('2026-11-20T10:00:00Z'),
    updatedAt: new Date('2026-11-20T10:00:00Z'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('Admin Support Endpoints', () => {
    it('creates a new support ticket and emits audit log', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: () => ({
          returning: () => [mockTicket],
        }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/admin/restaurants/${restaurantId}/support/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'complaint',
          priority: 'high',
          subject: 'UPI QR code not scanning at Table 4',
          description:
            'Customers are reporting camera unable to recognize the code printed on table 4.',
        });

      expect(res.status).toBe(201);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.ticketNumber).toBe('TICK-123456789');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPORT_TICKET_CREATED',
          restaurantId,
          actorId: adminUserId,
        }),
      );
    });

    it('rejects ticket creation with invalid inputs (RFC 7807 problem)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/restaurants/${restaurantId}/support/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'invalid_category',
          subject: 'Hi',
          description: 'Short',
        });

      expect(res.status).toBe(422);
      expect(res.body.title).toBe('Unprocessable Entity');
    });

    it('rejects cross-tenant ticket creation with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/restaurants/${otherRestaurantId}/support/tickets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'complaint',
          priority: 'low',
          subject: 'Valid Subject Line',
          description: 'Valid description that is long enough.',
        });

      expect(res.status).toBe(403);
    });

    it('lists tickets for the authenticated restaurant', async () => {
      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => [mockTicket],
                }),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => [{ value: 1 }],
          }),
        } as any);

      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${restaurantId}/support/tickets`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(mockTicket.id);
    });

    it('retrieves a single ticket by id', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockTicket],
          }),
        }),
      } as any);

      const res = await request(app)
        .get(`/api/v1/admin/restaurants/${restaurantId}/support/tickets/${mockTicket.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket.id).toBe(mockTicket.id);
    });
  });

  describe('Portal Support Endpoints', () => {
    it('lists support tickets across restaurants with KPI summary', async () => {
      const portalTicketRow = {
        ...mockTicket,
        restaurantName: 'Jaipur Cafe',
        restaurantSlug: 'jaipur-cafe',
      };

      vi.spyOn(db, 'select')
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: () => [portalTicketRow],
                  }),
                }),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () => [{ value: 1 }],
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => [{ value: 1 }],
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => [{ value: 0 }],
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => [{ value: 0 }],
          }),
        } as any)
        .mockReturnValueOnce({
          from: () => ({
            where: () => [{ value: 0 }],
          }),
        } as any);

      const res = await request(app)
        .get('/api/v1/portal/support/tickets?status=open')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.kpis.open).toBe(1);
      expect(res.body.data[0].restaurantName).toBe('Jaipur Cafe');
    });

    it('updates ticket status to resolved and records resolution note and audit', async () => {
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockTicket],
          }),
        }),
      } as any);

      vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => [
              {
                ...mockTicket,
                status: 'resolved',
                resolutionNote: 'Re-generated and verified QR print vector.',
                resolvedAt: new Date(),
              },
            ],
          }),
        }),
      } as any);

      const res = await request(app)
        .patch(`/api/v1/portal/support/tickets/${mockTicket.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'resolved',
          resolutionNote: 'Re-generated and verified QR print vector.',
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe('resolved');
      expect(res.body.ticket.resolutionNote).toBe('Re-generated and verified QR print vector.');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPORT_TICKET_RESOLVED',
          entityType: 'support_ticket',
          entityId: mockTicket.id,
        }),
      );
    });
  });
});
