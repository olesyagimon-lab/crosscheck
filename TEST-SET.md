# Reproducible checks — local V8

Expected test-set identities were recorded before recognition testing. The application loads actual files and runs the same PDF/OCR/review pipeline for samples and new uploads; no prepared findings are returned.

## Capture convention

Every physical unit needs a unique printed letter, A–Z, beside its SKU. Reuse the same letter for that object in every view. Different objects must have different letters. Include one whole-delivery overview plus readable close-ups (at most three photos). Select letters from visible labels during review. Unclear labels or incomplete coverage must remain unconfirmed.

## Source documents and expected findings

`site/assets/packing-list.pdf`: four rows, one unit each: Mug CUP-01, Small towel TOW-S, Candle CND-01, Soap SOAP-01.

- `corrected.jpg`: A=CUP-01, B=TOW-S, C=CND-01, E=SOAP-01. With reviewed codes/letters and both truthful coverage confirmations, expected four confirmed rows.
- `delivery.jpg`: A=CUP-01, B=TOW-L, C=CND-01, D=CND-01, E=obscured. Expected wrong towel and extra candle mismatches. Hidden soap remains unverified. Because not all labels can be checked, leave coverage unchecked; the mug's overall count is also unverified. Never claim that the small towel or soap was not delivered.
- `delivery.jpg` + `clarification.jpg`: the second view reveals E=SOAP-01. With all five units reviewed and full coverage confirmed, expected mug/soap confirmed and towel/candle mismatches. E is counted once across views.
- `clarification.jpg` alone: readable E but no full overview. Expected incomplete quantities/unverified rows, with requests for another view rather than missing-item assertions.
- Any file above without user confirmations: expected unverified findings, never confirmed just because OCR returned text.
- Unsupported multipage/scanned PDFs or tables with no recognizable rows: explain the document limitation and request a supported one-page text PDF. Over three photos and unsupported formats are rejected before recognition.

## Actual browser measurements, 3 October 2026

Headless Chromium 153 tested actual PDF and image uploads at widths 1440, 768 and 390 px. Timing is this test environment, not a speed promise for users' devices. The separate English sample PDF generated for the user was also uploaded, rather than relying only on the built-in document.

| Input and review | Actual result |
| --- | --- |
| Corrected photo, document, reviewed codes and unit letters, coverage confirmed | Four confirmed rows; image region and rendered PDF row available |
| Original photo, no reviewed labels | Four unverified rows; zero false confirmations |
| Original photo, reviewed wrong towel and two distinct candles, incomplete coverage | Two mismatches; mug and hidden soap unverified |
| Corrected flow at desktop/tablet/mobile widths | No horizontal page overflow |
| Whole successful flow, network/page errors | Zero external/API requests; zero uncaught page errors |

A measured corrected run took 5.5 seconds from Read labels to the review screen; local recognition itself took 4.4 seconds and final findings at 5.9 seconds with automated review clicks. Original photo reached review in 4.9 seconds. Human review will add real user time. The UI measures both local recognition and end-to-findings, including review.

OCR failures found: CUP-01 can read CUP-O1, and one CND-01 can read CND-04. The review offers an unselected source-document reading; users must check the image and explicitly select the printed code. Wrong TOW-L stays wrong when confirmed. Letters are selected by the user rather than guessed. This is why recognition is followed by review instead of promising perfect automatic identification.

## Repeat locally

Serve `site` over HTTP using the README instructions. Upload the PDF and corrected photo, click Read labels, inspect the four crops, select A (mug), B (towel), C (candle), E (soap), correct an OCR reading only when the photo supports it, confirm labels and both coverage statements, then Compare. Repeat the original photo with candle letters C/D and incomplete coverage. Click each result and open the PDF row preview to inspect sources.

Run `npm test` for independent deterministic rules: exact SKU identity, similar wrong SKU, excess distinct units, repeated views of a unit, conflicting identifiers, missing identifiers, absent readable detections, source coordinates and ambiguity suggestions.

## Cost and scope limits

Recognition API variable fee: $0 per operation, because there is no paid recognition/reasoning/speech/intermediary service. Retries also run locally. Device computation/electricity and static hosting/bandwidth are separate, unmeasured here; free credits are not used as a cost assumption. Static site assets total approximately 16 MB uncompressed; cached downloads and server compression affect bandwidth.

These sample images were AI-generated; there is no actual physical delivery behind them. They demonstrate UI/recognition checks but do not fulfill the assignment's physical controlled test-set requirement. Photograph a real small delivery with readable printed SKUs and unit letters, record actual contents and expected findings before testing, and document the results. The multi-photo clarification scenario above is covered by comparison-rule tests but was not measured end-to-end in this browser pass. Object recognition, arbitrary PDF layouts and hidden labels remain outside the local reader's capabilities.
