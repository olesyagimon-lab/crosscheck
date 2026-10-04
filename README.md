# Crosscheck V9 — document photo + one delivery overview

English responsive prototype. Add one packing-list photo (or one-page text PDF) and one photo of all unpacked items. Click Check delivery for an automatic comparison. Letter stickers, sample/demo buttons and mandatory label review have been removed.

## Run and deploy

`python3 -m http.server 8000 --directory site`, then open http://localhost:8000. Do not open index.html via file://.

For the existing Cloudflare Pages project, Create deployment → Production → upload crosscheck-one-photo-v9.zip → Save and deploy. index.html is at the ZIP root. No Worker, secret or paid API is required. This archive updates the site only after deployment; it does not publish itself.

`npm test` runs comparison/parser tests. For reproducible browser checks: `npm install`, `npx playwright install chromium`, `npm run test:browser`. Optional npm run dev/deploy uses Wrangler.

## Capture convention

All delivered units appear together in ONE overview, separated without stacking, existing SKU codes facing the camera. One visible printed SKU label per physical unit. No A/B/C identifiers. A second overview is rejected so objects cannot be counted again across views. A clearer overview replaces the previous one.

This convention avoids repeated views, but multiple copies of a code printed on the same object can still overcount it. The UI explicitly reports readable label regions, not inferred object identities. Do not use this reader to infer arbitrary retail products by appearance.

## Actual capabilities

Bundled Tesseract.js 6.0.1 performs neural text recognition locally. PDF.js 4.10.38 extracts text PDFs and renders source previews. The comparison itself uses explicit rules, not a multimodal reasoning model. No cloud AI service is called. It reads English names/codes/quantities in a simple Product / SKU / Quantity table; row formats with extra price columns are unsupported. Up to five distinct SKU rows; codes must include a hyphen or underscore.

Document photographs are read with line OCR, parsed as supported rows and retain row bounds/confidence. Uploaded images normalize to JPEG at 94% quality with a 2560 px maximum edge. Photo inputs: JPG/PNG/WEBP/AVIF up to 20 MB; PDF up to 5 MB. Browser-readable formats only; export HEIC as JPG.

Delivery labels are located with sparse-text OCR and automatically enlarged for a second pass. Overlapping same-code regions are deduplicated. Automatic matches require high-confidence exact code readings and equal readable-region quantity. Possible OCR substitutions and low-confidence document/label readings stay unverified. Excess readable labels or a clearly different code within the same SKU family produce differences. Fewer labels, no labels or obscured labels never establish nondelivery.

Each finding highlights the source document row and supporting delivery-photo regions. Match wording is deliberately 'Visible match': it cannot prove that every hidden/unlabelled object was checked. Files stay in the browser; static OCR assets are served by the host. Stop checking and per-operation 90-second timeouts retain uploaded files for retry.

## Cost, speed and reused components

Recognition API cost is $0 because no paid recognition, reasoning, speech or intermediary service is invoked; retries are local. Hosting/bandwidth and device compute/electricity are separate and not measured here. No free-credit pricing assumption is used. The UI measures start-to-result latency. See TEST-SET.md for browser measurements and failures.

Reused: Tesseract.js 6.0.1, its bundled WebAssembly core, English traineddata from installed Tesseract, PDF.js 4.10.38, existing responsive styles and model/video/unboxing assets. Relevant licenses are bundled. Own changes: document-photo ingestion with OCR row bounds, one-overview upload flow, automatic conservative comparison, spatial region deduplication, evidence, removal of letter review and demos, cancellation/timeouts and tests.

## Assignment limitations

The user's revised one-overview scenario is narrower than the original brief's up-to-three-photo scenario. There is no generalized object recognition, barcode decoding, arbitrary invoice extraction or automated supplier complaint. The included synthetic fixtures are precision OCR test material, not photographs of an actual physical delivery. The original assignment still requires a real controlled delivery/test set, recorded physical contents, target-device measurements, a repository and a short walkthrough. Do not claim complete automatic presence detection for arbitrary goods.
