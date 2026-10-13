---
name: meme
description: Make a Memelord meme from a one-line idea, e.g. "/meme our CI pipeline on a Friday". Searches for the best template first, then captions it and returns the link.
---

# /meme

Turn the text after `/meme` into a finished meme with Memelord, using the hosted Memelord MCP tools.

1. Treat everything after `/meme` as the idea. If it's empty, ask for a one-line topic.
2. **Search first (free)**, following the `search-memes` skill:
   - If the idea names a template ("drake meme about…"), use `search_memes` with `method: "fulltext"` and that name.
   - Otherwise, work out the shape of the joke and run 2-3 short `search_memes` queries (default `semantic_context`, `type: "meme"`, `limit: 5`). If the idea is about current events, also check `get_trending_memes` and read each item's `context`.
   - Pick the best fit and confirm its slots with `get_meme_template` (`text_slot_count`, `description`).
3. **Caption it (billable)**, following `meme-craft`:
   - If `requires_ai_edit` is false, call `generate_caption_meme` with the chosen `template_id`, `count: 1`, and a short prompt that names the format and each slot's role.
   - If `requires_ai_edit` is true, or the user's photo, product, or logo should appear, use `generate_ai_meme` instead (`ai-meme`).
   - If the idea mentions "video", "clip", or "gif", search with `type: "video"` and use `generate_video_meme` (`video-meme`), polling `check_video_status` until the MP4 is ready.
   - If nothing fits after three queries, call `generate_caption_meme` without `template_id` and let Memelord pick.
4. Reply with the meme URL, the template's familiar name, and one line offering an edit ("Want different text? Tell me what to change."). Handle follow-ups with `edit_meme` and the returned `edit_handle`.
5. If the `memelord` MCP tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

Never use Higgsfield video models or Higgsfield Genjutsu from `/meme`. Those bill per second, so offer them separately and confirm the cost first.
