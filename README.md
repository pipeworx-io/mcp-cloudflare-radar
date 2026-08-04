# @pipeworx/cloudflare-radar

Cloudflare Radar MCP — internet observatory (traffic, attacks, BGP, quality).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `internet_quality(location?, date_range?)` — IQI summary.
- `attack_summary(dimension?, location?, date_range?)` — L7 DDoS attack mix.
- `top_locations(metric?, date_range?, limit?)` — top countries by HTTP / DNS / attack share.
- `bgp_leaks(date_range?, limit?)` — recent BGP route-leak events.

## Auth

- **Platform key:** gateway env `PLATFORM_CLOUDFLARE_RADAR_KEY` (or reuse `CLOUDFLARE_API_TOKEN`).
- **BYO:** `?_apiKey=<token>` after creating one at https://dash.cloudflare.com/profile/api-tokens (no special scope required for Radar).

## Data source

`https://api.cloudflare.com/client/v4/radar/` — Bearer token.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "cloudflare-radar": {
      "url": "https://gateway.pipeworx.io/cloudflare-radar/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Cloudflare Radar data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
