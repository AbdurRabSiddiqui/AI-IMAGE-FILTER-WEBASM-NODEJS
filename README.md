## WASM + ONNX Runtime Web Style Transfer (Next.js)

Client‑side neural style transfer using ONNX Runtime Web (WASM) in a Next.js App Router project. Upload an image, choose a style, adjust strength, and download the stylized result. Works offline after the first load.

### Features

- ONNX Runtime Web (WASM) inference in the browser
- Pretrained Fast Neural Style models (ONNX Model Zoo)
  - Van Gogh → `rain-princess-9.onnx`
  - Picasso → `udnie-9.onnx`
  - Georges Seurat (Pointillism) → `pointilism-9.onnx`
  - Cyberpunk (closest FNS) → `candy-9.onnx`
- Aspect‑ratio‑preserving preprocessing (letterbox to 224×224)
- Postprocessing crop (remove padding), then scale back to the original size
- Style Strength slider (blend original vs. stylized)
- Download PNG + Reset
- Offline support (service worker caches JS/WASM/models)

### Tech

- Next.js 15 (App Router)
- onnxruntime‑web
- TypeScript & React
- Service worker for caching `public/models/*.onnx`, JS, WASM, and static assets

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
# Local: http://localhost:3000 (Turbopack may auto‑pick :3001)
```

## Usage

1. Place ONNX models under `public/models/` (already included):
   - `vangogh.onnx` (rain-princess-9)
   - `picasso.onnx` (udnie-9)
   - `georgesseurat.onnx` (pointilism-9)
   - `cyberpunk.onnx` (candy-9)
2. Open the app, upload an image, and choose a style.
3. Click “Apply [Style] Style with WASM”.
4. Use the Style Strength slider to blend with the original.
5. Download PNG or Reset.

## How it Works

- Preprocess: the image is letterboxed (no stretch) to 224×224 and converted to `[1,3,H,W] float32`.
- Inference: ONNX Runtime Web runs the style model in WASM.
- Postprocess: the output tensor is converted to an image, cropped to remove letterbox padding, and scaled back to the original dimensions.
- Blending: the original and stylized images are alpha‑blended based on the Style Strength slider.

## Offline Support

- A service worker at `public/sw.js` caches:
  - `/models/*.onnx`, JS bundles, WASM files, and static assets
- After the first successful load, the app runs without internet.

## Project Structure (key files)

```
src/
  app/
    page.tsx                 # UI & pipeline wiring
    layout.tsx               # Registers service worker client component
    ServiceWorkerRegister.tsx# SW registration (client-only)
  lib/
    image-preprocess.ts      # letterbox + tensor creation
    image-postprocess.ts     # tensor→image, crop/scale, blending
    onnx-runtime.ts          # session cache + run helper
    logger.ts                # lightweight logger
public/
  models/*.onnx              # ONNX models (6.7MB each approx.)
  sw.js                      # service worker
```

## Notes & Limitations

- Fast Neural Style models expect 224×224 inputs; letterboxing avoids stretch but reduces raw detail. We crop the padding and upscale the output for display.
- For higher fidelity and arbitrary styles, consider upgrading to AdaIN or WCT2 (content + style image) ONNX.

## License

MIT. Check the ONNX Model Zoo licenses for the model weights you choose to include.
