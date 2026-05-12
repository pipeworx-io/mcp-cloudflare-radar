interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Cloudflare Radar MCP — internet observatory (traffic, attacks, BGP, quality)
 *
 * Cloudflare Radar aggregates anonymized signals from CF's global network to
 * surface internet trends: HTTP traffic by region, DDoS attack patterns, BGP
 * route leaks, and Internet Quality Index (latency/throughput/loss/jitter).
 *
 * Natural fit for Pipeworx — gateway already runs on Cloudflare, so the same
 * CLOUDFLARE_API_TOKEN can be reused via platformKeyEnv.
 *
 * API: https://developers.cloudflare.com/radar/
 * Tools:
 * - internet_quality:   IQI summary (current + change) for a location
 * - attack_summary:     L7 DDoS attack trends, optionally filtered by location
 * - top_locations:      top origins / destinations by HTTP/DNS metric
 * - bgp_leaks:          recent BGP route-leak events
 */


const BASE_URL = 'https://api.cloudflare.com/client/v4/radar';

const tools: McpToolExport['tools'] = [
  {
    name: 'internet_quality',
    description:
      'Internet Quality Index (IQI) summary — bandwidth, latency, jitter, packet loss — current value + change vs prior period. Optionally filtered to a 2-letter location code.',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: '2-letter location code (e.g., "US", "DE", "JP"). Omit for global.' },
        date_range: {
          type: 'string',
          description: 'Lookback window: 1d | 7d | 14d | 28d | 12w | 24w | 52w (default 28d)',
        },
      },
      required: [],
    },
  },
  {
    name: 'attack_summary',
    description:
      'Layer-7 DDoS attack mix over a time window. Returns the percentage breakdown of attacks by mitigation product or attack vector. Filter by location to scope to a region/country.',
    inputSchema: {
      type: 'object',
      properties: {
        dimension: {
          type: 'string',
          description: 'Summary dimension: mitigation_product | http_method | http_version | ip_version | bot_class (default mitigation_product)',
        },
        location: { type: 'string', description: '2-letter location code (optional)' },
        date_range: {
          type: 'string',
          description: 'Lookback window (default 28d)',
        },
      },
      required: [],
    },
  },
  {
    name: 'top_locations',
    description:
      'Top locations by a metric. metric=http_requests returns countries by share of HTTP traffic; metric=dns_queries by DNS; metric=attacks by attack origin. Returns ranked list with share percentages.',
    inputSchema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'http_requests | dns_queries | attacks (default http_requests)',
        },
        date_range: { type: 'string', description: 'Lookback window (default 28d)' },
        limit: { type: 'number', description: '1-100 (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'bgp_leaks',
    description:
      'Recent BGP route-leak events detected by Cloudflare. Returns leaker AS, victim AS, originated prefixes, start/end times.',
    inputSchema: {
      type: 'object',
      properties: {
        date_range: { type: 'string', description: 'Lookback window (default 28d)' },
        limit: { type: 'number', description: '1-500 (default 50)' },
      },
      required: [],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  if (!apiKey) {
    throw new Error(
      'Cloudflare Radar requires an API token. Contact the operator about platform credentials (typically the existing CLOUDFLARE_API_TOKEN), or BYO via ?_apiKey=<token>. Create one at https://dash.cloudflare.com/profile/api-tokens (no special scope required for Radar).',
    );
  }
  switch (name) {
    case 'internet_quality':
      return internetQuality(apiKey, args);
    case 'attack_summary':
      return attackSummary(apiKey, args);
    case 'top_locations':
      return topLocations(apiKey, args);
    case 'bgp_leaks':
      return bgpLeaks(apiKey, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function radarFetch<T>(apiKey: string, path: string, params: URLSearchParams): Promise<T> {
  const url = `${BASE_URL}${path}${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) throw new Error('Cloudflare Radar: unauthorized — check the API token');
  if (res.status === 429) throw new Error('Cloudflare Radar: rate-limit (HTTP 429)');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudflare Radar error: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function commonParams(args: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  if (args.date_range) params.set('dateRange', String(args.date_range));
  if (args.location) params.set('location', String(args.location).toUpperCase());
  return params;
}

async function internetQuality(apiKey: string, args: Record<string, unknown>) {
  const params = commonParams(args);
  const data = await radarFetch<{
    result?: {
      summary_0?: {
        bandwidth_download?: number;
        bandwidth_upload?: number;
        latency_idle?: number;
        latency_loaded?: number;
        jitter_idle?: number;
        jitter_loaded?: number;
        packet_loss?: number;
      };
      meta?: { dateRange?: { startTime?: string; endTime?: string }[] };
    };
  }>(apiKey, '/quality/iqi/summary', params);

  const s = data.result?.summary_0 ?? {};
  return {
    location: args.location ?? 'GLOBAL',
    date_range: args.date_range ?? '28d',
    range_start: data.result?.meta?.dateRange?.[0]?.startTime ?? null,
    range_end: data.result?.meta?.dateRange?.[0]?.endTime ?? null,
    bandwidth_download_mbps: s.bandwidth_download ?? null,
    bandwidth_upload_mbps: s.bandwidth_upload ?? null,
    latency_idle_ms: s.latency_idle ?? null,
    latency_loaded_ms: s.latency_loaded ?? null,
    jitter_idle_ms: s.jitter_idle ?? null,
    jitter_loaded_ms: s.jitter_loaded ?? null,
    packet_loss_pct: s.packet_loss ?? null,
  };
}

async function attackSummary(apiKey: string, args: Record<string, unknown>) {
  const params = commonParams(args);
  const dimension = (args.dimension as string) ?? 'mitigation_product';
  const data = await radarFetch<{
    result?: { summary_0?: Record<string, string>; meta?: unknown };
  }>(apiKey, `/attacks/layer7/summary/${encodeURIComponent(dimension)}`, params);

  const breakdown = data.result?.summary_0 ?? {};
  return {
    dimension,
    location: args.location ?? 'GLOBAL',
    date_range: args.date_range ?? '28d',
    breakdown_pct: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Number(v)]),
    ),
  };
}

async function topLocations(apiKey: string, args: Record<string, unknown>) {
  const metric = (args.metric as string) ?? 'http_requests';
  const params = new URLSearchParams();
  if (args.date_range) params.set('dateRange', String(args.date_range));
  const limit = Math.min(100, Math.max(1, (args.limit as number) ?? 10));
  params.set('limit', String(limit));

  const path =
    metric === 'dns_queries'
      ? '/dns/top/locations'
      : metric === 'attacks'
        ? '/attacks/layer7/top/locations/origin'
        : '/http/top/locations';

  const data = await radarFetch<{
    result?: { top_0?: { clientCountryAlpha2?: string; clientCountryName?: string; value?: string }[] };
  }>(apiKey, path, params);

  const rows = data.result?.top_0 ?? [];
  return {
    metric,
    date_range: args.date_range ?? '28d',
    locations: rows.map((r) => ({
      code: r.clientCountryAlpha2 ?? null,
      name: r.clientCountryName ?? null,
      share_pct: r.value != null ? Number(r.value) : null,
    })),
  };
}

async function bgpLeaks(apiKey: string, args: Record<string, unknown>) {
  const params = commonParams(args);
  const limit = Math.min(500, Math.max(1, (args.limit as number) ?? 50));
  params.set('limit', String(limit));

  const data = await radarFetch<{
    result?: {
      events?: {
        id?: number;
        leak_asn?: number;
        leak_asn_name?: string;
        origin_asns?: number[];
        leak_count?: number;
        leak_seen_at_started_at?: string;
        leak_seen_at_finished_at?: string;
        finished?: boolean;
      }[];
    };
  }>(apiKey, '/bgp/leaks/events', params);

  const events = data.result?.events ?? [];
  return {
    count: events.length,
    events: events.map((e) => ({
      id: e.id ?? null,
      leaker_asn: e.leak_asn ?? null,
      leaker_name: e.leak_asn_name ?? null,
      origin_asns: e.origin_asns ?? [],
      leak_count: e.leak_count ?? null,
      started_at: e.leak_seen_at_started_at ?? null,
      finished_at: e.leak_seen_at_finished_at ?? null,
      ongoing: e.finished === false,
    })),
  };
}

export default { tools, callTool, meter: { credits: 2 } } satisfies McpToolExport;
