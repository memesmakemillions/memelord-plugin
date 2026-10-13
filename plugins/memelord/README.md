# Memelord plugin

Make memes without leaving your AI client. This plugin teaches the agent how to use [Memelord](https://www.memelord.com), the AI meme and video maker. It covers caption memes from real templates, AI-remixed memes, edits, video memes, Higgsfield AI video models, Higgsfield Genjutsu character swaps, and account balance checks.

The plugin is **skills-first**. Each skill is a short playbook that tells the agent which Memelord MCP tool to call, which parameters are valid, what costs money, and what to confirm with you first. Every skill runs through Memelord's hosted MCP server at `https://www.memelord.com/api/mcp`, which the bundled MCP config connects with a browser sign-in. This plugin ships no server code of its own.

One shared `skills/` folder serves every client. Each client gets a thin manifest:

| Client | Manifest | MCP config |
| --- | --- | --- |
| ChatGPT and Codex (OpenAI plugin directory) | `plugin.json` (Agent Plugins format, with `extensions.com.openai`) | `mcp.json` (`type: "streamable-http"`) |
| Cursor | `.cursor-plugin/plugin.json` | `.cursor-plugin/mcp.json` (`type: "http"`) |

## Included

| Component | What it does |
| --- | --- |
| `skills/search-memes` | Turn an idea into search queries, use trending templates for timely memes, pick the best template, and hand off to the right generator. |
| `skills/meme-craft` | Craft guide: caption vs AI vs video meme, slot-role captions, keeping text short, iterating with edits, and avoiding offensive or IP-risky content. |
| `skills/caption-meme` | New text on a real, unedited meme template. |
| `skills/ai-meme` | AI-remixed memes: the template image is edited to fit the joke, optionally with your photo, product, or logo. |
| `skills/edit-meme` | Rewrite the text of a meme you just made, either the whole caption or one text box. |
| `skills/video-meme` | Captioned video memes from templates (async render, poll for the MP4) and caption edits. |
| `skills/video-gen` | Original AI footage with Higgsfield Kling 3.0, Higgsfield Kling O3, Higgsfield Seedance 2.0 / 2.5, Higgsfield Wan 3.0, and Higgsfield Cinema Studio 4.0. |
| `skills/character-swap` | Higgsfield Genjutsu Video Swap: put a person or character into an existing clip. |
| `skills/account` | Show the signed-in account and remaining usage balance, and troubleshoot sign-in. |
| `commands/meme.md` | `/meme <idea>` (Cursor only): searches for the best template, then captions it. Not part of the OpenAI package. |
| `plugin.json` + `mcp.json` | Agent Plugins manifest and MCP config used by ChatGPT and Codex. |
| `.cursor-plugin/` | Cursor manifest and MCP config. |
| `assets/` | `logo.png`, `logo-dark.png`, `composer-icon.png`, `composer-icon-dark.png` (256x256 PNG). |

## Setup

You need a Memelord account. Generation tools draw from your account's usage balance; see [usage and pricing](https://www.memelord.com/hackers/docs#usage-pricing).

Both MCP configs register the hosted Memelord MCP server and contain no credentials:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "memelord": {
      "type": "streamable-http",
      "url": "https://www.memelord.com/api/mcp"
    }
  }
}
```

1. Install the plugin. Your client adds the `memelord` MCP server.
2. When the client shows the login prompt for `memelord`, click it. Sign in to Memelord (email, Google, or Apple) and approve the connection. This is OAuth 2.1 with PKCE, and tokens refresh automatically.
3. Ask the agent "How much Memelord credit do I have?" to confirm it's connected.

To revoke access, go to Settings → Developer → Connected Apps on memelord.com.

## Try it

- "What meme templates are trending right now?"
- "Make a Drake meme about tabs vs spaces, then change the bottom text to be about YAML."
- "Make a video meme about shipping on Friday."
- "Animate this photo with Higgsfield Kling 3.0 Turbo, 5 seconds, 9:16."
- "Use Higgsfield Genjutsu to put me (photo attached) into this dance clip."
- "How much Memelord credit do I have left?"
- In Cursor: `/meme when the tests pass locally but fail in CI`

## OpenAI plugin directory package

`plugin.json` carries the listing (`extensions.com.openai.interface`), the review block (five positive and three negative test cases, demo recording URL, commerce declaration), and `publication.release_notes`. Build and validate the submission ZIP from the repository root:

```bash
node scripts/build-openai-zip.mjs          # validate, then write dist/memelord-openai-<version>.zip
node scripts/build-openai-zip.mjs --check  # validate only
```

The ZIP contains `plugin.json`, `mcp.json`, `LICENSE`, `skills/`, and `assets/`. It excludes `commands/`, `.cursor-plugin/`, and repo documentation. Reviewer credentials are never part of the package; they are entered in the submission portal.

## Support

For help with your Memelord account, billing, or sign-in, use the [contact form](https://www.memelord.com/contact) or email [support@memelord.com](mailto:support@memelord.com). Report plugin bugs on the [issue tracker](https://github.com/memesmakemillions/memelord-plugin/issues).

Source code: [github.com/memesmakemillions/memelord-plugin](https://github.com/memesmakemillions/memelord-plugin).

## Safety and cost

- The skills tell the agent to generate one result at a time and to confirm before Higgsfield jobs, which bill per second.
- Media URLs come only from you, uploaded through `upload_media`. The agent is told never to invent URLs or pull other people's photos.
- No secrets are stored in this plugin.

## License

[MIT](LICENSE)
