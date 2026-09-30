# Globe contours and interaction performance

Baseline: `c1cfdb703d227d34ba850165040d164f0b57cd70` (PR #1).
User feedback: the live globe looks right, but the page periodically stalls and
the opaque Lithuania highlight hides too much of the map.

## Changes

- Confirmed visits use warm, brighter boundary lines, with no persistent fill.
  All visited boundaries form one draw call, including a mostly visited world.
- Hover keeps the raised country geometry, with a softer 18% fill and a bright
  contour. The original geometry parameters and vertices are retained.
- Hover geometry is generated in a module worker. A contour responds immediately
  while the fill is prepared. Only one request runs, with only the latest hover
  queued; six completed country fills are cached and older GPU geometry disposed.
- Picking intersects an analytic sphere instead of all Earth mesh triangles;
  spherical bounding boxes prune geographic candidates before exact containment.
  Pointer moves are coalesced to one lookup per animation tick.
- Settled, paused scenes skip identical GPU renders. Unchanged zoom/caption state
  no longer rewrites the DOM each frame. Frame pacing carries its remainder.
- Moon asset failures have a retry delay instead of retrying every frame.
- Earth textures, sphere detail, atmosphere, lighting, geographic boundaries,
  antialiasing and device pixel ratio are unchanged. No new dependency is added.

## Verification

- `npm test`: 9/9 PASS. Existing import, astronomy and Crimea checks remain green.
- New picker agrees with the original on a global 5-degree grid, all catalog
  label points, island/border vertices and adjacent points, date-line wrapping,
  ocean, Lesotho, Lithuania and Crimea. The test caught and corrected longitude
  normalization beyond +/-180 degrees.
- Worker output for Lithuania, Russia and Ukraine matches the original position
  and index arrays exactly; invalid geometry returns a recoverable failure.
- The actual emitted production worker also ran in a Node worker-thread harness,
  exercising its lazy dependency import and transferable buffers (PASS).
- `npm run build`: 201 HTML pages, 246 files, 2388 checked internal references.
- `npm run build:preview`: 204 HTML pages, 249 files, 2441 checked references.
- `node scripts/benchmark-globe.mjs`: 300 identical queries, 2340.62 ms baseline
  versus 55.03 ms indexed (42.54x in this Node run). This measures geographic
  lookup CPU only, not browser FPS, GPU load or total page speed.
- `git diff --check`: PASS.

## Remaining live acceptance

The cloud browser reports no WebGL2, including on the baseline deployed preview.
It therefore cannot verify rendered contours, actual frame timing or GPU memory.
Do not call the end-to-end stutter issue resolved based on the Node benchmark.

In a WebGL2 browser, compare the original preview with this branch: rotate/zoom,
cross Russia/Canada/archipelagos repeatedly, pause and resume, scroll the globe
out of view and back, switch tabs, and check the Moon at far zoom. Confirm the
visited Lithuania contour, softer hover and country navigation. Also review
mobile touch and reduced-motion. These are still NOT VERIFIED for this change.

This branch is intentionally based on the existing feature branch because main
still contains only the initial README. The PR targets that feature branch for a
small, reviewable diff. It does not merge the initial site or alter production,
WordPress, DNS or the existing domain.
