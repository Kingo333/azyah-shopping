// fluxrt-orchestrator-test: a separate Cloudflare Worker for trying a TEST GPU endpoint (WebRTC trials,
// 12 Nov 2026) without touching the live Worker or the live RunPod endpoint.
//
// It is the live fluxrt-orchestrator's /ws proxy (code as deployed on 22 May 2026), with RUNPOD_LB_ENDPOINT_ID
// pointing at the TEST endpoint. Like the live Worker it only serves a valid live session: the signed session
// token the live Worker mints when a session starts (signed-in shoppers and sale-code guests alike), checked
// for signature and expiry. No token, no relay.
// Optional LIVECAM_TEST_USER_IDS (comma-separated Supabase user ids) narrows it to those accounts;
// empty = any valid live session.
// Session tokens are minted by the live Worker, so both Workers need the same SESSION_SIGNING_SECRET.
// The app reaches this Worker with ?livecam_endpoint=test, which swaps the socket host
// fluxrt-orchestrator.ACCOUNT.workers.dev for fluxrt-orchestrator-test.ACCOUNT.workers.dev.
//
// Settings (Workers > fluxrt-orchestrator-test > Settings > Variables and Secrets):
//   RUNPOD_API_KEY          secret   same as the live Worker
//   SESSION_SIGNING_SECRET  secret   same as the live Worker
//   RUNPOD_LB_ENDPOINT_ID   text     the TEST endpoint id
//   LIVECAM_TEST_USER_IDS   text     optional: only these user ids, e.g. "uuid-1,uuid-2" (empty = any valid session)

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-max-age": "86400",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The live Worker's check: HMAC-SHA256 over the payload, expiry in the last segment. Returns the user id.
export async function verifySessionToken(env, token, nowMs = Date.now()) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const secret = env.SESSION_SIGNING_SECRET || "";
  if (!secret) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!timingSafeEqual(await hmacHex(secret, payload), sig)) return null;
  const parts = payload.split(".");
  const maybeExp = parts[parts.length - 1];
  if (!/^\d{9,}$/.test(maybeExp)) return null;
  if (Number(maybeExp) < Math.floor(nowMs / 1000)) return null;
  return { userId: parts[0] };
}

export function testUsers(env) {
  return String(env.LIVECAM_TEST_USER_IDS || "").split(/[\s,]+/).filter(Boolean);
}

async function handleWs(req, env, url) {
  if ((req.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return json({ ok: false, error: "expected_websocket" }, 400);
  const token = url.searchParams.get("token");
  if (!token) return json({ ok: false, error: "missing_token" }, 401);
  const claims = await verifySessionToken(env, token);
  if (!claims) return json({ ok: false, error: "invalid_or_expired_token" }, 401);
  const only = testUsers(env);
  if (only.length && !only.includes(claims.userId)) return json({ ok: false, error: "test_not_allowed" }, 403);
  const endpointId = env.RUNPOD_LB_ENDPOINT_ID;
  if (!endpointId) return json({ ok: false, error: "missing_runpod_lb_endpoint_id" }, 500);
  if (!env.RUNPOD_API_KEY) return json({ ok: false, error: "missing_runpod_api_key" }, 500);
  // Cloudflare fetch() uses https:// for WebSocket subrequests; the Upgrade header opens a WebSocket upstream.
  const upstreamUrl = new URL("https://" + endpointId + ".api.runpod.ai/ws");
  upstreamUrl.searchParams.set("token", token);
  const headers = new Headers(req.headers);
  headers.set("Authorization", "Bearer " + env.RUNPOD_API_KEY);
  headers.delete("Host");
  return fetch(new Request(upstreamUrl.toString(), { method: "GET", headers }));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/" && req.method === "GET") return new Response("fluxrt-orchestrator-test OK", { status: 200, headers: CORS });
    if (url.pathname === "/ws" && req.method === "GET") return handleWs(req, env, url);
    return json({ ok: false, error: "not_found" }, 404);
  },
};
