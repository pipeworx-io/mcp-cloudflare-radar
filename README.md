# @pipeworx/cloudflare-radar

Cloudflare Radar MCP — internet observatory (traffic, attacks, BGP, quality).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1856+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

- `internet_quality(location?, date_range?)` — IQI summary.
- `attack_summary(dimension?, location?, date_range?)` — L7 DDoS attack mix.
- `top_locations(metric?, date_range?, limit?)` — top countries by HTTP / DNS / attack share.
- `bgp_leaks(date_range?, limit?)` — recent BGP route-leak events.
- `radar_domain_rank(domain, date?)` — a single domain's popularity rank/bucket, category, and top locations. Answers "is this domain widely visited, or nowhere".
- `radar_top_domains(limit?, location?, date?)` — the most-visited domains globally or by country.
- `radar_ai_bots(dimension?, date_range?, location?, user_agent?, limit?)` — Cloudflare Radar AI bots: share of AI-crawler traffic (GPTBot, ClaudeBot, PerplexityBot, Bytespider, ...) by user agent, crawl purpose or industry. Unknown `user_agent` returns `found:false`.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/cloudflare-radar/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1856+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/internet_quality \
  -H 'Content-Type: application/json' \
  -d '{"location":"US","date_range":"7d"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/internet_quality`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-cloudflare-radar` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/cloudflare-radar/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "cloudflare-radar": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-cloudflare-radar"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Cloudflare Radar data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
