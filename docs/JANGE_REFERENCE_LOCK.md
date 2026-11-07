# Jange — Approved Character Reference / Production Specification

## Source of truth

This spec is based on the *JANGE — Otak Konslet Studio / Ciruas: Hari Pertama* character sheet supplied by the project owner in ChatGPT on 2026-11-08. **The illustration itself is not in this Git repository yet**; maintain a locally stored copy and check it into `public/characters/jange/reference/` after confirming its licensing and desired distribution. Do not treat temporary geometry approximations as the final artwork.

## Identity lock

- **Character:** Jange, male, 19, Ciruas (Banten), Gen Z; tall and slim (sheet lists 168 cm), awkward / 'pelenger'.
- **Head:** asymmetrical narrow face, tired under-eye lines, heavy drooping lids, visible old blemishes, pale small **plaster on his own left cheek** (when front-facing, viewer's right or left depends on mirroring), sparse facial stubble, often a slack slightly open mouth.
- **Hair:** dark unwashed loose, irregular long bangs and wild flyaways, *uneven messy middle part*, **one pink hair clip on a side bang**.
- **Clothing:** oversized washed-out charcoal hoodie with torn/frayed patches, rolled/worn grey skinny jeans with holes at the knees, weathered olive-gray cross-body bag.
- **Regional detail:** colorful woven **Banten textile** accent draped over one shoulder. This is an everyday accessory; never invent ceremonial attributes.
- **Shoes:** unmatched worn blue and red flip-flops.
- **Props:** cracked smartphone, lighter. Use only if the script calls for them.
- **Signature emotions:** bengong/loading, kaget, panik, curiga, kesal/marah, tengil/nyengir.
- **Art direction:** illustrated hand-inked textured 2D anime-inspired cartoon; **not** a realistic 3D man, clean flat-icon mascot, or generic handsome teen.

## Current implemented rig

File: `src/remotion/components/CharacterPuppet.tsx`

The temporary SVG rig now has a more asymmetrical face, reduced sleepy eye openings, visible plaster/acne/stubble, an additional pink clip, detailed damaged hoodie, patterned shoulder scarf, knee tears, worn sling bag, and mismatched footwear. These changes preserve the existing SVG transform groups, eye blink, viseme mouth rig, head movements, walking and body poses.

**This is still a hand-coded approximation.** Shape match, inked texturing, side/back head turns, and garments cannot be fully reconstructed from the single flat reference sheet by CSS alone.

## Asset conversion pipeline for exact match

1. Obtain the approved sheet as lossless PNG; don't use character samples generated anew by a diffusion model as the final reference.
2. Draw/redraw separated production layers while preserving the sheet's line work: torso, back hair, head, front hair, left/right eyebrows, each eye, front/both arms, front/both legs, footwear, bag, shoulder textile, and mouth shapes for `REST`, `AA`, `EE`, `OO`, `OH`, `FV`, `SHOCK`. Transparent PNG/SVG preferred.
3. Place shared local coordinates and pivots on every layer, e.g. neck joint, shoulder joints, hip joints, and knee/ankle pivots.
4. Build 3/4, side and back poses separately to avoid mirroring inappropriate details (plaster, clip, bag), as the sheet includes turnarounds.
5. Expose a production-vs-placeholder selector while migrating; continue using existing viseme interpolation/time-based controls.
6. Test at 1080×1920, 30 fps at normal playback speed (including mouth sync and silhouette recognition at thumbnail scale).
7. Ensure commercial rights for music, TTS and illustration; human review must approve assets before exporting an unwatermarked video.

## Acceptance test

A reviewer should distinguish Jange instantly with the artwork shown at **12–20% phone-screen size**, including when the mouth is open. The cheek plaster, pink clip, droopy eyes, asymmetrical long fringe, patched hoodie, Banten fabric accent, torn jeans and mismatched sandals must remain visible. If any of these disappear during a pose or scene, the final rig is not approved.

## Audio note

Existing demo MMS voices are marked `non_commercial_preview`. The studio must replace these with appropriately licensed AI voices or original performances before posting monetized content. Speech recognition or mouth viseme generation does not grant rights to the voice model.

