---
name: video-gen
description: Generate original AI video footage through Memelord with Higgsfield video models (Higgsfield Kling 3.0, Higgsfield Kling O3, Higgsfield Seedance 2.0/2.5, Higgsfield Wan 3.0, Higgsfield Cinema Studio 4.0) from a prompt, a start frame, or reference images, clips, and audio. Use when the user wants new AI video, wants to animate a photo, or names one of these models.
---

# AI video generation (powered by Higgsfield)

Memelord runs Higgsfield's pro video models. Use them for brand-new footage, like "a cinematic drone shot over Tokyo at night" or "animate this photo". For a captioned meme template clip use `video-meme`. To put a person into an existing clip use `character-swap`.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## Naming rule (always)

When you mention a model to the user, in plans, confirmations, results, and file names alike, always prefix it with **Higgsfield** and include the version you are actually running. Never say just "Seedance" or "Kling".

| `model_id` | `variant` | Say this |
| --- | --- | --- |
| `kling` | `std` / `turbo` / `pro` / `4k` | Higgsfield Kling 3.0 (Standard / Turbo / Pro / 4K) |
| `kling-o3` | `std` / `pro` | Higgsfield Kling O3 (Standard / Pro) |
| `seedance` | `2.0` | Higgsfield Seedance 2.0 |
| `seedance` | `2.5` | Higgsfield Seedance 2.5 |
| `wan` | `3.0` | Higgsfield Wan 3.0 |
| `wan` | `prime` | Higgsfield Wan 3.0 Prime |
| `cinema-studio` | (none) | Higgsfield Cinema Studio 4.0 |

Versions change. `list_video_models` is the source of truth. If it reports a different version or a new variant, use that version in the label, for example "Higgsfield Seedance 2.6".

## Steps

1. Free: call `list_video_models`. It returns each model's modes, required and optional inputs, rules, and params (options, ranges, defaults). Don't pass params it doesn't list.
2. Pick a model with the user, or pick one for them and say why:
   - Higgsfield Kling 3.0: reliable general text-to-video or image-to-video. Turbo is fastest and cheapest; 4K costs about 3x Standard.
   - Higgsfield Kling O3: stunts and action. Takes a start frame or references (up to 4 images, or 1 motion clip), not both.
   - Higgsfield Seedance 2.0 / 2.5: puts a character into a scene or follows a motion reference, with image, clip, and audio references. 2.5 renders 480p or 720p only.
   - Higgsfield Wan 3.0 / Wan 3.0 Prime: longest clips (2-30 s), references, and an optional `seed`.
   - Higgsfield Cinema Studio 4.0: film-grade shots driven by the prompt and references. It has no start-frame lane.
3. Upload any local media first with `upload_media` (or `create_media_upload_url` for files over 3 MB, then `upload_media` with `upload_id`). Never invent or guess media URLs.
4. Confirm cost before running. These models bill per generated second, and pricing varies a lot by model and tier (see https://www.memelord.com/hackers/docs#usage-pricing). Tell the user the full label, duration, resolution, and that it will draw from their balance. Optionally call `get_account` (free) to confirm the balance covers it.
5. Billable: `run_video_model` with:
   - `model_id` (required) and `prompt` (required, up to 2000 chars: scene, action, camera, lighting, motion).
   - Start frame: `image_url`, optional `end_image_url` (which requires `image_url`).
   - References: `reference_image_urls`, `reference_video_urls`, `reference_audio_urls`. Refer to them in the prompt as "Image 1", "Video 1", "Audio 1". Most models take a start frame or references, not both. Seedance audio references need at least one image or clip.
   - `variant`, `duration`, `aspect_ratio`, `resolution`, `generate_audio`, `seed` (Wan only), and `title`, all within the ranges from `list_video_models`.
6. If the response has `status: "invalid_request"`, nothing was charged. Fix every listed problem and retry once.
7. Otherwise you get a `job_id`. Poll `check_video_status` every 10-15 seconds (it usually takes a few minutes) until `completed` (MP4 URL) or `failed`. Report the result with the full Higgsfield label, e.g. "Here's your 5 s Higgsfield Seedance 2.5 clip at 720p: <url>".

## Rules

- Never start more than one paid generation without the user's go-ahead.
- `list_video_jobs` recovers job ids after a reconnect.
- Only use people's likenesses when the user supplied the photos and has the right to use them.
