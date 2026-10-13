---
name: ai-meme
description: Generate AI-remixed image memes with Memelord, where the template picture itself is AI-edited to fit the joke, optionally painting in a person, product, or logo from reference images. Use when the user asks to "make a meme about X", wants their face, product, or brand in a meme, or wants something beyond plain template text.
---

# Memelord AI memes (remix)

An AI meme starts from a template, then AI-edits the image (swapping subjects, adding objects, painting in reference images) before captioning it. For new text on an untouched template, use `caption-meme`.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## Steps

1. Optional, free: pick a template with `search-memes`. Use `face_swappable: true` when a person's photo goes in. Write the `prompt` with `meme-craft`: say what the image should become and what each caption slot should say.
2. If the user supplied their own images (local files or chat attachments), upload each one first. Never invent or guess media URLs.
   - Up to 3 MB: `upload_media` with `data_base64` (or `source_url` for a public https link), plus `filename`.
   - Larger: `create_media_upload_url` with `content_type` and `size_bytes`, PUT the bytes to the returned `upload_url` with that Content-Type, then `upload_media` with `upload_id`.
   - JPEG, PNG, and WebP up to 10 MB. Uploads are free, limited to 50 per hour, and the returned URL lasts 7 days.
3. Billable: call `generate_ai_meme` with:
   - `prompt` (required): topic or joke premise.
   - `reference_image_urls`: up to 3 public image URLs (person, product, logo, or style).
   - `template_id`: optional, from `search_memes` or `get_trending_memes`.
   - `count`: 1-10, default 1, billed per meme.
   - `category`: `"trending"` or `"classic"` (default is both).
   - `include_nsfw` / `include_political`: default true. Set false for brand-safe output.
4. Show the returned image URLs. Keep `template_id`, `caption_slots`, and `edit_handle` for follow-up edits with `edit-meme`.

## Rules

- Confirm before `count` > 1. Every meme draws from the user's usage balance.
- Only use real people's photos when the user supplied them and is entitled to use them.
- If a call fails for insufficient balance, use the `account` skill and link https://www.memelord.com/settings/billing.
