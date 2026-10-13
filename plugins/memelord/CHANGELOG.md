# Changelog

All notable changes to this plugin will be documented here.

## 0.2.0 — OpenAI plugin directory package

- Root `plugin.json` in Agent Plugins format with `extensions.com.openai` listing metadata, review test cases, and release notes for the ChatGPT and Codex plugin directory.
- Root `mcp.json` now uses the Agent Plugins schema (`type: "streamable-http"`). Cursor keeps its own `.cursor-plugin/mcp.json` (`type: "http"`), referenced from `.cursor-plugin/plugin.json`.
- Skills and the `/meme` command no longer mention a specific client; they tell the user to connect the Memelord MCP server in their AI client.
- New assets: `composer-icon.png`, `composer-icon-dark.png`, and `logo-dark.png` (256x256 PNG).
- `scripts/build-openai-zip.mjs` validates the package against the submission rules and writes `dist/memelord-openai-<version>.zip`.

## 0.1.0 — Initial release

- Skills for finding templates, meme craft, caption memes, AI memes, meme edits, video memes, Higgsfield video models, Higgsfield Genjutsu Video Swap, and account balance checks.
- `/meme <idea>` command that finds the best template and captions it.
- `mcp.json` connecting the agent to the hosted Memelord MCP server with browser sign-in.
