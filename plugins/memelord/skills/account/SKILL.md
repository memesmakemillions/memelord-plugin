---
name: account
description: Check which Memelord account the agent is acting as, its remaining usage balance (credits, in USD), and whether billable Memelord tools can run. Use when the user asks about Memelord credits, balance, or billing, before expensive Higgsfield video jobs, or when a Memelord call fails with a balance or sign-in error.
---

# Memelord account and credits

Memelord is usage-based. Every billable call (meme generation, edits, video memes, Higgsfield video, Higgsfield Genjutsu) draws from the account's balance in US dollars. Search, template lookup, trending, uploads, render status, and account info are free.

All calls go through the hosted Memelord MCP server (`memelord`).

## Check the balance

Call `get_account` (free, no arguments). It returns:

- user id, display name, and email
- usage balance in USD, rounded to cents
- whether billable tools can run right now
- where to add credits
- how this session is authenticated

Summarize it in one or two lines, e.g. "Signed in as <display name>. Balance: $12.40, and billable tools are available." Don't repeat the email unless the user asks.

Useful links for the user:

- Usage and spend: https://www.memelord.com/settings/usage
- Add credits: https://www.memelord.com/settings/billing

## When to check

- Before a Higgsfield video or Higgsfield Genjutsu job, since those bill per second and can cost several dollars.
- Before generating multiple memes (`count` > 1).
- After a billable call fails. When the balance hits zero, billable tools return a clear error and free tools keep working.

## Sign-in problems

- If the `memelord` tools are missing, or calls return 401 / "Authentication required", the user needs to connect the Memelord MCP server (`https://www.memelord.com/api/mcp`) in their AI client and finish the browser sign-in (OAuth) that the client prompts for.
- If sign-in keeps failing, have them disconnect that client under Settings → Developer → Connected Apps on memelord.com, then connect again.
