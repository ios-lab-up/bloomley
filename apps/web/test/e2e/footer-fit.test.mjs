// Needs a running server (pnpm dev) and a local Chrome. Not part of the gate: pnpm test:e2e
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321/';
const browser = await chromium.launch({ channel: 'chrome' });
after(() => browser.close());

for (const [width, height] of [[1440, 900], [1440, 700], [390, 844]]) {
  test(`footer headline clears the nav at page end, ${width}x${height}`, async () => {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // Lenis animates scrollTo and lazy images keep growing the page, so re-aim until it sits at the end.
    await page.waitForFunction(() => {
      const end = document.documentElement.scrollHeight - innerHeight;
      if (Math.abs(scrollY - end) < 1) return true;
      window.scrollTo(0, end);
    }, null, { polling: 250 });
    await page.waitForTimeout(300);
    const { h2, nav, bloom } = await page.evaluate(() => ({
      h2: document.querySelector('.finale h2').getBoundingClientRect().top,
      nav: document.querySelector('header').getBoundingClientRect().bottom,
      bloom: document.querySelector('.finale__actors').getBoundingClientRect().height,
    }));
    assert.ok(h2 >= nav + 16, `h2 top ${Math.round(h2)}px vs nav bottom ${Math.round(nav)}px`);
    assert.ok(bloom >= 150, `actors only ${Math.round(bloom)}px tall`);
  });
}
