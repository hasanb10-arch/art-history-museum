import { test, expect } from '@playwright/test';

// Runs against BASE_URL (the Vercel deployment). Skips gallery checks gracefully if the DB is empty.

test('timeline loads and shows periods', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Museum of Art History' })).toBeVisible();
  const empty = page.getByTestId('empty-state');
  if (await empty.isVisible().catch(() => false)) {
    test.info().annotations.push({ type: 'note', description: 'Database not seeded yet' });
    return;
  }
  const svg = page.locator('svg.timeline-svg');
  await expect(svg).toBeVisible();
  await expect(svg.locator('.period-band')).toHaveCount(await svg.locator('.period-band').count());
  expect(await svg.locator('.period-band').count()).toBeGreaterThanOrEqual(12);
});

test('filter dropdown swaps content and zooms', async ({ page }) => {
  await page.goto('/');
  if (await page.getByTestId('empty-state').isVisible().catch(() => false)) test.skip();
  await page.getByTestId('filter-toggle').click();
  await expect(page.getByTestId('filter-mode-artist')).toBeVisible();
  await page.getByTestId('filter-mode-artist').click();
  await expect(page.getByPlaceholder('Type a name')).toBeVisible();
  await page.getByTestId('filter-mode-period').click();
  await page.getByTestId('period-baroque').click();
  // artists appear once zoomed in
  await expect(page.locator('svg.timeline-svg .artist-node').first()).toBeVisible({ timeout: 5000 });
});

test('artist card opens and links to a gallery', async ({ page }) => {
  await page.goto('/');
  if (await page.getByTestId('empty-state').isVisible().catch(() => false)) test.skip();
  await page.getByTestId('filter-toggle').click();
  await page.getByTestId('period-baroque').click();
  const node = page.locator('svg.timeline-svg .artist-node').first();
  await node.click();
  const card = page.getByTestId('artist-card');
  await expect(card).toBeVisible();
  await expect(card.locator('h2')).not.toBeEmpty();
  await page.getByTestId('enter-gallery').click();
  await expect(page).toHaveURL(/\/artist\/\d+/);
});

test('gallery renders a WebGL canvas and the HUD', async ({ page }) => {
  await page.goto('/');
  if (await page.getByTestId('empty-state').isVisible().catch(() => false)) test.skip();
  const res = await page.request.get('/api/artists?period=baroque');
  const { artists } = await res.json();
  const withWorks = artists.find((a: any) => a.painting_count >= 8);
  test.skip(!withWorks, 'no artist with 8+ paintings');
  await page.goto(`/artist/${withWorks.id}`);
  await expect(page.getByTestId('gallery-canvas').locator('canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('veil')).toBeHidden({ timeout: 60000 });
  await expect(page.getByText('W A S D to walk')).toBeVisible();
});

test('api returns 8+ paintings for a seeded artist', async ({ page }) => {
  const res = await page.request.get('/api/periods');
  const { periods } = await res.json();
  if (!periods?.length) test.skip();
  const rich = periods.flatMap((p: any) => p.artists).filter((a: any) => a.painting_count >= 8);
  expect(rich.length).toBeGreaterThan(0);
  const a = await page.request.get(`/api/artist/${rich[0].id}`);
  const data = await a.json();
  expect(data.paintings.length).toBeGreaterThanOrEqual(8);
  for (const p of data.paintings) {
    expect(p.image_url).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    expect(p.title.length).toBeGreaterThan(0);
  }
});
