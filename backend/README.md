# Shorts Studio server gateway

`worker.js` forwards authenticated requests to the existing `render-video.yml` workflow. Rendering runs on GitHub, independently of Safari timers or the phone screen. Source changes do not deploy this Worker automatically.

## Owner setup

Deploy the repository's Worker with Wrangler. Configure `GITHUB_TOKEN` as a fine-grained secret scoped to this repository with Actions read/write; configure a long random `APP_KEY` as another Worker secret. The default allowed origin is `https://ahmedsaleh200507-prog.github.io`; override `ALLOWED_ORIGIN` if needed. Never put secrets in public HTML or the repository. The deployed Worker and the workflow on `main` must both support contract v2 before using the new controls.

This remains a private, single-owner app: APP_KEY is not public multi-user authentication. The UI keeps it in `sessionStorage` for reload recovery within the tab, never in localStorage. Clearing/closing the session requires entering it again. No anonymous render endpoint or paid service is enabled by this change.

## Contract v2

All application requests require the allowed `Origin` and `x-app-key`, except `/health` (origin still required).

- `GET /health`: configuration readiness and `contract_version: 2`.
- `POST /render`: JSON `{script, language, aspect_ratio, video_mode, voice, target_duration, job_id?}`. `script` has 1–12000 characters. `language`: `de|en`; `aspect_ratio`: `9:16|16:9`; `video_mode`: `vector|ai`; `voice`: `female|male`; `target_duration`: `auto|15|30|60|180|300|600`. Returns `202` with the UUID. The duration is a pacing target; measured narration determines the final duration. Legacy `[[VECTOR_2D]]` / `[[ASPECT_16_9]]` prefixes remain accepted and are stripped before narration.
- `GET /status?job_id=<UUID>`: searches the latest 300 dispatched renders and returns actual workflow status. `pending-discovery` means the run is not found yet, not a claim that GitHub accepted it.
- `GET /artifact?run_id=<integer>&metadata=1`: returns artifact size, run URL and expiry without fetching the ZIP.
- `GET /artifact?run_id=<integer>`: streams GitHub's ZIP containing `final.mp4` and the optional `render-report.json`. Only successful renders from the render workflow are accepted. `X-Artifact-Size` is exposed through CORS.

The UI sends a client UUID and persists it **before** dispatch. If the HTTP response drops, reopening/retrying checks that UUID instead of submitting another render. This is client recovery, not an exactly-once distributed queue: an external caller can still submit the same UUID twice. No claim of server-side idempotency is made. Pending jobs survive reload; foreground/pageshow events reconnect. Hidden-page polling pauses while GitHub continues. A rejected 4xx dispatch clears the pending record. The advanced “Mevcut iş kaydını bırak” control explicitly forgets a stale local record and does not cancel the remote render.

## Artifact memory and provenance

The Worker streams ZIP bytes and never buffers the video. GitHub Actions artifact delivery is ZIP-based; the browser still buffers and extracts that archive before MP4 preview/share. To bound memory on phones, the UI checks metadata and refuses archives larger than **120 MiB**. Those can be downloaded from the authenticated GitHub run page. This threshold is a guard, not a guarantee against memory pressure on every device. Direct MP4 delivery without browser ZIP extraction requires separate object storage or a thoroughly tested streaming ZIP extraction service; neither is claimed here.

The UI displays the render report's actual `visualSource`, AI image count, narration model, requested/actual voice gender when available, and every textual render warning (including a Piper fallback voice mismatch). A missing report is stated explicitly. The AI option is labeled animated 2D illustrations, with vector fallback when capacity/key is absent; it is not advertised as a genuine AI motion model.

## Tests and limits

Run `node backend/worker.test.mjs` (**9 tests**) and `node backend/ui.test.mjs` (**9 tests**), for **18 checks** total. They verify request validation/legacy normalization, 12000-character Unicode scripts, contract propagation, authentication, pagination, artifact preflight/streaming, reload recovery, a lost dispatch response, background/foreground recovery, large-file guarding, provenance/warning display and a valid GitHub queue lasting more than 20 polls. Only `pending-discovery` counts toward the missing-dispatch warning; known queued jobs may wait until the overall monitoring timeout. These mocked tests do not establish real iPhone Safari coverage or a deployed end-to-end render. GitHub Actions, Cloudflare and AI providers each have free-tier limits; no unlimited or zero-cost hosting entitlement is assumed.

For real Chromium UI checks after generating both MP4 orientations, install Playwright in the project virtual environment and provide the same JSZip 3.10.1 bundle used by the app:

```sh
.venv/bin/python backend/browser_smoke.py \
  --portrait output/de-portrait/final.mp4 \
  --landscape output/en-landscape/final.mp4 \
  --jszip /tmp/shorts-jszip.min.js
```

The test loads real MP4 bytes through ZIP extraction and browser video metadata, uses touch viewports in both orientations, checks reload and synthetic visibility events without duplicate dispatches, and writes screenshots/report under `output/browser`. Gateway responses are mocked. This remains Chromium coverage; real Safari background suspension and iOS file sharing require a physical device check.
