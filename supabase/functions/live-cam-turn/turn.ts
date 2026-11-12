// Live Cam WebRTC: short-lived TURN credentials for one live session, from whichever relay is set up.
// The relay is chosen by Supabase secrets only, never in code:
// - cloudflare (Realtime TURN, the owner's choice): CF_TURN_KEY_ID + CF_TURN_API_TOKEN, used for
//   POST rtc.live.cloudflare.com/v1/turn/keys/<id>/credentials/generate-ice-servers with {ttl}.
// - coturn (self-hosted, kept as an option): TURN_URLS + TURN_SHARED_SECRET, coturn's TURN REST API
//   ("use-auth-secret"): username "<expiry unix seconds>:<tag>", credential base64(HMAC-SHA1(secret, username)).
// - TURN_PROVIDER picks one explicitly; unset = whichever has its secrets (Cloudflare first).
// - nothing set: 'none' -> no servers, and the app stays on WebSocket JPEG.
// Nothing here logs a secret or a credential.

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export type TurnProvider = 'coturn' | 'cloudflare' | 'none';

export interface TurnConfig {
  provider: TurnProvider;
  /** coturn: the relay's stun:/turn:/turns: URLs. */
  urls: string[];
  sharedSecret?: string;
  ttlSeconds: number;
  cfKeyId?: string;
  cfApiToken?: string;
  /** Why the provider resolved to 'none' (for the function's log; never contains a secret). */
  reason?: string;
}

export interface TurnResult {
  provider: TurnProvider;
  ice_servers: IceServer[];
  ttl: number;
}

/** About an hour (owner, 12 Nov 2026): a live session lasts minutes; TURN_TTL_SECONDS overrides. */
export const DEFAULT_TTL_SECONDS = 3600;
/** Credentials are only issued for a live session started this recently and not ended. */
export const SESSION_MAX_AGE_SECONDS = 20 * 60;

export interface LiveSessionRow {
  user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

/** Only a signed-in shopper's own live session that is starting or running, and recent. */
export function liveSessionAllowsTurn(row: LiveSessionRow | null | undefined, userId: string, nowMs: number): boolean {
  if (!row || row.user_id !== userId) return false;
  if (row.status !== 'starting' && row.status !== 'running') return false;
  if (row.ended_at) return false;
  const started = Date.parse(row.started_at);
  return Number.isFinite(started) && nowMs - started >= -60_000 && nowMs - started <= SESSION_MAX_AGE_SECONDS * 1000;
}
const MIN_TTL = 60;
const MAX_TTL = 86_400; // Cloudflare allows up to 48 h; a live session lasts minutes.

const URL_RE = /^(stun|turn|turns):([^?:/\s]+)(?::(\d+))?(?:\?transport=(udp|tcp))?$/i;

/** stun:/turn:/turns: URLs from a comma- or space-separated list; port 53 and duplicates dropped. */
export function parseTurnUrls(raw: string | undefined | null): string[] {
  const out: string[] = [];
  for (const part of (raw ?? '').split(/[\s,]+/)) {
    const u = part.trim();
    const m = URL_RE.exec(u);
    if (!m) continue;
    if (m[3] === '53') continue;
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

export function readTurnConfig(get: (name: string) => string | undefined): TurnConfig {
  const rawTtl = Number.parseInt((get('TURN_TTL_SECONDS') ?? '').trim(), 10);
  const ttlSeconds = Number.isFinite(rawTtl) ? Math.min(MAX_TTL, Math.max(MIN_TTL, rawTtl)) : DEFAULT_TTL_SECONDS;
  const urls = parseTurnUrls(get('TURN_URLS'));
  const hasCloudflare = !!(get('CF_TURN_KEY_ID') ?? '').trim() && !!(get('CF_TURN_API_TOKEN') ?? '').trim();
  const hasCoturn = !!(get('TURN_SHARED_SECRET') ?? '').trim() && urls.length > 0;
  const explicit = (get('TURN_PROVIDER') ?? '').trim().toLowerCase();
  const provider = explicit || (hasCloudflare ? 'cloudflare' : hasCoturn ? 'coturn' : '');
  if (provider === 'coturn') {
    const sharedSecret = (get('TURN_SHARED_SECRET') ?? '').trim();
    if (!sharedSecret) return { provider: 'none', urls: [], ttlSeconds, reason: 'TURN_SHARED_SECRET missing' };
    if (!urls.some((u) => /^turns?:/i.test(u))) return { provider: 'none', urls: [], ttlSeconds, reason: 'TURN_URLS has no turn: or turns: URL' };
    return { provider: 'coturn', urls, sharedSecret, ttlSeconds };
  }
  if (provider === 'cloudflare') {
    const cfKeyId = (get('CF_TURN_KEY_ID') ?? '').trim();
    const cfApiToken = (get('CF_TURN_API_TOKEN') ?? '').trim();
    if (!cfKeyId || !cfApiToken) return { provider: 'none', urls: [], ttlSeconds, reason: 'CF_TURN_KEY_ID or CF_TURN_API_TOKEN missing' };
    return { provider: 'cloudflare', urls: [], cfKeyId, cfApiToken, ttlSeconds };
  }
  return { provider: 'none', urls: [], ttlSeconds, reason: provider ? `unknown TURN_PROVIDER ${provider}` : 'no TURN secrets set' };
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** A pseudonymous tag for the TURN username (shows in coturn's logs): not the user id itself. */
export async function userTag(userId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`livecam-turn:${userId}`)));
  return `u${Array.from(digest.slice(0, 6)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** coturn TURN REST API credentials (use-auth-secret / static-auth-secret). */
export async function coturnCredential(secret: string, ttlSeconds: number, tag: string, nowSeconds: number): Promise<{ username: string; credential: string }> {
  const username = `${Math.floor(nowSeconds) + ttlSeconds}:${tag}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(username)));
  return { username, credential: bytesToBase64(mac) };
}

export async function coturnIceServers(cfg: TurnConfig, tag: string, nowSeconds: number): Promise<IceServer[]> {
  const stun = cfg.urls.filter((u) => /^stun:/i.test(u));
  const turn = cfg.urls.filter((u) => /^turns?:/i.test(u));
  const servers: IceServer[] = [];
  if (stun.length) servers.push({ urls: stun });
  if (turn.length && cfg.sharedSecret) {
    const { username, credential } = await coturnCredential(cfg.sharedSecret, cfg.ttlSeconds, tag, nowSeconds);
    servers.push({ urls: turn, username, credential });
  }
  return servers;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ status: number; json: () => Promise<unknown> }>;

export async function cloudflareIceServers(cfg: TurnConfig, fetchFn: FetchLike): Promise<IceServer[]> {
  const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cfg.cfKeyId ?? '')}/credentials/generate-ice-servers`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.cfApiToken ?? ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: cfg.ttlSeconds }),
  });
  if (res.status !== 201 && res.status !== 200) throw new Error(`cloudflare turn http ${res.status}`);
  const body = (await res.json()) as { iceServers?: unknown };
  const list = Array.isArray(body?.iceServers) ? body.iceServers : [];
  const servers: IceServer[] = [];
  for (const s of list as Array<Record<string, unknown>>) {
    const raw = Array.isArray(s?.urls) ? (s.urls as unknown[]) : [s?.urls];
    const urls = parseTurnUrls(raw.filter((u): u is string => typeof u === 'string').join(','));
    if (!urls.length) continue;
    const entry: IceServer = { urls };
    if (typeof s.username === 'string' && typeof s.credential === 'string') {
      entry.username = s.username;
      entry.credential = s.credential;
    }
    servers.push(entry);
  }
  return servers;
}

export async function iceServersFor(cfg: TurnConfig, tag: string, nowSeconds: number, fetchFn: FetchLike): Promise<TurnResult> {
  if (cfg.provider === 'coturn') return { provider: 'coturn', ice_servers: await coturnIceServers(cfg, tag, nowSeconds), ttl: cfg.ttlSeconds };
  if (cfg.provider === 'cloudflare') return { provider: 'cloudflare', ice_servers: await cloudflareIceServers(cfg, fetchFn), ttl: cfg.ttlSeconds };
  return { provider: 'none', ice_servers: [], ttl: 0 };
}
