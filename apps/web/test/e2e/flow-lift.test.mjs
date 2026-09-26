// Needs a running server (pnpm dev) and a local Chrome. Not part of the gate: pnpm test:e2e
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321/';
const browser = await chromium.launch({ channel: 'chrome' });
after(() => browser.close());

// Invalid CSS inside calc() is dropped silently, so assert the computed value, not the source.
for (const [width, lifted] of [[1440, true], [390, false]]) {
  test(`flow rail even items ${lifted ? 'lift' : 'stay flat'} at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE);
    const t = await page.$$eval('.flow__item', (els) => els.map((el) => getComputedStyle(el).translate));
    assert.deepEqual(t, lifted ? ['none', '0px -24px', 'none', '0px -24px'] : ['none', 'none', 'none', 'none']);
  });
}

// overflow-x:auto on the rail also clips Y, so a lifted phone can lose its top bezel.
test('flow rail does not clip lifted phones and CTAs span the screen', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE);
  const { railTop, phoneTops, narrowCtas } = await page.$eval('.flow__rail', (rail) => ({
    railTop: rail.getBoundingClientRect().top,
    phoneTops: [...rail.querySelectorAll('.phone')].map((p) => p.getBoundingClientRect().top),
    narrowCtas: [...rail.querySelectorAll('.scr__stack')].filter((s) =>
      [...s.querySelectorAll('.scr__btn')].some((b) => b.offsetWidth !== s.clientWidth),
    ).length,
  }));
  for (const top of phoneTops) assert.ok(top >= railTop, `phone top ${top} clipped above rail ${railTop}`);
  assert.equal(narrowCtas, 0);
});

test('flow phones slide in from the right and settle once the rail is on screen', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE);
  const shift = () => page.$$eval('.flow__item', (els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).m41));

  // Rail top just below the fold: every phone is still offset to the right, later ones further.
  await page.$eval('.flow__rail', (r) => scrollTo(0, r.getBoundingClientRect().top + scrollY - innerHeight + 10));
  await page.waitForTimeout(100);
  const before = await shift();
  assert.ok(before.every((x, i) => x > 0 && (i === 0 || x >= before[i - 1])), `expected staggered right offsets, got ${before}`);

  // Rail fully in view: all settled.
  await page.$eval('.flow__rail', (r) => r.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(100);
  assert.deepEqual(await shift(), [0, 0, 0, 0]);
});
