import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const TOKENS = join(SRC, 'styles/tokens.css');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(SRC);
const styled = files.filter((f) => ['.astro', '.css'].includes(extname(f)));
const sources = await Promise.all(
  styled.map(async (f) => ({ file: f.replace(SRC, 'src/'), text: await readFile(f, 'utf8') })),
);
const tokensCss = await readFile(TOKENS, 'utf8');

// ---------- colour maths ----------

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const token = (name) => {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(match, `token --${name} is missing or is not a 6-digit hex`);
  return match[1];
};

// ---------- tests ----------

test('every referenced custom property is defined somewhere', () => {
  const defined = new Set(['--font-nunito']); // injected by Astro's font pipeline
  for (const { text } of sources) {
    for (const [, name] of text.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(name);
  }

  const missing = [];
  for (const { file, text } of sources) {
    for (const [, name] of text.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
      if (!defined.has(name)) missing.push(`${file}: var(${name})`);
    }
  }

  assert.deepEqual(missing, [], `undefined custom properties:\n  ${missing.join('\n  ')}`);
});

test('every Bloom asset on disk is actually used', async () => {
  const dir = join(SRC, 'assets/bloom');
  const assets = await readdir(dir);
  const all = sources.map((s) => s.text).join('\n');

  const unused = assets.filter((name) => !all.includes(name));
  assert.deepEqual(unused, [], `unused assets (delete them or use them): ${unused.join(', ')}`);
});

test('text colour pairs meet WCAG AA', () => {
  const bg = token('bg');
  const pairs = [
    ['white on --purple-deep (buttons)', contrast('#FFFFFF', token('purple-deep')), 4.5],
    ['--ink on --bg (body)', contrast(token('ink'), bg), 7],
    ['--secondary on --bg (supporting text)', contrast(token('secondary'), bg), 4.5],
    ['--purple-deep on --bg (links)', contrast(token('purple-deep'), bg), 4.5],
  ];

  for (const [label, ratio, min] of pairs) {
    assert.ok(ratio >= min, `${label}: ${ratio.toFixed(2)}:1, needs ${min}:1`);
  }
});

test('--purple is never used behind white text', () => {
  // White on --purple is 4.13:1, below AA. It is a decorative fill only.
  assert.ok(
    contrast('#FFFFFF', token('purple')) < 4.5,
    'if --purple now passes AA this guard can be removed',
  );

  const offenders = [];
  for (const { file, text } of sources) {
    for (const [, body] of text.matchAll(/\{([^{}]*)\}/g)) {
      const fillsPurple = /background(?:-color)?\s*:[^;]*var\(\s*--purple\s*\)/i.test(body);
      const textIsWhite = /(?<!-)\bcolor\s*:\s*(#fff(?:fff)?\b|white\b)/i.test(body);
      if (fillsPurple && textIsWhite) offenders.push(`${file}: ${body.trim().slice(0, 80)}…`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `white text on --purple fails AA — use --purple-deep:\n  ${offenders.join('\n  ')}`,
  );
});

const hero = sources.find((s) => s.file === 'src/components/Hero.astro').text;

test('every hero asset on disk is actually used', async () => {
  const assets = await readdir(join(SRC, 'assets/hero'));
  const unused = assets.filter((name) => !hero.includes(name));
  assert.deepEqual(unused, [], `unused hero assets: ${unused.join(', ')}`);
});

test('hero entrances land on the final frame', () => {
  // Base CSS is the finished shot. Entrances must use fill-mode backwards,
  // so when Reduce Motion drops every animation nothing is left hidden.
  assert.match(hero, /prefers-reduced-motion: reduce\)[\s\S]*animation: none/, 'reduced-motion kill switch is missing');
  const fills = [...hero.matchAll(/animation:[^;]*\b(both|forwards)\b/g)];
  assert.deepEqual(fills.map((m) => m[0]), [], 'use backwards fill so the resting state is the final frame');
});

test('hero text colours meet WCAG AA on the sky', () => {
  const sky = hero.match(/--hero-sky:\s*(#[0-9A-Fa-f]{6})/);
  assert.ok(sky, '--hero-sky is missing from Hero.astro');
  assert.ok(contrast(token('ink'), sky[1]) >= 4.5, '--ink on --hero-sky must pass AA');
  assert.ok(contrast(token('secondary'), sky[1]) < 4.5, 'if --secondary now passes on the sky, the ink override can go');
});

test('footer headline stays AA on the dusk sky', async () => {
  // The dusk gradient is multiplied over hills-far.png. The brightest pixel in the
  // headline band of that plate is a cloud at rgb(250, 244, 237) (measured once with Pillow).
  const footer = sources.find((s) => s.file === 'src/components/Footer.astro').text;
  const stop = footer.match(/--dusk-45:\s*#([0-9A-Fa-f]{6})/);
  assert.ok(stop, '--dusk-45 is missing from Footer.astro');

  const cloud = [250, 244, 237];
  const multiplied = [0, 2, 4].map((i, c) => Math.round((parseInt(stop[1].slice(i, i + 2), 16) * cloud[c]) / 255));
  const hex = '#' + multiplied.map((v) => v.toString(16).padStart(2, '0')).join('');
  assert.ok(contrast('#FFFFFF', hex) >= 4.5, `white on ${hex}: ${contrast('#FFFFFF', hex).toFixed(2)}:1, needs 4.5`);
});

test('no infinite animations: they keep the GPU redrawing the page while idle', () => {
  const loops = sources.filter((s) => /animation[^;{}]*\binfinite\b/.test(s.text)).map((s) => s.file);
  assert.deepEqual(loops, [], 'give the animation a finite iteration count');
});

test('flow rail entrance is scroll-driven, optional and lands on the final frame', () => {
  const flow = sources.find((s) => s.file === 'src/components/FlowShowcase.astro').text;
  // Native path only where view() exists, and only without Reduce Motion.
  assert.match(flow, /@supports \(animation-timeline: view\(\)\)[\s\S]*prefers-reduced-motion: no-preference/);
  // Firefox fallback: every phone rides the page-wide [data-reveal] observer.
  assert.match(flow, /@supports not \(animation-timeline: view\(\)\)/);
  assert.equal(flow.match(/class="flow__item" data-reveal/g)?.length, 4);
  // Items must follow the page scroll via the named timeline, not view() on the rail's own x-scroller.
  assert.match(flow, /view-timeline: --flow-rail block/);
  assert.match(flow, /animation-timeline: --flow-rail/);
  assert.doesNotMatch(flow, /animation:[^;]*\b(both|forwards)\b/, 'use backwards fill so the resting state is the final frame');
  // translate is owned by the even-item lift; the keyframes must use transform.
  assert.doesNotMatch(flow.match(/@keyframes flow-in[\s\S]*?\n  \}/)[0], /\btranslate:/);
});

test('waitlist input sets its own text colour', () => {
  // global.css makes inputs inherit colour; the footer is white text, the field is white.
  const form = sources.find((s) => s.file === 'src/components/WaitlistForm.astro').text;
  const rule = form.match(/\.wl input \{([^}]*)\}/);
  assert.ok(rule, '.wl input rule is missing');
  assert.match(rule[1], /(?<!-)\bcolor:\s*var\(--ink\)/);
});
