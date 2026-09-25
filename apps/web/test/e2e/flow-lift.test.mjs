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
