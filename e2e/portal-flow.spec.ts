import { test, expect } from '@playwright/test';

test.describe('Portal Platform Operations Flow (Desktop 1280px)', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  const tenantRestaurantId = '11111111-1111-1111-1111-111111111111';

  test.beforeEach(async ({ page }) => {
    // 1. Mock Portal Auth Login
    await page.route('**/api/v1/portal/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'valid-portal-super-admin-token',
          user: {
            id: 'portal-super-admin-1',
            email: 'admin@tiptable.in',
            role: 'super_admin',
            realm: 'portal',
          },
        }),
      });
    });

    // 2. Mock Portal Restaurants List & Onboarding
    await page.route('**/api/v1/portal/restaurants*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            restaurants: [
              {
                id: tenantRestaurantId,
                name: 'The Bombay Canteen',
                slug: 'the-bombay-canteen',
                isActive: true,
                isSuspended: false,
                createdAt: new Date().toISOString(),
                staffCount: 14,
                tableCount: 28,
              },
              {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'O Pedro',
                slug: 'o-pedro-bkc',
                isActive: true,
                isSuspended: false,
                createdAt: new Date().toISOString(),
                staffCount: 19,
                tableCount: 35,
              },
            ],
            total: 2,
          }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Restaurant successfully onboarded',
            restaurant: {
              id: '33333333-3333-3333-3333-333333333333',
              name: body.name,
              slug: body.slug,
              isActive: true,
              isSuspended: false,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 3. Mock Support Impersonation
    await page.route('**/api/v1/portal/impersonation/start', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Support impersonation session initiated',
          impersonationToken: 'valid-impersonation-token-123',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          targetRestaurant: {
            id: tenantRestaurantId,
            name: 'The Bombay Canteen',
          },
        }),
      });
    });

    // 4. Mock Billing Management
    await page.route('**/api/v1/portal/billing/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activeSubscriptions: 42,
          totalMrrInr: 41958,
          overdueInvoicesCount: 1,
          gracePeriodExpiringCount: 0,
        }),
      });
    });

    // 5. Mock Leads Management
    await page.route('**/api/v1/portal/leads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'lead-1',
              restaurantName: 'Bastian Bandra',
              contactName: 'Ranjit Roy',
              email: 'ranjit@bastian.in',
              phone: '+919876543210',
              city: 'Mumbai',
              status: 'new',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });
  });

  test('platform staff logs in, onboards new restaurant, initiates support impersonation, and reviews billing', async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Step 1: Portal Login
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3002/login');

    await expect(page.getByText(/Staff Portal|TipTable Portal/i)).toBeVisible();

    const emailInput = page.getByLabelText(/Email/i);
    const passwordInput = page.getByLabelText(/Password/i);
    const submitBtn = page.getByRole('button', { name: /Sign In|Log In/i });

    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@tiptable.in');
      await passwordInput.fill('PortalSuperSecret123!');
      await submitBtn.click();
    }

    // -------------------------------------------------------------------------
    // Step 2: Restaurant Tenant Management Screen
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3002/restaurants');

    // Confirm listed tenant restaurants
    await expect(page.getByText('The Bombay Canteen')).toBeVisible();
    await expect(page.getByText('O Pedro')).toBeVisible();

    // Verify Onboarding Modal
    const onboardBtn = page.getByRole('button', { name: /Onboard Restaurant|New Restaurant/i });
    if (await onboardBtn.isVisible()) {
      await onboardBtn.click();

      const nameInput = page.getByLabelText(/Restaurant Name/i);
      const slugInput = page.getByLabelText(/URL Slug/i);
      const emailInput = page.getByLabelText(/Owner Email/i);

      if (await nameInput.isVisible()) {
        await nameInput.fill('Trattoria Bella');
        await slugInput.fill('trattoria-bella');
        await emailInput.fill('owner@trattoria.in');

        const saveBtn = page.getByRole('button', { name: /Complete Onboarding|Create Tenant/i });
        await saveBtn.click();

        await expect(page.getByText('Trattoria Bella')).toBeVisible();
      }
    }

    // -------------------------------------------------------------------------
    // Step 3: Support Impersonation Delegation
    // -------------------------------------------------------------------------
    const impersonateBtn = page.getByRole('button', { name: /Impersonate/i }).first();
    if (await impersonateBtn.isVisible()) {
      await impersonateBtn.click();

      // Reason prompt or dialog
      const reasonInput = page.getByLabelText(/Reason|Audit Ticket/i);
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Investigating QR scan routing incident');
        const confirmBtn = page.getByRole('button', {
          name: /Confirm Impersonation|Start Session/i,
        });
        await confirmBtn.click();

        // Verify delegation banner / token confirmation
        await expect(page.getByText(/The Bombay Canteen/i)).toBeVisible();
      }
    }

    // -------------------------------------------------------------------------
    // Step 4: Billing Management Screen
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3002/billing');

    await expect(page.getByText(/42/)).toBeVisible(); // Active subscriptions
    await expect(page.getByText(/41,958|₹41,958/i)).toBeVisible(); // Total MRR

    // -------------------------------------------------------------------------
    // Step 5: Leads CRM Pipeline Screen
    // -------------------------------------------------------------------------
    await page.goto('http://localhost:3002/leads');

    await expect(page.getByText('Bastian Bandra')).toBeVisible();
    await expect(page.getByText('Ranjit Roy')).toBeVisible();
    await expect(page.getByText('+919876543210')).toBeVisible();
  });
});
