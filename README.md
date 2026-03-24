# Bead Magic Workshop

> Turn any photo or pixel art into a bead pattern — pick your brand, get a color-matched grid and a ready-to-use parts list.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Bead Magic Workshop** runs as a **WeChat Mini Program** and in the browser as **H5**. Upload an image, choose your bead palette (Mard, Artkal, Hama, Perler, and more), and in a few taps you’ll have a printable pattern with color codes and bead counts.

---

## Table of Contents

- [Why Bead Magic Workshop?](#-why-bead-magic-workshop)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Configuration](#-configuration)
- [License](#-license)

---

## ✨ Why Bead Magic Workshop?

Making bead art from a picture usually means resizing in an editor, guessing colors, and counting beads by hand. Bead Magic Workshop does the heavy lifting: it maps your image to **real bead palettes** using perceptual color matching (CIELAB), gives you a **parts list (BOM)** you can copy, and lets you **tweak colors** and **export** the result as an image or a full poster. Whether you’re turning a photo into a gift or aligning a pixel-art grid to your favorite beads, it’s built to get you from idea to pattern quickly.

---

## 🎯 Features

| | |
|---|---|
| **Two modes** | **Standard** — any image becomes a bead grid (you choose the width in beads). **Pixel grid** — for pixel art or pre-gridded images: align the overlay grid (pan, zoom, 1–5% ratio), then the app slices by that grid. |
| **Brand palettes** | Mard, Artkal, Hama, Perler, Perler Mini, Nabbi — full color data (hex, RGB, LAB) for accurate matching. |
| **Smart matching** | CIELAB-based nearest color; optional “dominant color” per cell so each bead better reflects the original. |
| **Editor** | Toggle color codes, merge rare colors, switch circle/square beads, dense or spaced layout. Tap a cell to change its color or highlight all beads of that color. |
| **BOM** | Color code + count per color; tap to highlight on canvas; copy the whole list. |
| **Export** | Save the canvas as an image, or export a long poster (title, grid, BOM, optional watermark). |
| **Content safety** | On WeChat, uploads and text (e.g. watermark) go through the platform’s content check before use. |

---

## 🛠 Tech Stack

- **[uni-app](https://uniapp.dcloud.net.cn/)** (Vue 3) + TypeScript — one codebase for H5 and WeChat Mini Program  
- **Vite 5** — fast dev and builds  
- **WeChat Mini Program Cloud** — cloud init and cloud functions for content moderation  

The codebase is structured so you can add other uni-app targets (e.g. Alipay, QQ) if needed.

---

## 🚀 Quick Start

**Prerequisites:** Node.js 18+ (and [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) + app id if you’re building the mini program)

```bash
git clone https://github.com/kennyWFR/bead-magic-workshop.git
cd bead-magic-workshop/pindou
npm install
```

**Run in the browser (H5):**

```bash
npm run dev:h5
```

Open http://localhost:3000 (or the port shown in the terminal).

**Run as WeChat Mini Program:**

```bash
npm run dev:mp-weixin
```

Then in WeChat DevTools, open the project from the `dist/dev/mp-weixin` folder. If you use image/text security checks, enable Cloud and deploy the `securityCheck` cloud function.

**Production builds:**

```bash
npm run build:h5          # output in dist/ (exact path may vary by uni-app version)
npm run build:mp-weixin   # output in dist/; open in WeChat DevTools and upload via admin
```

---

## 📁 Project Structure

```
pindou/
├── src/
│   ├── main.ts                 # App entry
│   ├── App.vue                 # Root; cloud & security init (WeChat)
│   ├── pages.json              # Routes
│   ├── manifest.json           # App id, cloud, H5, mp-weixin
│   ├── uni.scss                # Global SCSS variables
│   ├── types/index.ts         # Palette, brand, conversion, match types
│   ├── utils/
│   │   ├── paletteData.ts     # Brand palettes (Mard, Artkal, Hama, …)
│   │   ├── colorMatcher.ts    # RGB/LAB nearest-color matching
│   │   └── imageProcessor.ts  # Preprocess, sharpen, dominant color
│   └── pages/
│       ├── index/index.vue    # Home: type, brand, upload, grid, generate
│       └── editor/editor.vue  # Editor: canvas, BOM, tools, export
├── cloudfunctions/securityCheck/   # WeChat cloud function (content safety)
├── index.html
├── vite.config.ts            # Copies cloudfunctions into mp-weixin dist
└── package.json
```

---

## 🔬 How It Works

1. **Home** — You pick image type (standard or pixel grid), bead brand, and upload an image. WeChat users get a quick content check on the image. For standard mode you set the bead width; for pixel mode you align the red grid (ratio, pan, zoom) and tap **Generate**.
2. **Editor** — The image is turned into a grid: each cell is sampled (mean or dominant color), then matched to your brand palette using **LAB distance** (ΔE). In pixel mode, the same grid you aligned on the home screen is used to slice the image; each square is matched to the palette.
3. **Color matching** — We use precomputed LAB values and pick the palette color with the smallest ΔE, so matches look right to the eye rather than only in RGB.
4. **Export** — You can export the current canvas or a full “long poster” (fixed width, with title, grid, BOM, watermark). On WeChat, watermark text is checked before export.

---

## ⚙️ Configuration

- **WeChat app id & cloud:** `src/manifest.json` → `mp-weixin.appid`, `mp-weixin.cloud`.
- **H5:** Same file, `h5` section (e.g. `title`, `router`, `devServer.port`).
- **Cloud function:** The Vite plugin copies `cloudfunctions/` into the WeChat build. Deploy `securityCheck` in DevTools and point your `@/utils/securityCheck` (and `cloud-init` if you have it) at it.

---

## 📄 License

[MIT](LICENSE) — use it, change it, ship it.
