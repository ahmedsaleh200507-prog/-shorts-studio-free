# Shorts Studio — AI 2D rendering (experimental)

The GitHub Actions renderer can now generate **one original illustration per sentence** using a remote ComfyUI GPU server. The existing simple 2D renderer remains the fallback when ComfyUI is not configured.

## Activation

1. Start a ComfyUI instance on a GPU-equipped cloud host, with HTTPS connectivity from GitHub Actions. Free GPU quotas are not guaranteed and a paid service is not required by this repository.
2. Install a licensed 2D illustration checkpoint in that ComfyUI instance. Replace `REPLACE_WITH_INSTALLED_2D_MODEL.safetensors` in `render/comfyui_workflow.json` with its actual filename.
3. Add repository Actions secret `COMFYUI_URL` with the full HTTPS base URL of your ComfyUI server. Optionally add `COMFYUI_API_TOKEN` if your server accepts a bearer token.
4. Trigger a video from the app. The render logs say `AI 2D scene generated with ComfyUI` if AI mode was used, or `Legacy 2D scene used` if it was not configured.

**Security:** Do not expose an unauthenticated ComfyUI server to the public internet. Protect the endpoint with authentication and TLS. Never enter API keys into the web page or commit them to this repository.

**Limitations:** This first integration generates original 2D illustrations and applies the existing FFmpeg camera movement. It does NOT yet generate articulated character animation, Godot motion rigs, or Remotion-based typography. It is NOT equivalent to the reference videos. Each sentence currently has a 180-second image-generation deadline, which may exceed the GitHub Actions 20-minute limit for long scripts. GPU availability and costs depend on the chosen provider. The model filename in the sample workflow must be updated before AI rendering works.
