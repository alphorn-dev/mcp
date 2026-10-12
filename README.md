# Alphorn MCP Server

MCP server for [Alphorn](https://alphorn.dev), the open-source notification router. It gives AI agents (Claude Code, Claude Desktop, Cursor, Codex, and any other MCP client) a `send_notification` tool, so an agent can tell you when a task finishes, fails, or needs your decision, on whatever channel you configured in Alphorn: Slack, Telegram, Discord, email, SMS, push, and more.

Works with the hosted service at [app.alphorn.dev](https://app.alphorn.dev) and with self-hosted Alphorn.

## Setup

1. Create a webhook in Alphorn and copy its **Endpoint URL** and API key ([docs](https://docs.alphorn.dev/webhooks/)).
2. Add the server to your MCP client with two environment variables:

| Variable | Value |
|---|---|
| `ALPHORN_WEBHOOK_URL` | Endpoint URL, e.g. `https://app.alphorn.dev/n/V1StGXR8_Z5jdHi6B-myT` |
| `ALPHORN_API_KEY` | Webhook API key (`alp_...`). Leave unset if the webhook does not require one. |

### Claude Code

```bash
claude mcp add alphorn -s user \
  -e ALPHORN_WEBHOOK_URL=https://app.alphorn.dev/n/V1StGXR8_Z5jdHi6B-myT \
  -e ALPHORN_API_KEY=alp_... \
  -- npx -y @alphorn/mcp
```

### Claude Desktop, Cursor, and other JSON-configured clients

Add to `claude_desktop_config.json`, `~/.cursor/mcp.json`, or your client's MCP config:

```json
{
  "mcpServers": {
    "alphorn": {
      "command": "npx",
      "args": ["-y", "@alphorn/mcp"],
      "env": {
        "ALPHORN_WEBHOOK_URL": "https://app.alphorn.dev/n/V1StGXR8_Z5jdHi6B-myT",
        "ALPHORN_API_KEY": "alp_..."
      }
    }
  }
}
```

### OpenAI Codex CLI

```toml
# ~/.codex/config.toml
[mcp_servers.alphorn]
command = "npx"
args = ["-y", "@alphorn/mcp"]
env = { ALPHORN_WEBHOOK_URL = "https://app.alphorn.dev/n/V1StGXR8_Z5jdHi6B-myT", ALPHORN_API_KEY = "alp_..." }
```

## Tool

### `send_notification`

| Argument | Type | Required | Description |
|---|---|---|---|
| `message` | string | yes | What happened and what the agent needs from you (max 4,000 characters) |
| `title` | string | no | Short title, e.g. `my-app - tests passing` (max 200 characters) |
| `priority` | integer 1-5 | no | 2 = finished, 3 = needs input, 4 = blocked or failed, 5 = urgent |
| `tags` | string[] | no | Tags to filter and route on in Alphorn, e.g. `["ai-agent", "completed"]` |

Use Alphorn's [filters](https://docs.alphorn.dev/filtering/) to decide where each notification goes, for example SMS only for priority 4 and above.

## Development

```bash
pnpm install
pnpm test   # builds, then runs the tests against a local fake endpoint
```

## License

AGPL-3.0-or-later
