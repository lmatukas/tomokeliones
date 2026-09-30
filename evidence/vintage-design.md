# Vintage travel journal redesign

Base: main `c3a6bf1063f972b6e1424d45edd758bb4d196107`.

## Direction

The user supplied Tomas's parchment / sailing ship logo and authorized adapting
both the logo and the entire Cloudflare site to that direction. The ship remains
the primary mark; a world map is background decoration, rather than another
competing symbol inside the logo.

Warm paper (#f5efdf), sepia ink (#3d3223), brass (#8a6233), and a dark green atlas
panel (#142422). Existing locally hosted Cormorant Garamond and Manrope fonts.
The redesign covers the shared header/footer, home, country catalog/detail,
story list/detail, gallery/dialog, route map, empty states, sources and 404.

## Assets

- `public/brand/ship-mark.webp`: 256 px transparent WebP (24,642 bytes).
- `public/brand/favicon.png`: 64 px transparent PNG.
- `public/brand/atlas-map.svg`: 120,696 bytes; generated from existing geography
  with `node scripts/build-atlas-decoration.mjs`. Only decorative projected
  paths are simplified. The globe and route use the original geography.
- Original reference: user upload `77eb4087-0d9d-4786-806f-b9c75942ce6c.jpeg`.
- Logo refined with the built-in imagegen tool. Generated source was resized
  and encoded with Sharp for the website. No dependency added.
- Prompt: Extract and refine only the reference three-masted right-facing
  sailing ship into a crisp one-color dark sepia woodcut mark, preserve the
  billowing sails and maritime arrangement, simplify fine rigging for small
  display, remove typography, paper, bevel, metallic texture and shadows,
  center the single ship with transparent background, no extra map or compass.

## Verification

- `npm test`: 9/9 PASS, including geographic picking and worker geometry.
- `npm run build`: PASS, 201 HTML pages, 2,991 checked local references.
- `npm run build:preview`: PASS, 204 HTML pages, 3,051 checked references.
- `git diff --check`: PASS.
- Cloudflare preview deployment succeeded. Browser checks cover the desktop
  home, story cards and text story; 320/360/390 px layout frames cover home,
  atlas, Lithuania, a story and the France empty state. No observed horizontal
  overflow. The frame is a CSS layout check, not a physical phone test.
- Country search for Lithuania and Enter navigation PASS. Gallery opening,
  next image (2/4), Escape close and focus restoration PASS.
- Preview builds now use SAMEORIGIN framing so `/patikra/` can embed this same
  site. Production keeps X-Frame-Options DENY; both modes have build assertions.
- Screenshots: `vintage-home-desktop.jpg` (honest WebGL fallback),
  `vintage-story-mobile-390.jpg` (390 px CSS frame).
- Actual WebGL2 and physical touch acceptance remain separate from static
  layout checks. Globe shaders, textures, geometry and interaction logic are
  unchanged by this design work.
