---
name: video-meme
description: Generate and re-caption video memes with Memelord. Memelord picks a video meme template, writes the caption, and renders an MP4 asynchronously. Use when the user wants a video meme, a captioned meme clip, or a reaction video about a topic, or wants to change a video meme's caption.
---

# Memelord video memes

Video memes are template clips (reaction videos, classic video formats) with an AI-written caption burned in. Rendering is asynchronous: you get job ids back, then poll for the MP4.

This skill is not for new AI footage or for putting someone into a clip. For those, use `video-gen` and `character-swap`.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## Generate

1. Optional, free: `search_memes` with `type: "video"` (or `get_trending_memes` with `media_type: "video"`) to pick a template.
2. Billable: `generate_video_meme` with:
   - `prompt` (required): topic or idea.
   - `template_id`: optional video template id.
   - `count`: 1-5, default 1, billed per video.
   - `category`: `"trending"` or `"classic"`.
   - `force_caption_style`: `"top"` (letterbox above the clip) or `"tiktok"` (centered overlay). Omit to use the template default.
   - `include_nsfw` / `include_political`: default true.
3. The call returns `job_id`s right away. Poll `check_video_status` with each `job_id` every 5-10 seconds until `status` is `completed` (it returns the MP4 URL) or `failed`. Polling is free.
4. If you lose track of jobs, `list_video_jobs` (optionally with `status` and `limit`) lists recent jobs with MP4 URLs.
5. Keep each job's `template_id` and `caption` so the user can request caption edits.

## Re-caption

Billable: `edit_video_meme` with `instruction`, `template_id`, and the current `caption` (all required), plus optional `force_caption_style`. This starts a new render job, so poll `check_video_status` again.

## Rules

- MP4 URLs are signed and expire. Tell the user to download anything they want to keep.
- Confirm with the user before `count` > 1.
