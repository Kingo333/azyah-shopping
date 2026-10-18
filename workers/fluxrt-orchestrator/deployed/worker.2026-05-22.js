const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-orchestrator-key",
  "access-control-max-age": "86400",
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS, ...extraHeaders },
  });
}

async function sha256Prefix(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s || ""));
  const arr = Array.from(new Uint8Array(buf)).slice(0, 4);
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function getAuthHeader(req) {
  const h = req.headers.get("authorization") || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return (req.headers.get("x-orchestrator-key") || "").trim();
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret || ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Short-lived signed token for clients to authenticate to the FluxRT WS server.
// HMAC-SHA256 over "userId.garmentId.expEpochSeconds" using SESSION_SIGNING_SECRET.
async function mintSessionToken(env, userId, garmentId, ttlSeconds = 300) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = userId + "." + garmentId + "." + exp;
  const secret = env.SESSION_SIGNING_SECRET || env.ORCHESTRATOR_API_KEY || "";
  const sigHex = await hmacHex(secret, payload);
  return { token: payload + "." + sigHex, exp };
}

async function verifySessionToken(env, token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;

  const secret = env.SESSION_SIGNING_SECRET || env.ORCHESTRATOR_API_KEY || "";
  if (!secret) return false;

  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;

  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  const expected = await hmacHex(secret, payload);
  if (!timingSafeEqual(expected, sig)) return false;

  const parts = payload.split(".");
  const maybeExp = parts[parts.length - 1];

  if (!/^\d{9,}$/.test(maybeExp)) return false;
  if (Number(maybeExp) < Math.floor(Date.now() / 1000)) return false;

  return true;
}

async function handleSessionsStart(req, env) {
  let payload = {};
  try {
    payload = await req.json();
  } catch {}

  const userId = String(payload.user_id || "anon");
  const garmentId = String(payload.garment_id || "none");
  const endpointId = env.RUNPOD_LB_ENDPOINT_ID;

  if (!endpointId) return json({ ok: false, error: "missing_runpod_lb_endpoint_id" }, 500);

  const { token, exp } = await mintSessionToken(env, userId, garmentId, 300);
  const wsUrl = "wss://" + endpointId + ".api.runpod.ai/ws?token=" + encodeURIComponent(token);

  return json({
    ok: true,
    ws_url: wsUrl,
    session_token: token,
    token_exp: exp,
    endpoint_id: endpointId,
    pod_id: endpointId,
    gpu_used: true,
    cloud_used: "runpod",
    attempts: 1,
    payload_echo: { user_id: userId, garment_id: garmentId },
  });
}

async function handleSessionsEnd(req, env) {
  // No pod to destroy on Serverless Load Balancing; workers auto-scale.
  let payload = {};
  try {
    payload = await req.json();
  } catch {}
  return json({ ok: true, noop: true, echo: payload });
}

async function handleDiag(env) {
  return json({
    ok: true,
    mode: "serverless-load-balancing",
    secrets: {
      ORCHESTRATOR_API_KEY: {
        present: !!env.ORCHESTRATOR_API_KEY,
        len: (env.ORCHESTRATOR_API_KEY || "").length,
        sha256_prefix: await sha256Prefix(env.ORCHESTRATOR_API_KEY || ""),
      },
      RUNPOD_API_KEY: {
        present: !!env.RUNPOD_API_KEY,
        len: (env.RUNPOD_API_KEY || "").length,
        sha256_prefix: await sha256Prefix(env.RUNPOD_API_KEY || ""),
      },
      RUNPOD_LB_ENDPOINT_ID: {
        present: !!env.RUNPOD_LB_ENDPOINT_ID,
        len: (env.RUNPOD_LB_ENDPOINT_ID || "").length,
        sha256_prefix: await sha256Prefix(env.RUNPOD_LB_ENDPOINT_ID || ""),
      },
      SESSION_SIGNING_SECRET: {
        present: !!env.SESSION_SIGNING_SECRET,
        len: (env.SESSION_SIGNING_SECRET || "").length,
        sha256_prefix: await sha256Prefix(env.SESSION_SIGNING_SECRET || ""),
      },
    },
  });
}

async function handleWs(req, env, url) {
  const upgrade = req.headers.get("Upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return json({ ok: false, error: "expected_websocket" }, 400);
  }

  const token = url.searchParams.get("token");
  if (!token) {
    return json({ ok: false, error: "missing_token" }, 401);
  }

  const valid = await verifySessionToken(env, token);
  if (!valid) {
    return json({ ok: false, error: "invalid_or_expired_token" }, 401);
  }

  const endpointId = env.RUNPOD_LB_ENDPOINT_ID;
  if (!endpointId) {
    return json({ ok: false, error: "missing_runpod_lb_endpoint_id" }, 500);
  }

  if (!env.RUNPOD_API_KEY) {
    return json({ ok: false, error: "missing_runpod_api_key" }, 500);
  }

  // Important: Cloudflare fetch() uses https:// for WebSocket subrequests.
  // The Upgrade header tells the runtime to establish a WebSocket upstream.
  const upstreamUrl = new URL(`https://${endpointId}.api.runpod.ai/ws`);
  upstreamUrl.searchParams.set("token", token);

  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${env.RUNPOD_API_KEY}`);
  headers.delete("Host");

  return fetch(
    new Request(upstreamUrl.toString(), {
      method: "GET",
      headers,
    }),
  );
}

async function handleAdminLoad(env) {
  const endpointId = env.RUNPOD_LB_ENDPOINT_ID;

  if (!endpointId) {
    return json({ ok: false, error: "missing_runpod_lb_endpoint_id" }, 500);
  }

  if (!env.RUNPOD_API_KEY) {
    return json({ ok: false, error: "missing_runpod_api_key" }, 500);
  }

  const base = `https://${endpointId}.api.runpod.ai`;

  let upstream = await fetch(`${base}/api/load`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  // Fallback for older server.py versions.
  if (upstream.status === 404) {
    upstream = await fetch(`${base}/warmup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
  }

  const text = await upstream.text();

  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      ...CORS,
    },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/" && req.method === "GET") {
      return new Response("fluxrt-orchestrator (serverless-LB) OK", {
        status: 200,
        headers: CORS,
      });
    }

    if (url.pathname === "/diag" && req.method === "GET") {
      return handleDiag(env);
    }

    // IMPORTANT:
    // Browser WebSockets cannot send Authorization headers.
    // Handle /ws before the global ORCHESTRATOR_API_KEY admin auth check.
    if (url.pathname === "/ws" && req.method === "GET") {
      return handleWs(req, env, url);
    }

    const provided = getAuthHeader(req);
    if (!provided || !timingSafeEqual(provided, env.ORCHESTRATOR_API_KEY || "")) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    if (url.pathname === "/sessions/start" && req.method === "POST") {
      return handleSessionsStart(req, env);
    }

    if (url.pathname === "/sessions/end" && req.method === "POST") {
      return handleSessionsEnd(req, env);
    }

    if (url.pathname === "/admin/load" && req.method === "POST") {
      return handleAdminLoad(env);
    }

    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  },
};
