# One-tap rendering backend: deployment requirements

The repository now contains `backend/worker.js`, a **prototype** Cloudflare Worker that forwards a text render request to GitHub Actions. It is not deployed, and the GitHub Pages UI is not connected yet.

## Required owner setup
1. Create a Cloudflare Worker (free tier limits apply), deploy `backend/worker.js`.
2. Set Worker secrets `GITHUB_TOKEN` (fine-grained token limited to Actions write permission on this repository) and `APP_KEY` (long random private value). Set `ALLOWED_ORIGIN=https://ahmedsaleh200507-prog.github.io`.
3. Do **not** embed either secret in the static GitHub Pages source or commit them.
4. The current Worker only enqueues jobs. It does not return progress or downloadable MP4. A production backend must add authenticated job ownership, request throttling, job tracking and an artifact delivery mechanism.
5. A shared APP_KEY typed into a public browser is not a secure user-authentication solution for a public app. Do not expose this prototype to anonymous users without adding proper authentication and rate limits.

## Current capabilities
- GitHub Actions manual rendering workflow and smoke test exist.
- Worker accepts POST /render with JSON {script, language} and x-app-key header, dispatches workflow and returns HTTP 202.
- There is **no** end-to-end one-button experience yet.

## Acceptance
Only label the feature working after deploying the Worker, adding secure user authentication, connecting the frontend, verifying a completed job and downloading an MP4 that has an audible AAC audio stream.
