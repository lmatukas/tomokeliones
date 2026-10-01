# Tomas Travel Journal — Cloudflare alternative

An independent Astro site for comparing with the existing WordPress site. Nothing here changes WordPress, its database, plugin, domain or DNS. This repository contains **synthetic Lithuania examples only**, not Tomas's travel history.

## Run and review

Node 22.12+ (developed with Node 24) and npm.

```sh
npm ci
npm run import:demo
npm test
npm run dev
```

Development includes the clearly marked demo. `/patikra/` offers narrow iframe viewports for layout review, not physical-device simulation. `/?be-3d` activates the accessible fallback.

```sh
npm run build:preview
npm run preview
```

Static review output is `dist/`. Serve it over HTTP; do not open `index.html` with `file://`. `npm run build` excludes draft/synthetic story routes and uses only real visit records. Both modes clean old output and verify visibility, local links and Pages file limits. Current output carries `noindex`; this is not access control. Unlinked public media files remain public.

## How Tomas adds a trip

Tomas puts original photos and a free-form description in one private Drive inbox folder, then asks the agent to prepare it. The agent reads/downloads that folder through the authorized connector, checks country/date uncertainties, prepares a stable package and runs the importer. Tomas does not write JSON or individually enter photo metadata.

The agent prepares prose, order, captions and visual alt descriptions, shows the country/story/gallery preview and batches unresolved questions. Tomas approves content, the visit fact separately, and publication. This is an explicitly initiated Work session, not an always-running agent or synchronization service.

Private originals remain in Drive and on an independent disk. The site serves stripped WebP derivatives from its own assets. Drive is not a CDN. This GitHub repository is public: private drafts, original references and credentials stay outside it. Only synthetic or explicitly public-approved content belongs here. Agent/editor time and the user's AI plan are not included in hosting cost estimates.

## Import contract

`node scripts/import.mjs /absolute/path/to/package.json` processes an agent-prepared package; `scripts/prepare-demo.mjs` is the executable example. Paths must stay inside the package directory. JPEG, PNG and WebP supported; inspected self-contained SVG only for this fixture. HEIC currently requires separate conversion.

Stable story/asset IDs, SHA-256, 480/960/1600 WebP without enlargement or EXIF/GPS. Originals unchanged. Per-source checkpoints support retry; equal bytes reuse URLs. Three-way field comparison preserves manual changes; conflicts retain current values and exit 2. Gallery caption/order/removal conflicts are reviewed as one field. Omission does not delete existing content. Imports create drafts and never write visits.

Keep `.work/import-state.json` and source packages in the private project archive. Lost baseline results in reviewable conflicts rather than silent overwrites. `.work/import.lock` prevents overlapping jobs; after a crash confirm its PID has stopped before removing that stale lock. Derivatives may finish before the content commit; never publish a partial import.

## Content model

- `countries.json`: 195 stable IDs, ISO codes, LT/EN names, continents and geographic identifiers.
- `archive.json`: trips, N:M country-linked stories and reusable photo assets; optional trip, ordered gallery and ordered routes. Unknown travel dates remain null.
- `visits.json`: separate real and synthetic records. Only an explicit confirmed visit changes globe color/statistics. Images and stories never prove a visit.
- Each gallery entry owns caption/alt and array position. Reuse does not overwrite another story's context.
- Pilot differences from the full model: paragraphs rather than Markdown, routes inside stories, order in arrays. Translation review state, CMS and newsletter are planned.

## Cloudflare handoff — not deployed

Use a **new Cloudflare Pages project**, suggested name `tomokeliones` if available. Do not attach the existing domain. Review build: `npm run build:preview`; output `dist`; Node 22+; install `npm ci`. Real-content release: `npm run build` after approved content is ready. No Functions, DB or runtime secrets needed.

Do not connect automatic deployment or click Deploy before approval for the specific public synthetic review release. Pages preview addresses are public by default. Account access/project name are not assumed. A ZIP can be uploaded through Direct Upload after permission, but a Direct Upload project has a different ongoing workflow; prefer Git integration for this GitHub-backed project.

Repository code publication is authorized; website publication is separate. No paid services activated. Deployment, Cloudflare headers and rollback remain untested.

## Validation and limits

Globe interaction/contour update: see `evidence/globe-optimization.md` for the
new picker/worker tests, CPU benchmark and outstanding live WebGL acceptance.
Run `node scripts/benchmark-globe.mjs` to reproduce the geographic lookup test;
its timing is not browser FPS. Visits use contours; hover retains a raised,
subtle fill. Textures, Earth detail and lighting remain unchanged.

See `evidence/QA.md` for exact PASS / NOT TESTED / BLOCKED and screenshots. Six automated tests cover repeat/resume, manual edits/conflicts, changed/unsafe inputs, original/EXIF handling, Crimea and astronomy conventions. **The remote browser has no WebGL2; 3D rendering, polygon selection, motion preferences and Moon visuals have not passed live QA.** The Earth screenshot is a fallback poster.

The implementation uses entire country polygons. Crimea belongs to Ukraine; new point tests confirm the dataset, not GPU clicks. Small countries without polygons remain in the catalog. Texture clouds/lights are static. The terminator uses UTC solar position; Moon scale/position are schematic.

Before a real archive: test 20/100 photos, HEIC, duplicate names, orientation/GPS, physical phone, reduced-motion, screen reader and independent restore. Review R2 at about 500 MB of Git media or 15,000 generated files; these are project thresholds, not vendor quotas.

## Maintenance and portability

Architecture, costs, design, open questions and permissions live in the new Drive project. This README is the executable code guide, not copied WP documentation. Dependencies pinned by `package-lock.json`; see `THIRD_PARTY_NOTICES.md`.

Back up Git bundle, static release, private import state/packages and originals independently. JSON, GeoJSON, WebP and HTML can move to another static host. Roll back code/content together to a reviewed commit and rebuild; Cloudflare rollback needs its own tested history. Runtime does not depend on Drive, GitHub API or AI.

## Vintage design

The current design follows Tomas's supplied sailing-ship logo: warm paper,
sepia typography and a brass-framed live atlas. Shared styles cover every page,
including empty states and the gallery. `public/brand/ship-mark.webp` is the
optimized mark; the generated original is recorded in `evidence/vintage-design.md`.
Regenerate the lightweight decorative map with `node scripts/build-atlas-decoration.mjs`.
This does not change the globe's geographic data or textures.
