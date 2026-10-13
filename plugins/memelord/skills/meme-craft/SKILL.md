---
name: meme-craft
description: Craft guide for making memes that are actually funny with Memelord. Covers choosing caption vs AI meme vs video meme, matching captions to a template's slot roles, keeping text short, iterating with edit_meme, and avoiding offensive or IP-risky content. Use whenever writing a prompt for generate_caption_meme, generate_ai_meme, or generate_video_meme, or when refining a meme.
---

# Meme craft

The generators write the final caption text from your `prompt`, so the quality of the meme depends on the premise you hand them. This guide covers what to send and how to refine it.

## 1. Pick the medium

| Choose | When | Tool |
| --- | --- | --- |
| **Caption meme** | The joke works as text on a known format. This is the cheapest, fastest, and most predictable option, and the default. | `generate_caption_meme` |
| **AI meme** | The image itself must change: the user's face, product, or logo goes in, a subject gets swapped, or the template has `requires_ai_edit: true`. | `generate_ai_meme` |
| **Video meme** | The user asks for video or a clip, or the joke needs timing, a reaction beat, or sound. | `generate_video_meme` |
| **Higgsfield video or Genjutsu** | Original footage, or putting someone into a clip. Not a meme template. Bills per second, so confirm first. | `video-gen`, `character-swap` |

When unsure, make a caption meme first. It's the cheapest way to test whether the joke works.

## 2. Match the joke to the format

Every format has a shape. Map each slot to its role before writing:

| Format shape | Examples | Slot roles |
| --- | --- | --- |
| Comparison / preference | Drake, Gru's plan (last panel flips) | rejected option, then preferred option |
| Temptation | Distracted Boyfriend | the new shiny thing / the subject / what they're neglecting |
| Escalation | Expanding Brain | each panel more "enlightened" (usually more absurd) than the last |
| Labelled objects | Two Buttons, Is This a Pigeon | each label names one thing in the picture |
| Reaction | Surprised Pikachu, sweating man | setup in text, and the image is the punchline |
| Denial | This Is Fine | the disaster, and the calm response |

Use `get_meme_template` (`text_slot_count`, `description`, `visual_description`) to confirm how many slots there are and what each panel shows. Then put the slot roles in your `prompt`:

- Weak: `"meme about CI"`
- Strong: `"Drake format. Rejected: fixing the flaky test. Preferred: adding retry: 5 and going to lunch. Audience: backend devs."`

## 3. Write punchy captions

- **Short:** aim for under 8 words per slot and never a full sentence when a fragment works. Memes are read in about a second.
- **Specific beats generic:** "npm install at 4:59pm on Friday" is better than "installing packages".
- **Put the punchline last:** in multi-slot formats the final slot or panel carries the twist.
- **Use the audience's language:** real jargon, file names, and tool names make in-group memes land. Explain nothing.
- **One joke per meme:** if the prompt has two ideas, make two memes.
- **Don't caption what the image already says:** in reaction formats, the picture is the punchline.
- **Formatting:** sentence case or lowercase. Skip hashtags and emoji unless the format uses them.

`generate_caption_meme` options that affect craft:

- `use_search_context` (default true) grounds jokes in current events. Set false for evergreen or internal jokes.
- `caption_style` only applies to single-caption templates: `"tiktok"` (bold centered) or `"snapchat"` (strip).
- `category: "trending"` for timely templates, `"classic"` for evergreen ones.

## 4. Iterate instead of regenerating

1. Generate one meme (`count: 1`). Ask for `count` 2-3 only when the user wants options. Each one is billed.
2. Look at `caption_slots` in the result. If the template and image are right but the words aren't, call `edit_meme` with the `edit_handle` instead of generating again.
   - Fix one slot: pass `target_index` (the slot number, starting at 1) and an exact instruction, e.g. `Set this text to exactly: "retry: 5"`.
   - Fix the tone: no `target_index`, plus an instruction like `"make it drier and shorter"`.
3. Every edit returns a new `edit_handle`, and old handles still work, so you can branch back to an earlier version the user preferred.
4. If the format itself is wrong, go back to `search-memes` rather than editing.

## 5. Stay out of trouble

- **Punch up, not down:** no jokes targeting protected traits (race, religion, gender, sexuality, disability, nationality), and no harassment of private individuals.
- **Tragedies:** check `get_trending_memes` `context`. Don't make jokes about real deaths, disasters, or victims.
- **Real people:** no fake quotes or deceptive edits that could pass as real, and no sexualized or humiliating depictions. Only use a person's photo (in AI memes, Higgsfield video, or Higgsfield Genjutsu) when the user supplied it and has the right to use it.
- **Brands and IP:**
  - Don't put third-party logos, trademarks, or characters into ads or marketing copy for the user's brand.
  - Classic meme formats are fine for commentary.
  - For commercial use, warn that celebrity likenesses and copyrighted stills carry rights risk, and suggest a generic or AI-made alternative.
- **Work and brand context:** pass `include_nsfw: false` and `include_political: false` to the generators, and prefer `template_approved: true` when searching.
- If a request is clearly hateful, harassing, or deceptive, decline that version and offer a different angle on the same topic.
