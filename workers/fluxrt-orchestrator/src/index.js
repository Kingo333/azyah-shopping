// fluxrt-orchestrator: issues Live Cam session tokens and proxies the browser
// WebSocket to the right RunPod Serverless Load Balancing endpoint.
//
// There are no pods to create or destroy: each tier is one RunPod LB endpoint
// that autoscales its own workers. GPU types are set on the endpoint in RunPod.

import { mintSessionToken, timingSafeEqual, TIERS, verifySessionToken } from "./token.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-orchestrator-key",
  "access-control-max-age": "86400",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

function intEnv(env, name, fallback) {
  const n = Number.parseInt(env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function boolEnv(env, name) {
  return String(env[name] ?? "").trim().toLowerCase() === "true";
}

export function config(env) {
  return {
    signingSecret: env.SESSION_SIGNING_SECRET || "", // no fallback to other keys: fail closed
    maxSessionSeconds: intEnv(env, "SESSION_MAX_SECONDS", 300),
    endpoints: {
      standard: env.RUNPOD_LB_ENDPOINT_ID || "",
      premium: env.PREMIUM_RUNPOD_LB_ENDPOINT_ID || "",
    },
    // Connect window: how long the browser may keep retrying the WebSocket
    // while a cold worker boots. Premium cold starts are longer.
    connectTtl: {
      standard: intEnv(env, "SESSION_CONNECT_TTL_STANDARD", 300),
      premium: intEnv(env, "SESSION_CONNECT_TTL_PREMIUM", 360),
    },
    premiumFallbackToStandard: boolEnv(env, "PREMIUM_FALLBACK_TO_STANDARD"),
  };
}

// Which tier actually serves a request. Throws a code string when it can't be served.
export function resolveTier(requested, cfg) {
  if (requested === "standard") {
    if (!cfg.endpoints.standard) throw "missing_runpod_lb_endpoint_id";
    return "standard";
  }
  if (cfg.endpoints.premium) return "premium";
  if (cfg.premiumFallbackToStandard && cfg.endpoints.standard) return "standard";
  throw "premium_not_configured";
}

function getAuthHeader(req) {
  const h = req.headers.get("authorization") || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return (req.headers.get("x-orchestrator-key") || "").trim();
}

async function readJson(req) {
  try {
    return (await req.json()) ?? {};
  } catch {
    return {};
  }
}

function parseTier(value) {
  if (value === undefined || value === null || value === "") return "standard";
  return TIERS.includes(value) ? value : null;
}

async function handleSessionsStart(req, env) {
  const body = await readJson(req);
  const cfg = config(env);
  const requested = parseTier(body.tier);
  if (!requested) return json({ ok: false, error: "invalid_tier" }, 400);
  if (!cfg.signingSecret) return json({ ok: false, error: "missing_session_signing_secret" }, 500);

  let served;
  try {
    served = resolveTier(requested, cfg);
  } catch (code) {
    const status = code === "premium_not_configured" ? 503 : 500;
    return json({ ok: false, error: code, tier_requested: requested }, status);
  }

  const endpointId = cfg.endpoints[served];
  const { token, exp } = await mintSessionToken(cfg.signingSecret, {
    userId: body.user_id,
    garmentId: body.garment_id,
    tier: served,
    maxSessionSeconds: cfg.maxSessionSeconds,
    ttlSeconds: cfg.connectTtl[served],
  });

  return json({
    ok: true,
    ws_url: "wss://" + endpointId + ".api.runpod.ai/ws?token=" + encodeURIComponent(token),
    session_token: token,
    token_exp: exp,
    max_session_seconds: cfg.maxSessionSeconds,
    tier_requested: requested,
    tier_served: served,
    endpoint_id: endpointId,
    pod_id: endpointId,
    gpu_used: true,
    cloud_used: "runpod",
    attempts: 1,
  });
}

async function handleSessionsEnd(req) {
  // Serverless LB: nothing to destroy for either tier; workers scale down on idle.
  // The GPU worker enforces the session cap itself.
  const body = await readJson(req);
  return json({ ok: true, noop: true, tier: parseTier(body.tier) ?? "standard" });
}

async function handleDiag(env) {
  const cfg = config(env);
  const present = (v) => Boolean(v);
  return json({
    ok: true,
    mode: "serverless-load-balancing",
    set: {
      ORCHESTRATOR_API_KEY: present(env.ORCHESTRATOR_API_KEY),
      RUNPOD_API_KEY: present(env.RUNPOD_API_KEY),
      SESSION_SIGNING_SECRET: present(env.SESSION_SIGNING_SECRET),
      RUNPOD_LB_ENDPOINT_ID: present(env.RUNPOD_LB_ENDPOINT_ID),
      PREMIUM_RUNPOD_LB_ENDPOINT_ID: present(env.PREMIUM_RUNPOD_LB_ENDPOINT_ID),
    },
    premium_fallback_to_standard: cfg.premiumFallbackToStandard,
    session_max_seconds: cfg.maxSessionSeconds,
  });
}

async function handleWs(req, env, url) {
  if ((req.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return json({ ok: false, error: "expected_websocket" }, 400);
  }
  const token = url.searchParams.get("token");
  if (!token) return json({ ok: false, error: "missing_token" }, 401);

  const cfg = config(env);
  const claims = await verifySessionToken(cfg.signingSecret, token);
  if (!claims) return json({ ok: false, error: "invalid_or_expired_token" }, 401);

  // The tier inside the signed token decides the upstream endpoint.
  const endpointId = cfg.endpoints[claims.tier];
  if (!endpointId) {
    const code = claims.tier === "premium" ? "premium_not_configured" : "missing_runpod_lb_endpoint_id";
    return json({ ok: false, error: code }, claims.tier === "premium" ? 503 : 500);
  }
  if (!env.RUNPOD_API_KEY) return json({ ok: false, error: "missing_runpod_api_key" }, 500);

  // Cloudflare fetch() uses https:// for WebSocket subrequests; the Upgrade
  // header makes the runtime open a WebSocket upstream.
  const upstreamUrl = new URL(`https://${endpointId}.api.runpod.ai/ws`);
  upstreamUrl.searchParams.set("token", token);
  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${env.RUNPOD_API_KEY}`);
  headers.delete("Host");
  return fetch(new Request(upstreamUrl.toString(), { method: "GET", headers }));
}

async function handleAdminLoad(req, env) {
  const body = await readJson(req);
  const cfg = config(env);
  const tier = parseTier(body.tier);
  if (!tier) return json({ ok: false, error: "invalid_tier" }, 400);
  const endpointId = cfg.endpoints[tier];
  if (!endpointId) return json({ ok: false, error: tier === "premium" ? "premium_not_configured" : "missing_runpod_lb_endpoint_id" }, 500);
  if (!env.RUNPOD_API_KEY) return json({ ok: false, error: "missing_runpod_api_key" }, 500);
  if (!cfg.signingSecret) return json({ ok: false, error: "missing_session_signing_secret" }, 500);

  // GPU workers require a session token on /api/load and /warmup. RunPod's
  // gateway takes the Authorization header, so the token goes in X-Session-Token
  // (and ?token= in case a proxy drops custom headers).
  const { token } = await mintSessionToken(cfg.signingSecret, {
    userId: "admin",
    garmentId: "warmup",
    tier,
    maxSessionSeconds: 60,
    ttlSeconds: 120,
  });
  const base = `https://${endpointId}.api.runpod.ai`;
  const init = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
      "X-Session-Token": token,
      "Content-Type": "application/json",
    },
    body: "{}",
  };
  const q = "?token=" + encodeURIComponent(token);

  let upstream = await fetch(`${base}/api/load${q}`, init);
  if (upstream.status === 404) upstream = await fetch(`${base}/warmup${q}`, init); // older server.py

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json", ...CORS },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/" && req.method === "GET") {
      return new Response("fluxrt-orchestrator (serverless-LB) OK", { status: 200, headers: CORS });
    }

    // Browser WebSockets cannot send Authorization headers, so /ws is checked
    // with the signed session token before the admin key check below.
    if (url.pathname === "/ws" && req.method === "GET") return handleWs(req, env, url);

    const provided = getAuthHeader(req);
    if (!env.ORCHESTRATOR_API_KEY || !provided || !timingSafeEqual(provided, env.ORCHESTRATOR_API_KEY)) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    if (url.pathname === "/diag" && req.method === "GET") return handleDiag(env);
    if (url.pathname === "/sessions/start" && req.method === "POST") return handleSessionsStart(req, env);
    if (url.pathname === "/sessions/end" && req.method === "POST") return handleSessionsEnd(req);
    if (url.pathname === "/admin/load" && req.method === "POST") return handleAdminLoad(req, env);

    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  },
};
