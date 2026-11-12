import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TTL_SECONDS,
  cloudflareIceServers,
  coturnCredential,
  iceServersFor,
  liveSessionAllowsTurn,
  parseTurnUrls,
  readTurnConfig,
  userTag,
} from '../../../../../supabase/functions/live-cam-turn/turn';

const env = (vars: Record<string, string>) => (name: string) => vars[name];

describe('live-cam-turn: which relay', () => {
  it('Cloudflare when its two secrets are set (the owner\'s choice), with a short TTL', () => {
    const cfg = readTurnConfig(env({ CF_TURN_KEY_ID: 'kid', CF_TURN_API_TOKEN: 'tok' }));
    expect(cfg).toMatchObject({ provider: 'cloudflare', cfKeyId: 'kid', cfApiToken: 'tok', ttlSeconds: DEFAULT_TTL_SECONDS });
    expect(DEFAULT_TTL_SECONDS).toBe(3600); // about an hour, as the owner asked
    expect(readTurnConfig(env({ CF_TURN_KEY_ID: 'kid', CF_TURN_API_TOKEN: 'tok', TURN_TTL_SECONDS: '900' })).ttlSeconds).toBe(900);
    expect(readTurnConfig(env({ CF_TURN_KEY_ID: 'kid', CF_TURN_API_TOKEN: 'tok', TURN_TTL_SECONDS: '5' })).ttlSeconds).toBe(60);
    expect(readTurnConfig(env({ CF_TURN_KEY_ID: 'kid', CF_TURN_API_TOKEN: 'tok', TURN_TTL_SECONDS: 'x' })).ttlSeconds).toBe(DEFAULT_TTL_SECONDS);
  });

  it('off (no servers, app stays on JPEG) when nothing or only half is set', () => {
    expect(readTurnConfig(env({})).provider).toBe('none');
    expect(readTurnConfig(env({ CF_TURN_KEY_ID: 'kid' })).provider).toBe('none');
    expect(readTurnConfig(env({ TURN_PROVIDER: 'cloudflare', CF_TURN_KEY_ID: 'kid' }))).toMatchObject({ provider: 'none', reason: expect.stringContaining('CF_TURN_API_TOKEN') });
    expect(readTurnConfig(env({ TURN_PROVIDER: 'other' })).reason).toMatch(/unknown/);
  });

  it('self-hosted coturn stays possible (TURN_URLS + TURN_SHARED_SECRET)', () => {
    const cfg = readTurnConfig(env({ TURN_URLS: 'stun:t.example.com:3478, turn:t.example.com:3478?transport=udp turns:t.example.com:443?transport=tcp', TURN_SHARED_SECRET: 's' }));
    expect(cfg.provider).toBe('coturn');
    expect(readTurnConfig(env({ TURN_PROVIDER: 'coturn', TURN_URLS: 'stun:t.example.com', TURN_SHARED_SECRET: 's' })).provider).toBe('none');
  });

  it('keeps only stun/turn/turns URLs, drops port 53 and duplicates', () => {
    expect(parseTurnUrls('turn:a:3478?transport=udp,turn:a:53?transport=udp, http://x ,turn:a:3478?transport=udp turns:a:443?transport=tcp')).toEqual([
      'turn:a:3478?transport=udp',
      'turns:a:443?transport=tcp',
    ]);
    expect(parseTurnUrls(undefined)).toEqual([]);
  });
});

describe('live-cam-turn: credentials', () => {
  it('coturn REST credential is "<expiry>:<tag>" with base64 HMAC-SHA1 of it (what coturn checks)', async () => {
    const { username, credential } = await coturnCredential('topsecret', 900, 'uabc', 1_800_000_000);
    expect(username).toBe('1800000900:uabc');
    expect(credential).toBe(createHmac('sha1', 'topsecret').update(username).digest('base64'));
  });

  it('the TURN username carries a pseudonymous tag, not the user id', async () => {
    const tag = await userTag('7f1c2b3a-0000-4000-8000-000000000001');
    expect(tag).toMatch(/^u[0-9a-f]{12}$/);
    expect(tag).not.toContain('7f1c2b3a');
    expect(await userTag('7f1c2b3a-0000-4000-8000-000000000001')).toBe(tag);
  });

  it('Cloudflare: POSTs {ttl} with the Bearer token to generate-ice-servers and cleans the answer', async () => {
    const fetchFn = vi.fn(async () => ({
      status: 201,
      json: async () => ({
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
          { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
        ],
      }),
    }));
    const cfg = readTurnConfig(env({ CF_TURN_KEY_ID: 'key/1', CF_TURN_API_TOKEN: 'tok' }));
    const servers = await cloudflareIceServers(cfg, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith('https://rtc.live.cloudflare.com/v1/turn/keys/key%2F1/credentials/generate-ice-servers', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: DEFAULT_TTL_SECONDS }),
    });
    expect(servers).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
    ]);
  });

  it('Cloudflare refusing is an error (the function then answers with no servers)', async () => {
    const cfg = readTurnConfig(env({ CF_TURN_KEY_ID: 'k', CF_TURN_API_TOKEN: 't' }));
    await expect(cloudflareIceServers(cfg, async () => ({ status: 401, json: async () => ({}) }))).rejects.toThrow(/401/);
  });

  it('iceServersFor answers per provider', async () => {
    const coturn = readTurnConfig(env({ TURN_URLS: 'stun:t.example.com:3478,turn:t.example.com:3478?transport=udp', TURN_SHARED_SECRET: 's' }));
    const out = await iceServersFor(coturn, 'uabc', 1_800_000_000, vi.fn());
    expect(out.provider).toBe('coturn');
    expect(out.ice_servers[0]).toEqual({ urls: ['stun:t.example.com:3478'] });
    expect(out.ice_servers[1]).toMatchObject({ urls: ['turn:t.example.com:3478?transport=udp'], username: `${1_800_000_000 + DEFAULT_TTL_SECONDS}:uabc` });
    expect(await iceServersFor(readTurnConfig(env({})), 'u', 0, vi.fn())).toEqual({ provider: 'none', ice_servers: [], ttl: 0 });
  });
});

describe('live-cam-turn: only for a live session', () => {
  const now = Date.parse('2026-11-12T16:00:00Z');
  const row = (over: Partial<{ user_id: string; status: string; started_at: string; ended_at: string | null }> = {}) => ({
    user_id: 'u1', status: 'running', started_at: '2026-11-12T15:58:00Z', ended_at: null, ...over,
  });
  it('the shopper\'s own starting or running session, started in the last 20 minutes', () => {
    expect(liveSessionAllowsTurn(row(), 'u1', now)).toBe(true);
    expect(liveSessionAllowsTurn(row({ status: 'starting' }), 'u1', now)).toBe(true);
  });
  it('not someone else\'s, not ended or failed, not old, not missing', () => {
    expect(liveSessionAllowsTurn(row(), 'u2', now)).toBe(false);
    expect(liveSessionAllowsTurn(row({ status: 'ended' }), 'u1', now)).toBe(false);
    expect(liveSessionAllowsTurn(row({ status: 'failed' }), 'u1', now)).toBe(false);
    expect(liveSessionAllowsTurn(row({ ended_at: '2026-11-12T15:59:00Z' }), 'u1', now)).toBe(false);
    expect(liveSessionAllowsTurn(row({ started_at: '2026-11-12T15:30:00Z' }), 'u1', now)).toBe(false);
    expect(liveSessionAllowsTurn(row({ started_at: 'garbage' }), 'u1', now)).toBe(false);
    expect(liveSessionAllowsTurn(null, 'u1', now)).toBe(false);
  });
});
