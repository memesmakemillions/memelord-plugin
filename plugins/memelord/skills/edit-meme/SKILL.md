---
name: edit-meme
description: Change the text of an image meme previously generated with Memelord, either the whole caption or a single text box, and re-render it. Use when the user says "make it about X instead", "change the bottom text", or otherwise wants to tweak a meme that was just made.
---

# Memelord meme edits

Edits rewrite the text on a meme that came out of `caption-meme` or `ai-meme` and return a freshly rendered image. To change the caption of a video meme, use `video-meme`.

All calls go through the hosted Memelord MCP server (`memelord`). If its tools aren't available, tell the user to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in, then stop.

## Steps

1. Find the `edit_handle` from the generation (or previous edit) the user is referring to. If several memes are in play, ask which one, or use the most recent.
2. Billable: call `edit_meme` with:
   - `instruction` (required): plain language, e.g. `"make the bottom text about JavaScript instead"`.
   - `edit_handle` (required): the handle from that result.
   - `target_index`: the slot number from `caption_slots` (starting at 1) to change only one text box. Omit it to let the editor decide.
3. Show the new URL. The result includes updated `caption_slots` and a new `edit_handle`. Earlier handles stay valid, so the user can branch from any version.

## Rules

- Handles only work for the Memelord account that created them. Don't fabricate one. If you don't have a handle, generate a new meme instead.
- Each edit is billable. Batch the user's requested changes into one instruction when possible.
- To lock exact wording, target one slot and say so, e.g. `Set this text to exactly: "retry: 5"`. For caption-writing tips, see `meme-craft`.
- If the template itself is wrong, edits won't fix it. Go back to `search-memes`.
