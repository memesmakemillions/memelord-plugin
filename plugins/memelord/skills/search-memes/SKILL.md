---
name: search-memes
description: Find the right Memelord meme template for an idea using search_memes, get_trending_memes, and get_meme_template, then hand off to the caption, AI meme, or video meme skill. Use before generating any meme, when the user asks for a specific template, asks what's trending, or wants options to choose from.
---

# Finding the right template

A meme lands or dies on the template. Search first, pick deliberately, then generate. Every tool in this skill is free, so search freely. Spending only starts at generation.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## 1. Turn the idea into queries

Before searching, pull out the **shape of the joke**, not just the topic. "Our CI is slow" is a topic. The shape is "waiting forever", "pretending everything is fine", or "choosing the worse option".

| The user gives you | Search with |
| --- | --- |
| A template name ("drake", "distracted boyfriend", "this is fine") | `method: "fulltext"` with the name. Use `"fuzzy"` if it's misspelled or half-remembered. |
| A situation or feeling ("when the deploy works first try") | the default `semantic_context`, with the query phrased as the situation or emotion |
| A visual ("a dog in a burning room") | `method: "semantic_combined"` |
| An image they like (a public URL) | `method: "semantic_media"` with `media_url` (no `query` needed) |

Run 2-3 short queries from different angles rather than one long one. For example, for "our CI is slow": `"waiting forever"`, `"skeleton waiting"`, `"pretending everything is fine"`.

Useful filters:

- `type`: `"meme"` for image templates, `"video"` for video meme templates (`video-meme`), `"sticker"` for stickers.
- `limit`: 5-10 is enough to choose from (default 20, max 100).
- `template_approved: true`: only curator-approved templates, a good default for brand or work content.
- `include_nsfw: false`: use it for work, brand, or unknown audiences. The default is true.
- `face_swappable: true`: only templates with a swappable face (pairs with `ai-meme` reference photos).
- `tags`: restrict to assets with any of the listed tags.
- `min_score` (0-1): lower it when a specific query returns nothing. The response's `min_score_applied` shows the floor that was used.
- `exclude_ids`: skip templates you already used, but only when starting a fresh search, never while paging.

**Paging:** if `has_more` is true, repeat the exact same call with `offset: next_offset`. Stop when `next_offset` is null.

## 2. Use trending for timely memes

Call `get_trending_memes` when the user wants something current ("what's hot", "this week", or a reaction to news), or when there's no strong template idea yet.

- `limit`: 1-12 (default 3). `media_type`: `"image"` or `"video"`; omit it for a mix.
- Each item has a `context` blurb explaining the format and its tone. **Read it before using the template.** Some trends come from tragedies, crimes, or real people's worst moments. Skip those for jokes unless the user explicitly wants commentary, and never use them for brand content.
- `inspiration_examples` are image URLs showing how others have used the format. Use them to learn the format's beats, not to copy their jokes.
- Trending templates go stale fast. Use them for timely memes, and use classics (`category: "classic"` at generation) for evergreen ones.

## 3. Pick the best result

Search results give you `id`, `name`, `description`, `tags`, `preview_url`, and `requires_ai_edit`. Shortlist 2-3 and check:

1. **Format fit:** does the template's structure match the joke's shape (comparison, escalation, reaction, or labelled objects)? A great topic in the wrong format falls flat. See `meme-craft` for format shapes.
2. **Recognizability:** prefer well-known formats for wide audiences and niche ones for in-groups.
3. **`requires_ai_edit`:** if true, the template needs the image edited to work. Route it to `generate_ai_meme`, not `generate_caption_meme`.
4. **Tone and risk:** drop anything whose `description`, `tags`, or `context` signals tragedy, hate, or sexual content when that's wrong for the audience.

Then call `get_meme_template` with the winner's `template_id`. Read:

- `text_slot_count`: how many text boxes you're writing for.
- `description` / `visual_description`: what each panel or person does. Use this to infer each slot's role, e.g. Drake's top slot is "rejected" and the bottom slot is "preferred".
- `aliases` and `canonical_name`: the names people know it by. Mention the familiar one to the user.
- `requires_ai_edit` and `has_composer_template`: whether the template renders cleanly as a plain caption meme.

When the user wants to choose, show the shortlist with names and `preview_url`s and recommend one, with a one-line reason.

## 4. Hand off

Pass the chosen `template_id` along:

| Situation | Go to |
| --- | --- |
| New text on the unchanged image, and `requires_ai_edit` is false | `caption-meme` (`generate_caption_meme`) |
| The image must change, `requires_ai_edit` is true, or the user's photo, product, or logo goes in | `ai-meme` (`generate_ai_meme`) |
| A video template (`type: "video"`) | `video-meme` (`generate_video_meme`) |
| Changing the text of something already generated | `edit-meme` (`edit_meme`), no new search needed |

Use `meme-craft` to write the `prompt` you send to the generator.

## Rules

- Only pass `template_id`s returned by these tools. Never invent one.
- If nothing fits after 3 queries, tell the user what you tried and either lower `min_score` or let the generator pick (omit `template_id`).
- Don't show the raw storage URLs as the deliverable. They're previews of the blank template, not the finished meme.
