---
name: caption-meme
description: Make a classic caption meme with Memelord by writing new text onto a real, unedited meme template (Drake, Distracted Boyfriend, etc.). Use when the user wants a plain text meme on a known template, after a template has been chosen with search-memes.
---

# Memelord caption memes (templates)

A caption meme puts new text on a real template image. The picture itself is never AI-edited. If the user wants the picture changed (new subjects, their face, their product), use the `ai-meme` skill instead.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## Steps

1. Free: pick a template with the `search-memes` skill (`search_memes`, `get_trending_memes`, `get_meme_template`). If the chosen template has `requires_ai_edit: true`, switch to `ai-meme`.
2. Write the `prompt` with the `meme-craft` skill: name the format, give each slot's role, and keep it short and specific.
3. Billable: call `generate_caption_meme` with:
   - `prompt` (required): the joke premise, ideally with slot roles, e.g. `"Drake format. Rejected: reading the docs. Preferred: asking the agent."`
   - `template_id`: pin the template the user chose. Omit to let Memelord pick.
   - `count`: 1-10, default 1. Each meme is billed separately, so keep it at 1 unless the user asks for options.
   - `category`: `"classic"` (default) or `"trending"`.
   - `caption_style`: `"tiktok"` (default, bold centered outline) or `"snapchat"` (translucent strip). Only affects single-caption templates.
   - `use_search_context`: default true (grounds the joke in live web results). Set false for faster output.
   - `include_nsfw` / `include_political`: both default true. Set false for work or brand contexts.
4. Show each returned image URL to the user. Keep `template_id`, `caption_slots`, and `edit_handle` from the result. If the wording is off, refine it with `edit_meme` (see `edit-meme`) rather than generating again.

## Rules

- Image URLs are signed and expire. Tell the user to save anything they want to keep.
- Don't invent template ids. Only use ids returned by `search_memes`, `get_trending_memes`, or a previous generation.
- If a billable call fails for insufficient balance, check the balance with the `account` skill and point the user to https://www.memelord.com/settings/billing.
