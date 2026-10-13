---
name: character-swap
description: Put a person or character into an existing video clip with Higgsfield Genjutsu Video Swap on Memelord, keeping the clip's motion, choreography, camera, timing, and audio. Use when the user says "put me in this video", "swap the dancer for my character", wants a face or character swap in a clip, or mentions Genjutsu.
---

# Character swap (powered by Higgsfield Genjutsu)

Higgsfield Genjutsu Video Swap transposes a person or character into a source clip. **Motion transfer** (the default) rebuilds the shot around the new character. **Object swap** keeps the original footage and swaps an object or creature.

Always call it **Higgsfield Genjutsu** (or "Higgsfield Genjutsu Video Swap") when talking to the user, never just "Genjutsu". Memelord has not published a Genjutsu version number. If `list_video_models` starts reporting one, include it in the label.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## Inputs (both required, both must come from the user)

- **Source clip**: `video_url` (public URL, 4-30 s; longer clips are trimmed to 30 s), or `video_job_id` of a finished video on the same Memelord account, such as a Higgsfield video made earlier.
- **Character photos**: `character_image_urls`, 1-8 public photo URLs. Put a clear, front-facing photo first.

Never invent, guess, or substitute either input, and never pull a stranger's photo from the web. If the user gave local files or attachments, upload them:

- Photos and clips up to 3 MB: `upload_media` with `data_base64` (or `source_url` for an https link) and `filename`.
- Clips over 3 MB: `create_media_upload_url` with `content_type` (e.g. `video/mp4`) and `size_bytes`, PUT the bytes to `upload_url` with that Content-Type, then `upload_media` with `upload_id`.
- Images up to 10 MB, videos up to 100 MB (MP4, MOV, WebM). Uploads are free and limited to 50 per hour. URLs last 7 days.

## Steps

1. Optional, free: `list_video_models` and read the `genjutsu` entry under `remix_models` for the current params.
2. Gather the inputs above. Ask for everything missing in one message.
3. Confirm cost. Higgsfield Genjutsu bills per second of the source clip, and only once the job starts. 480p costs about half as much as 720p. Optionally check the balance with `get_account` (free).
4. Billable: `run_genjutsu` with:
   - `video_url` or `video_job_id`
   - `character_image_urls`
   - `mode`: `"motion-transfer"` (default) or `"object-swap"`
   - `resolution`: `"720p"` (default) or `"480p"`
   - `prompt`: optional, up to 400 chars, short direction in the user's words (wardrobe, lighting, mood)
   - `title`: optional, up to 120 chars
5. If the response is `status: "needs_input"`, nothing was started or charged. Ask the user once for everything it lists, then call again.
6. Otherwise poll `check_video_status` with the `job_id` every 10-15 seconds until `completed` (MP4 URL) or `failed`. Report it as a Higgsfield Genjutsu result.

## Rules

- Get consent: only swap in people who supplied their own photos or whom the user has the right to depict. Refuse deceptive or non-consensual uses.
- One paid job at a time unless the user explicitly asks for more.
