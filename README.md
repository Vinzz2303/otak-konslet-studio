# Otak Konslet Studio — 2D Animation Production Engine (MVP)

A locally running, reusable 2D animation production studio and rendering engine built with **React**, **TypeScript**, **Remotion**, **Node.js (Express)**, and **Tailwind CSS** for the original Indonesian animated series **"Otak Konslet Studio"**.

---

## Core Architecture & Features

1. **Animation Studio Dashboard (`src/App.tsx`)**
   - **Scene & Episode Editor**: Edit episode metadata, scene durations, lighting modes (`blackout_contrast`, `fluorescent_hum`, `emergency_red_glitch`), and character staging coordinates.
   - **Multi-Character Dialogue & Lip-Sync Editor**: Edit Indonesian dialogue lines, start time, duration, speaker emotion, head/body gesture instructions, upload `.wav`/`.mp3` voice recordings, and inspect syllable-level visemes (`REST`, `AA`, `EE`, `OH`, `OO`, `FV`, `SHOCK`).
   - **Layered 2D Character Library & Live Rig Sandbox**: Inspect and test the 11+ articulated SVG layers for **Jange**, **Bang Dullah**, and **Mesin Kasir POS-01** in real time.
   - **Cinematic 2D Camera System**: Configure `zoom_in`, `zoom_out`, `pan`, `shake`, `zoom_and_shake`, and transitions (`fade_from_black`, `cross_dissolve`, `glitch_flash`, `hard_cut_to_black`).
   - **Multi-Track Timeline & 9:16 Program Monitor**: Scrub across Scenes, Dialogue, and Camera tracks with real-time `@remotion/player` preview.
   - **Commercial Safety & Human Review Gate**: Built-in asset provenance checklist and mandatory human review sign-off gate before publishing.

2. **First Demo Episode Included**
   - **Title**: *"Kiamat Dimulai dari Minimarket Ciruas"* (`data/episodes/ep01-minimarket-ciruas.json`)
   - **Format**: `1080x1920` (9:16 Vertical HD), `30 FPS`, `20 seconds` (`600 frames`), H.264 MP4 with synthesized audio stems.
   - **Story**:
     - `0–5s`: Establishing shot of Ciruas Mart during a mysterious blackout in Ciruas, Banten.
     - `5–10s`: Jange walks into the minimarket entrance and asks: *"Bang, kok toko lu doang yang nyala?"*
     - `10–15s`: Bang Dullah shrugs behind the cashier counter: *"Gue juga kagak ngerti, Nge."*
     - `15–20s`: The POS cashier terminal activates on its own: *"Pelanggan berikutnya: JANGE."* Jange freezes in shock. Hard cut to black at `18.8s`.

---

## Installation & Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate demo WAV audio stems & initialize episode JSON
npm run generate:audio

# 3. Start the full Animation Studio (Express API on :3001 + Vite UI on :5173)
npm run dev

# 4. Export the Episode to MP4 via CLI (outputs to out/ep01-minimarket-ciruas.mp4)
npm run render

# 5. Open Remotion Studio directly (optional)
npm run remotion:studio
```

