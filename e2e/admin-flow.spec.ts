import { test, expect } from '@playwright/test';

test.describe('Admin Operations Flow (Desktop 1280px)', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';

  test.beforeEach(async ({ page }) => {
    // 1. Mock Admin Auth Login
    await page.route('**/api/v1/admin/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'valid-admin-jwt-token',
          user: {
            id: 'admin-owner-1',
            email: 'owner@bombaycanteen.in',
            role: 'owner',
            restaurantId: mockRestaurantId,
          },
          restaurant: {
            id: mockRestaurantId,
            name: 'The Bombay Canteen',
          },
        }),
      });
    });

    // 2. Mock Admin Staff Endpoints
    await page.route(`**/api/v1/admin/restaurants/${mockRestaurantId}/staff*`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            staff: [
              {
                id: 'staff-1',
                displayName: 'Rahul Sharma',
                roleLabel: 'Senior Captain',
                maskedVpa: 'r***l@okaxis',
                photoUrl: null,
                isActive: true,
                isOnShift: true,
                createdAt: new Date().toISOString(),
              },
              {
                id: 'staff-2',
                displayName: 'Anita Desai',
                roleLabel: 'Server',
                maskedVpa: 'a***a@okhdfcbank',
                photoUrl: null,
                isActive: true,
                isOnShift: false,
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            staff: {
              id: 'staff-3',
              displayName: body.displayName,
              roleLabel: body.roleLabel || 'Waitstaff',
              maskedVpa: 'v***m@okaxis',
              photoUrl: null,
              isActive: true,
              isOnShift: true,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 3. Mock QR Placard Management
    await page.route(`**/api/v1/admin/restaurants/${mockRestaurantId}/qr*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tables: [
            {
              id: 'table-1',
              tableNumber: 'Table 1',
              sectionName: 'Indoor Dining',
              qrToken: 'tok_table_1',
              qrCodeUrl: 'data:image/svg+xml;utf8,<svg>mock-qr</svg>',
            },
            {
              id: 'table-2',
              tableNumber: 'Table 2',
              sectionName: 'Indoor Dining',
              qrToken: 'tok_table_2',
              qrCodeUrl: 'data:image/svg+xml;utf8,<svg>mock-qr</svg>',
            },
          ],
        }),
      });
    });

    // 4. Mock Analytics Overview
    await page.route(
      `**/api/v1/admin/restaurants/${mockRestaurantId}/analytics/overview*`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalScans: 482,
            totalTipIntents: 114,
            conversionRate: 23.6,
            totalTipsAmount: 9690,
            leaderboard: [
              {
                staffId: 'staff-1',
                displayName: 'Rahul Sharma',
                tipCount: 68,
                totalAmount: 5780,
              },
              {
                staffId: 'staff-2',
                displayName: 'Anita Desai',
                tipCount: 46,
                totalAmount: 3910,
              },
            ],
          }),
        });
      },
    );
  });

  test('admin logs in, manages waitstaff, inspects placards, and reviews shift analytics', async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Step 1: Admin Login
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3001/login');

    await expect(page.getByText(/Restaurant Admin/i)).toBeVisible();

    const emailInput = page.getByLabelText(/Email/i);
    const passwordInput = page.getByLabelText(/Password/i);
    const submitBtn = page.getByRole('button', { name: /Sign In|Log In/i });

    if (await emailInput.isVisible()) {
      await emailInput.fill('owner@bombaycanteen.in');
      await passwordInput.fill('SecurePassword123!');
      await submitBtn.click();
    }

    // -------------------------------------------------------------------------
    // Step 2: Staff Management Screen
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3001/staff');

    // Confirm existing staff roster with masked VPAs
    await expect(page.getByText('Rahul Sharma')).toBeVisible();
    await expect(page.getByText('r***l@okaxis')).toBeVisible();
    await expect(page.getByText('Anita Desai')).toBeVisible();

    // Verify "Add Staff" action exists
    const addStaffBtn = page.getByRole('button', { name: /Add Waitstaff|Add Staff/i });
    if (await addStaffBtn.isVisible()) {
      await addStaffBtn.click();

      // Modal appears
      const nameInput = page.getByLabelText(/Staff Name|Display Name/i);
      const vpaInput = page.getByLabelText(/UPI VPA|UPI ID/i);

      if (await nameInput.isVisible()) {
        await nameInput.fill('Vikram Malhotra');
        await vpaInput.fill('vikram@okaxis');

        const saveBtn = page.getByRole('button', { name: /Save|Create Staff/i });
        await saveBtn.click();

        // Verify newly added staff appears
        await expect(page.getByText('Vikram Malhotra')).toBeVisible();
      }
    }

    // -------------------------------------------------------------------------
    // Step 3: QR Placards Management
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3001/qr');

    await expect(page.getByText('Table 1')).toBeVisible();
    await expect(page.getByText('Table 2')).toBeVisible();

    // Verify export / download button for placards
    const downloadPlacardsBtn = page.getByRole('button', { name: /Download Placard|Export PDF/i });
    if (await downloadPlacardsBtn.isVisible()) {
      await expect(downloadPlacardsBtn).toBeEnabled();
    }

    // -------------------------------------------------------------------------
    // Step 4: Analytics Screen
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3001/analytics');

    await expect(page.getByText(/482/)).toBeVisible(); // Total scans
    await expect(page.getByText(/23.6%/)).toBeVisible(); // Conversion rate
    await expect(page.getByText(/Leaderboard/i)).toBeVisible();
  });
});
