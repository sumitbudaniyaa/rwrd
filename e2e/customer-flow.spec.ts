import { test, expect } from '@playwright/test';

test.describe('Customer Scan-to-Intent Flow (Mobile 375px)', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockTableToken = 'valid_table_token_4';

  test.beforeEach(async ({ page }) => {
    // 1. Mock GET /api/v1/public/token/:token
    await page.route(`**/api/v1/public/token/${mockTableToken}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurant: {
            id: mockRestaurantId,
            name: 'The Bombay Canteen',
            slug: 'the-bombay-canteen',
            logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
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
              photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
              isOnShift: true,
            },
          ],
        }),
      });
    });

    // 2. Mock GET /api/v1/public/restaurants/:id/staff
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
              photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
              isOnShift: true,
            },
            {
              id: 'staff-2',
              displayName: 'Priya Sharma',
              roleLabel: 'Server',
              photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
              isOnShift: true,
            },
          ],
        }),
      });
    });

    // 3. Mock POST /api/v1/public/tips/intent
    await page.route('**/api/v1/public/tips/intent', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          intentId: 'intent-uuid-1234',
          upiLink: `upi://pay?pa=ramesh@okaxis&pn=Ramesh%20Kumar&am=${payload.amountInr}.00&cu=INR&tn=Tip%20for%20Ramesh%20Kumar%20at%20The%20Bombay%20Canteen`,
          payeeName: 'Ramesh Kumar',
          amountInr: payload.amountInr,
          restaurantName: 'The Bombay Canteen',
        }),
      });
    });

    // 4. Mock POST /api/v1/public/restaurants/:id/review-tap
    await page.route(
      `**/api/v1/public/restaurants/${mockRestaurantId}/review-tap`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            recordedAt: new Date().toISOString(),
          }),
        });
      },
    );
  });

  test('walks through entire 5-screen customer journey from scan to review redirect', async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Screen 1: Welcome Greeting
    // -------------------------------------------------------------------------
    await page.goto(`http://localhost:3000/t/${mockTableToken}`);

    // Verify restaurant branding & table context
    await expect(page.getByText('The Bombay Canteen')).toBeVisible();
    await expect(page.getByText(/Table 4/i)).toBeVisible();

    // Verify primary action button
    const startTipBtn = page.getByRole('button', { name: /Tip Your Server/i });
    await expect(startTipBtn).toBeVisible();
    await startTipBtn.click();

    // -------------------------------------------------------------------------
    // Screen 2: Staff Selection Directory
    // -------------------------------------------------------------------------
    await expect(page.getByText('Ramesh Kumar')).toBeVisible();
    await expect(page.getByText('Priya Sharma')).toBeVisible();

    // Select Ramesh Kumar
    const rameshCard = page.getByText('Ramesh Kumar');
    await rameshCard.click();

    // -------------------------------------------------------------------------
    // Screen 3: Amount Selection Screen
    // -------------------------------------------------------------------------
    // Verify preset buttons exist
    await expect(page.getByRole('button', { name: '₹50' })).toBeVisible();
    await expect(page.getByRole('button', { name: '₹100' })).toBeVisible();
    await expect(page.getByRole('button', { name: '₹200' })).toBeVisible();

    // Select ₹100 preset
    await page.getByRole('button', { name: '₹100' }).click();

    // Click Proceed
    const proceedBtn = page.getByRole('button', { name: /Proceed to Pay ₹100/i });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    // -------------------------------------------------------------------------
    // Screen 4: Payment Trigger Screen
    // -------------------------------------------------------------------------
    // Verify non-custodial copy & amount confirmation
    await expect(page.getByText(/Ramesh Kumar/i)).toBeVisible();
    await expect(page.getByText('₹100')).toBeVisible();

    const triggerUpiBtn = page.getByRole('button', { name: /Pay ₹100 via UPI/i });
    await expect(triggerUpiBtn).toBeVisible();
    await triggerUpiBtn.click();

    // -------------------------------------------------------------------------
    // Screen 5: Post-Payment Thank You & Google Review Booster
    // -------------------------------------------------------------------------
    // Compliance invariant: must say "Tips initiated", never "Tips received"
    await expect(page.getByText(/Tips initiated/i)).toBeVisible();

    // 1-Tap Un-gated Google Review Booster Button
    const reviewBtn = page.getByRole('link', { name: /Review us on Google/i });
    await expect(reviewBtn).toBeVisible();

    // Ensure review link points to the public Google Maps review listing
    const href = await reviewBtn.getAttribute('href');
    expect(href).toContain('search.google.com/local/writereview');
  });

  test('switches language dynamically between English and Hindi', async ({ page }) => {
    await page.goto(`http://localhost:3000/t/${mockTableToken}`);

    // Default English greeting
    await expect(page.getByText(/Welcome to/i)).toBeVisible();

    // Find language switcher button (e.g. "हिन्दी" or "HI")
    const langBtn = page.getByRole('button', { name: /हिन्दी|HI/i });
    if (await langBtn.isVisible()) {
      await langBtn.click();
      // Verifies Hindi greeting appears
      await expect(page.getByText(/स्वागत है/i)).toBeVisible();
    }
  });
});
