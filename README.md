# Memelord plugin

Agent plugin for [Memelord](https://www.memelord.com), the AI meme and video maker. One shared set of skills with thin per-client manifests: a root `plugin.json` (Agent Plugins format) for the ChatGPT and Codex plugin directory, and `.cursor-plugin/plugin.json` for Cursor.

The `memelord` plugin teaches the agent to find the right meme template, write memes that land, and make caption memes, AI memes, meme edits, video memes, Higgsfield AI videos, and Higgsfield Genjutsu character swaps. It can also check your Memelord balance. Every skill calls tools on Memelord's hosted MCP server, which the plugin connects with a browser sign-in (OAuth).

Features, setup, and example prompts: [`plugins/memelord/README.md`](plugins/memelord/README.md)

## Install in Cursor

### From the Cursor Marketplace

1. In Cursor, open **Customize** in the sidebar, or browse [cursor.com/marketplace](https://cursor.com/marketplace).
2. Search for **Memelord**, select **Install**, and choose project or user scope.
3. Connect your Memelord account. Cursor shows a sign-in prompt for the `memelord` MCP server; approve it in the browser. See [Setup in the plugin README](plugins/memelord/README.md#setup).
### From GitHub

```bash
git clone https://github.com/memesmakemillions/memelord-plugin.git
mkdir -p ~/.cursor/plugins/local
cp -R memelord-plugin/plugins/memelord ~/.cursor/plugins/local/memelord
```

Then restart Cursor (or run **Developer: Reload Window**) and check **Customize** for the Memelord skills, the `/meme` command, and the `memelord` MCP server. To update, `git pull` in the clone and copy the folder again. Copy the folder rather than symlinking it: Cursor only follows symlinks that point inside `~/.cursor/plugins/local`. On Teams and Enterprise plans, an admin must enable **Allow Local Plugin Imports**.

### Team marketplace (Teams and Enterprise)

Admins can add this repo for their whole team: Cursor Dashboard → **Plugins & MCPs** → **Team Marketplaces** → **Add Marketplace** → **Import from Repo**, then paste `https://github.com/memesmakemillions/memelord-plugin`. Cursor reads `.cursor-plugin/marketplace.json` at the repo root.

## Repository layout

```text
.
├── .cursor-plugin/
│   └── marketplace.json            # marketplace manifest
├── docs/
│   └── add-a-plugin.md
├── plugins/
│   └── memelord/
│       ├── .cursor-plugin/
│       │   ├── plugin.json         # Cursor manifest
│       │   └── mcp.json            # Cursor MCP config (type: http)
│       ├── assets/
│       │   ├── logo.png
│       │   ├── logo-dark.png
│       │   ├── composer-icon.png
│       │   └── composer-icon-dark.png
│       ├── commands/
│       │   └── meme.md             # /meme <idea> (Cursor only)
│       ├── skills/
│       │   ├── account/SKILL.md
│       │   ├── ai-meme/SKILL.md
│       │   ├── caption-meme/SKILL.md
│       │   ├── character-swap/SKILL.md
│       │   ├── edit-meme/SKILL.md
│       │   ├── meme-craft/SKILL.md
│       │   ├── search-memes/SKILL.md
│       │   ├── video-gen/SKILL.md
│       │   └── video-meme/SKILL.md
│       ├── CHANGELOG.md
│       ├── LICENSE
│       ├── mcp.json                # Agent Plugins MCP config (type: streamable-http)
│       ├── plugin.json             # Agent Plugins manifest + extensions.com.openai
│       └── README.md
├── scripts/
│   ├── build-openai-zip.mjs        # validate and package for the OpenAI plugin directory
│   └── validate-template.mjs       # validate the Cursor marketplace layout
├── LICENSE
└── README.md
```

## Validate and build

Requires Node.js 18 or later. No dependencies.

```bash
node scripts/validate-template.mjs
node scripts/build-openai-zip.mjs
```

`validate-template.mjs` checks the marketplace and Cursor plugin manifests, relative paths, and frontmatter on every skill and command.

`build-openai-zip.mjs` checks `plugins/memelord/plugin.json` and `mcp.json` against the [OpenAI plugin submission rules](https://developers.openai.com/plugins/deploy/submission) (text lengths, HTTPS URLs, brand color contrast, referenced image files, exactly five positive and three negative review cases with real Memelord tool names, exactly one MCP server, no headers, secrets, hooks, or app references), then writes `dist/memelord-openai-<version>.zip` containing `plugin.json`, `mcp.json`, `LICENSE`, `skills/`, and `assets/`. Pass `--check` to validate without writing the ZIP. Uploading to the OpenAI portal is a manual step.

## OpenAI plugin directory

The same `plugins/memelord` folder is the submission package for ChatGPT and Codex. The root `plugin.json` carries listing metadata, review test cases, and release notes under `extensions.com.openai`; `mcp.json` declares the single hosted MCP server. See [`plugins/memelord/README.md`](plugins/memelord/README.md#openai-plugin-directory-package).

## Links

- Memelord MCP and tools: [memelord.com/hackers/mcp](https://www.memelord.com/hackers/mcp)
- Pricing: [memelord.com/hackers/docs#usage-pricing](https://www.memelord.com/hackers/docs#usage-pricing)
- Issues: [github.com/memesmakemillions/memelord-plugin/issues](https://github.com/memesmakemillions/memelord-plugin/issues)

## License

[MIT](LICENSE)
