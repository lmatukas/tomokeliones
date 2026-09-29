# New Cloudflare alternative: validation record

Session: 2026-09-29. New-project evidence only; WP TTJ Core 0.6.1 tests are not reused.

## PASS — automated

`npm test`: 6 tests, 0 failures; output in `import-tests.txt`.

1. Interrupted after 2 assets, resumed: 2 reused + 4 processed. Same/new package repeats without duplicate stories/assets. 6 assets, 3 stories. No visit/date/publication invented.
2. Manual caption, alt, order and removal survive. Conflicts remain explicit on repeat.
3. Changed bytes yield new URLs; missing/unsafe input leaves content unchanged.
4. Synthetic originals unchanged, optimized sizes/no EXIF, empty gallery accepted. Not a real-camera orientation/GPS test.
5. 195 unique countries; three Crimea coordinates inside Ukraine/outside Russia. Not a GPU selection test.
6. Solar unit/longitude convention at equinox noon/midnight and morning east; Moon fraction varies. Not a precision certification.

Both production and preview builds pass visibility/local-link/Pages-limit checks. Old preview artifacts initially survived a build; fixed by cleaning generated output and requiring post-build visibility verification. Successful logs attached. Production has zero synthetic story routes; unused synthetic media remain public (no private images present).

## PASS — actual browser

Cloud Chrome, live development server; desktop screenshot approximately 1348×926. All content explicitly synthetic.

- Home/country render; search `lietu`, Down, Enter opens Lithuania with three stories.
- Story prose/five stops/gallery. Photo 1 opens; Right moves to 2/4; Escape closes and restores focus. Four thumbnails loaded with alt.
- 360 px iframe: gallery buttons move to 2/4, modal fits, Escape restores focus. Real narrow CSS, not touch emulation.
- 390 px iframe home: mobile heading corrected; body scrollWidth equals clientWidth (375 px excluding scrollbar).
- 360 px iframe text-only story: no empty gallery/route.
- Forced `?be-3d` and automatic unavailable-WebGL fallback: poster plus working catalog navigation. Atlas shows 1/195 as test data.

## BLOCKED / NOT TESTED

- BLOCKED: page feature probe gets null WebGL2. Earth screenshot is a static poster. Rotation, polygon hover/lift/click, Crimea click, night shading, Moon visuals, GPU performance/context loss have no live PASS.
- NOT TESTED: OS reduced-motion, physical touch/phone, screen reader, exact 430/768/1440 widths, completely disabled JavaScript.
- NOT TESTED: genuine 20/100 photos, HEIC, camera EXIF/GPS, 5000-photo scale, independent restoration, EN/newsletter/social import.
- NOT TESTED: Cloudflare deployment/access configuration/headers/rollback. No public deploy or domain/DNS changes.

## Screenshots

- `home-fallback-desktop.jpg`: main design in fallback.
- `country-desktop.jpg`: Lithuania.
- `route-desktop.jpg`: five ordered stops and schematic map.
- `gallery-desktop.jpg`: 2/4 modal.
- `home-mobile-390.jpg`: 390 px iframe (content excludes scrollbar).
- `gallery-mobile-360.jpg`: 360 px modal.
- `text-only-mobile-360.jpg`: no-photo story.

Actual browser captures, not mockups. An early full-page capture omitted offscreen lazy images and is excluded. Pending 3D QA remains a release risk.
