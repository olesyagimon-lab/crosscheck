# Crosscheck - free local delivery checking (V8)

Responsive English browser prototype for a one-page text packing list, up to five product types and three photographs. Photo/SKU recognition runs locally, using bundled Tesseract.js 6.0.1 and the English Tesseract model. Text PDF extraction and document preview use bundled PDF.js 4.10.38. No paid API, account, token or secret is required. Uploaded files never leave the browser. Static reader assets are served by your host.

## Run or deploy

For local use: `python3 -m http.server 8000 --directory site`, then open http://localhost:8000. Do not open index.html as a file:// URL: module imports and workers need HTTP.

Cloudflare dashboard: open the existing Pages project, select Create deployment -> Production, upload crosscheck-free-v8.zip, then Save and deploy. index.html is at the ZIP root. No build step or backend Worker is used. Old OPENAI_API_KEY secrets are unused and may be removed from Cloudflare. No billing account for a recognition service is required.

Optional Wrangler workflow: npm install, npm run dev or npm run deploy.

## User flow

1. Add a one-page text PDF and 1-3 clear photos. Select Read labels after selecting all views.
2. The app extracts rows and reads label regions using local OCR. Small regions are enlarged and read a second time.
3. Review actual photo crops. Confirm each readable code and select the letter printed on that physical unit. O/0, I/1, B/8, S/5, separator or single-character ambiguities within the same SKU family may offer a document-code reading, but it is never selected or accepted automatically.
4. Confirm full-delivery coverage only if every physical item has a detected, readable label and unique printed unit letter. Otherwise leave coverage unchecked.
5. Compare with packing list. Each finding links the extracted document row and bounding regions in the images. The original PDF row is also highlighted in the rendered document.

Same unit letter across photos represents the same physical object and is counted once. Conflicting codes on the same letter stay unverified. A visible wrong code in the same hyphen-delimited SKU family establishes a mismatch; an unseen label never establishes nondelivery. Quantity confirmations require user-confirmed coverage, reviewed labels and distinct unit letters. SKU case is compared in uppercase; O/0 and separators are not silently normalized to one another. Blurred text stays unverified. The user confirms source-derived readings; they do not retype the source into a form.

The matching sample button loads the sample PDF and corrected photograph into the same upload/recognition pipeline. There are no filename switches, saved recognition outputs or prepared results in the app. Existing sample photographs are AI-generated, not real physical delivery evidence.

## Supported input

PDF rows must be on a single line with Product, SKU and Quantity, optionally preceded by a row number. Example: `1 Small towel TOW-S 1`. Codes contain letters/numbers with hyphens or underscores; up to five distinct codes, one row per code. Unsupported document layouts, scanned PDFs, more than one page and unreadable rows produce specific requests for a suitable document rather than invented rows.

JPG, PNG, WEBP and browser-decodable AVIF inputs may be up to 20 MB. They are decoded, resized proportionally to a 2560 px maximum edge, and converted to JPEG (94% quality, at most 5 MB). HEIC requires export to JPG. Normalized preview coordinates and recognition coordinates agree. Exact duplicate file selections are ignored. The reader has a 90-second per-photo watchdog and a Stop checking action; failed/cancelled operations retain files in the tab.

## Tests and measurements

`npm test` runs deterministic tests for row extraction, source coordinates, exact SKU identity, different similar SKU, extra units, repeated-view deduplication, conflicting unit IDs, unknown counts and absent/hidden views. Real OCR browser checks were also run on sample files at desktop, tablet and mobile sizes; see TEST-SET.md for observed outcomes and limitations.

The UI measures local recognition time and time from Read labels to findings, which includes human review time. It reports recognition API cost $0: the implementation makes no recognition API requests. This is not a promise of zero total hosting or device cost. Hosting, download bandwidth and device CPU/electricity are separate; their cost depends on your deployment and device. Browser QA observed zero external requests. Reader/model files are bundled (~16 MB uncompressed including the rest of the website).

## Reused components and changes

Reused: PDF.js 4.10.38 (Apache 2.0), Tesseract.js 6.0.1 (Apache 2.0), Tesseract.js core WebAssembly dependency (licenses included), English traineddata from installed Tesseract distribution, earlier site assets including user-supplied photos and AI-generated test photos/model photo/video background. The previous OpenAI backend has been removed.

Own changes: English responsive interface, navy palette, muted looping video, upload normalization, supported-table parser, spatial OCR candidate extraction, enlarged-region second pass, ambiguity confirmation, unit-ID review, count/dedup rules, conservative uncertainty, PDF/image source highlights, sample loading, timing, cancellation and local tests.

## Remaining limitations

This is conservative text recognition and human review, not arbitrary object recognition or a warehouse system. It cannot reliably infer identities from appearance, see behind covered labels, guarantee every object was detected, or handle all PDF layouts. The coverage confirmation is supplied by the user. Original generated test photos are not a substitute for the assignment's required physical controlled photographs. Supply your own physical test delivery, record expected results before testing and measure on your target devices. No automated supplier complaints or integrations are included.
