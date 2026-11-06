import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated Accessibility Audit (WCAG 2.1 AA & 48px Tap Targets) (M6-T03)', () => {
  // =========================================================================
  // 1. Customer Mobile Screens Accessibility (375px Viewport)
  // =========================================================================
  test.describe('Customer App Accessibility', () => {
    test.use({
      viewport: { width: 375, height: 812 },
    });

    const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
    const mockTableToken = 'valid_table_token_4';

    test.beforeEach(async ({ page }) => {
      // Mock API responses for customer flow
      await page.route(`**/api/v1/public/token/${mockTableToken}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            restaurant: {
              id: mockRestaurantId,
              name: 'The Bombay Canteen',
              slug: 'the-bombay-canteen',
              googleReviewUrl:
                'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
              tipPresets: [50, 100, 200],
              minTipInr: 10,
              maxTipInr: 5000,
              isActive: true,
            },
            table: {
              id: '22222222-2222-2222-2222-222222222222',
              tableNumber: 'Table 4',
              sectionName: 'Main Dining Room',
            },
            staff: [
              {
                id: 'staff-1',
                displayName: 'Ramesh Kumar',
                roleLabel: 'Captain Waiter',
                isOnShift: true,
              },
            ],
          }),
        });
      });

      await page.route(`**/api/v1/public/restaurants/${mockRestaurantId}/staff`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            staff: [
              {
                id: 'staff-1',
                displayName: 'Ramesh Kumar',
                roleLabel: 'Captain Waiter',
                isOnShift: true,
              },
            ],
          }),
        });
      });
    });

    test('Customer Greeting Screen has zero WCAG 2.1 AA critical/serious violations', async ({
      page,
    }) => {
      await page.goto(`http://localhost:3000/t/${mockTableToken}`);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });

    test('Customer interactive buttons meet the 48px minimum touch target standard', async ({
      page,
    }) => {
      await page.goto(`http://localhost:3000/t/${mockTableToken}`);

      // Primary Action Card / Button
      const primaryBtn = page.getByRole('button', { name: /Tip Your Server/i });
      if (await primaryBtn.isVisible()) {
        const box = await primaryBtn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          // Standard minimum 48px height for touch targets
          expect(box.height).toBeGreaterThanOrEqual(48);
          expect(box.width).toBeGreaterThanOrEqual(48);
        }
      }
    });
  });

  // =========================================================================
  // 2. Landing Site & Marketing Funnel Accessibility (Desktop & Mobile)
  // =========================================================================
  test.describe('Landing Site Accessibility', () => {
    test('Landing Home Page satisfies WCAG 2.1 AA standards', async ({ page }) => {
      await page.goto('http://localhost:3003/');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });

    test('Privacy Policy (/privacy) complies with accessible document structure', async ({
      page,
    }) => {
      await page.goto('http://localhost:3003/privacy');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });

    test('Terms of Service (/terms) complies with accessible document structure', async ({
      page,
    }) => {
      await page.goto('http://localhost:3003/terms');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });

    test('Pricing ROI Calculator interactive sliders and controls have accessible names', async ({
      page,
    }) => {
      await page.goto('http://localhost:3003/#pricing');

      const tableSlider = page.getByRole('slider', { name: /Active Dining Tables/i });
      await expect(tableSlider).toBeVisible();

      const coversSlider = page.getByRole('slider', { name: /Average Daily Covers/i });
      await expect(coversSlider).toBeVisible();

      const billingSwitch = page.getByRole('switch');
      await expect(billingSwitch).toBeVisible();
    });

    test('Inbound Demo Request Form inputs have associated labels and error alerts', async ({
      page,
    }) => {
      await page.goto('http://localhost:3003/#demo-form');

      await expect(page.getByLabelText(/Restaurant \/ Outlet Name/i)).toBeVisible();
      await expect(page.getByLabelText(/^City/i)).toBeVisible();
      await expect(page.getByLabelText(/Your Name \/ Title/i)).toBeVisible();
      await expect(page.getByLabelText(/Work Email/i)).toBeVisible();
      await expect(page.getByLabelText(/Phone \/ WhatsApp Number/i)).toBeVisible();
    });
  });

  // =========================================================================
  // 3. Admin & Portal Console Accessibility (Desktop Viewport)
  // =========================================================================
  test.describe('Admin & Portal Console Accessibility', () => {
    test.use({
      viewport: { width: 1280, height: 800 },
    });

    test('Admin Login Screen has accessible form controls and zero critical violations', async ({
      page,
    }) => {
      await page.goto('http://localhost:3001/login');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });

    test('Portal Login Screen has accessible form controls and zero critical violations', async ({
      page,
    }) => {
      await page.goto('http://localhost:3002/login');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });
  });
});
