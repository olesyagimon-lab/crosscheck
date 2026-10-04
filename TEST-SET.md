# V9 expected and actual results

The fixture contents and expected outcomes were defined before the browser recognition run. All files use the same upload pipeline as new user input. Fixtures are kept under tests/fixtures, not offered as examples on the website. No A/B/C identifiers or prepared app results remain.

Document PNG/PDF: Storage box BOX-12 quantity 1; Small towel TWL-23 quantity 1; Spoon SPN-34 quantity 1.

Capture convention: one frame, all units separated, existing codes facing the camera, one visible code per unit. Replacing the overview clears its detections; additional views cannot double-count objects. Overlapping detections for a label are deduplicated. Different printed copies of a code on one object remain a limitation.

| Input | Expected | Actual browser result | Time to result |
| --- | --- | --- | --- |
| Document photo + normal.png (three codes) | 3 visible matches | 3 visible matches | 4.9 s |
| Text PDF + extra.png (two SPN-34 labels) | 2 matches, 1 mismatch | 2 matches, 1 mismatch | 8.5 s |
| Document photo + wrong.png (TWL-99) | 2 matches, 1 mismatch | 2 matches, 1 mismatch | 6.6 s |
| Text PDF + hidden.png (no readable SPN-34) | 2 matches, 1 unverified | 2 matches, 1 unverified; no nondelivery claim | 5.8 s |

Chromium 153 was used with actual file uploads at desktop 1440 px, tablet 768 px and mobile 390 px. No horizontal overflow, uncaught page errors, external requests or recognition API requests were recorded. Source document row and photo region highlights were inspected, including the photographed document. Timings are this test environment, not promises for target devices. The UI reports total automatic start-to-result time, with no mandatory human review.

Failures found and fixed: bundled English model bytes failed initialization and were replaced with a verified copy from installed Tesseract. Sparse-only OCR missed clear synthetic package labels; adding a second layout reading recovered those labels. Automatic confidence thresholds are heuristic, not calibrated probabilities. No claim of perfect label detection is made.

Run npm test for exact identity, excess quantities, duplicate-region merging, wrong codes, hidden/no detections, low OCR confidence, ambiguous codes, uncertain document text, conservative shortfalls and source row coordinates.

To reproduce browser checks: npm install; npx playwright install chromium; npm run test:browser. The browser script serves site locally, uploads fixture files, asserts outcomes, checks page widths and local-only requests, and records screenshots/timings in tests/output. Runtime dependencies and downloaded browser are not included in deliverable ZIPs.

Recognition API fee: $0 because there are no paid recognition/reasoning/speech/intermediary calls, including retries. Hosting, bandwidth and device CPU/electricity remain separate and unmeasured. Static site assets are about 15 MB uncompressed. Free credits are not a pricing assumption.

These are synthetic precision OCR fixtures, not physical goods or real controlled delivery photographs. The assignment still requires an actual small delivery, recorded physical contents, expected findings before testing, and a corrected-delivery photograph. General product recognition, arbitrary invoice layouts and a guarantee that hidden objects were checked are not implemented. The user's one-overview scenario replaces the original multi-view flow.
