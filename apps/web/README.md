# Bloomley — landing page

Static marketing site for the Bloomley waitlist. Built with [Astro](https://astro.build),
English copy, no backend.

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm test       # gate checks, <100ms
pnpm build      # -> dist/
pnpm preview    # serve dist/
```

## Why this is standalone

`apps/web` keeps its own `package.json` and `pnpm-lock.yaml` instead of joining a
pnpm workspace, exactly like `apps/mobile` does today.

`apps/mobile/.npmrc` sets `node-linker=hoisted`, which Expo's Metro bundler needs.
pnpm only reads that setting from the **root** `.npmrc` once a workspace exists, so
adding `pnpm-workspace.yaml` would silently un-hoist the mobile app's dependencies.
Staying standalone means installing here cannot break the app.

## Design tokens

`src/styles/tokens.css` mirrors the `v3-*` variables in `bloomley.pen` at the repo
root. **That file is the source of truth** — change it there first, then copy the
value across. There is no automated sync.

One deliberate divergence: the app fills its primary button with `--purple`
(`#9161E8`). White text on it is **4.13:1**, which fails WCAG AA for normal-size
text. The web uses `--purple-deep` (`#6E42C1`, 6.54:1) for anything with white text
on it and keeps `--purple` for decoration and large display type.
`test/landing.test.mjs` fails the build if that rule is broken. The same issue
exists in the `.pen` file and is worth fixing there too.

## Product shots

The four phone mockups in "The flow" are **rebuilt in HTML/CSS**, not exported from
the design file — the app ships in Spanish and this page is in English. They live in
`src/components/screens/` and share `src/styles/screens.css`, authored for a 300px
screen (the app designs at 393px, so values are scaled by ~0.76).

If the onboarding copy or layout changes in `bloomley.pen`, these do not update
automatically. Re-check them when the flow changes.

## Bloom assets

`src/assets/bloom/` holds cropped copies of the renders at the repo root. Each was
trimmed to its alpha bounding box (the originals carry transparent padding, and the
circular badges carried a faint alpha haze past the circle). Astro's `<Image>`
handles WebP conversion and `srcset` from there — a 936 kB source PNG ships as
~43 kB.

To add or replace one, drop the render at the repo root and re-run the crop:

```bash
cd ../.. && python3 - <<'PY'
from PIL import Image
im = Image.open("YourRender.png").convert("RGBA")
im.crop(im.split()[-1].point(lambda p: 255 if p > 8 else 0).getbbox()) \
  .save("apps/web/src/assets/bloom/your-render.png", optimize=True)
PY
```

`pnpm test` fails if an asset in that folder is never referenced.

## Waitlist

The form is complete — idle, loading, success and error states, native email
validation, `aria-live` announcements — but **it does not submit anywhere yet**.
`submitEmail()` in `src/components/WaitlistForm.astro` is a stub marked with
`TODO(waitlist)`. Replace its body once we pick between a `POST /waitlist` endpoint
in `apps/api` and a hosted service.

## Deployment

Not configured. `pnpm build` emits a fully static `dist/`, so any static host works.
`site` in `astro.config.mjs` is set to `https://bloomley.app` — update it before the
first deploy, since canonical URLs and the sitemap derive from it.
