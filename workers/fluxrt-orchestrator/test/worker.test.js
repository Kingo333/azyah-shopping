import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { config, resolveTier } from "../src/index.js";
import { hmacHex, mintSessionToken, verifySessionToken } from "../src/token.js";

const SECRET = "test-secret";
const BASE_ENV = {
  ORCHESTRATOR_API_KEY: "orch-key",
  RUNPOD_API_KEY: "rp-key",
  SESSION_SIGNING_SECRET: SECRET,
  RUNPOD_LB_ENDPOINT_ID: "std123",
  SESSION_MAX_SECONDS: "300",
};

function start(env, body) {
  return worker.fetch(
    new Request("https://w.example/sessions/start", {
      method: "POST",
      headers: { authorization: "Bearer orch-key", "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

test("standard start is unchanged in shape and uses the standard endpoint", async () => {
  const r = await start(BASE_ENV, { user_id: "u1", garment_id: "g1" });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.tier_served, "standard");
  assert.match(j.ws_url, /^wss:\/\/std123\.api\.runpod\.ai\/ws\?token=/);
  const claims = await verifySessionToken(SECRET, j.session_token);
  assert.equal(claims.tier, "standard");
  assert.equal(claims.maxSessionSeconds, 300);
});

test("premium falls back to standard when enabled and premium is not configured", async () => {
  const env = { ...BASE_ENV, PREMIUM_FALLBACK_TO_STANDARD: "true" };
  const j = await (await start(env, { user_id: "u1", garment_id: "g1", tier: "premium" })).json();
  assert.equal(j.tier_requested, "premium");
  assert.equal(j.tier_served, "standard");
  assert.equal((await verifySessionToken(SECRET, j.session_token)).tier, "standard");
});

test("premium without fallback or config returns premium_not_configured", async () => {
  const r = await start(BASE_ENV, { tier: "premium" });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, "premium_not_configured");
});

test("premium uses the premium endpoint when configured", async () => {
  const env = { ...BASE_ENV, PREMIUM_RUNPOD_LB_ENDPOINT_ID: "prem456", PREMIUM_FALLBACK_TO_STANDARD: "true" };
  const j = await (await start(env, { tier: "premium" })).json();
  assert.equal(j.tier_served, "premium");
  assert.match(j.ws_url, /^wss:\/\/prem456\./);
});

test("unknown tier is rejected", async () => {
  assert.equal((await start(BASE_ENV, { tier: "gold" })).status, 400);
});

test("no signing secret fails closed (no fallback to ORCHESTRATOR_API_KEY)", async () => {
  const env = { ...BASE_ENV, SESSION_SIGNING_SECRET: "" };
  assert.equal((await start(env, {})).status, 500);
});

test("diag needs the admin key and reports presence only", async () => {
  const anon = await worker.fetch(new Request("https://w.example/diag"), BASE_ENV);
  assert.equal(anon.status, 401);
  const r = await worker.fetch(new Request("https://w.example/diag", { headers: { authorization: "Bearer orch-key" } }), BASE_ENV);
  const text = await r.text();
  assert.ok(!text.includes("sha256") && !text.includes("len"));
});

test("ws rejects forged, expired and premium-without-endpoint tokens before proxying", async () => {
  const ws = (t) => worker.fetch(new Request(`https://w.example/ws?token=${encodeURIComponent(t)}`, { headers: { Upgrade: "websocket" } }), BASE_ENV);
  const forged = "u1.g1.standard.300.9999999999." + "0".repeat(64);
  assert.equal((await ws(forged)).status, 401);
  const expired = await mintSessionToken(SECRET, { userId: "u", garmentId: "g", tier: "standard", maxSessionSeconds: 300, ttlSeconds: 10, now: Date.now() - 60_000 });
  assert.equal((await ws(expired.token)).status, 401);
  const prem = await mintSessionToken(SECRET, { userId: "u", garmentId: "g", tier: "premium", maxSessionSeconds: 300, ttlSeconds: 60 });
  const r = await ws(prem.token);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, "premium_not_configured");
});

test("ws routes each tier to its own endpoint", async () => {
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (req) => { seen.push(new URL(req.url).host); return new Response("ok"); };
  try {
    const env = { ...BASE_ENV, PREMIUM_RUNPOD_LB_ENDPOINT_ID: "prem456" };
    for (const tier of ["standard", "premium"]) {
      const { token } = await mintSessionToken(SECRET, { userId: "u", garmentId: "g", tier, maxSessionSeconds: 300, ttlSeconds: 60 });
      await worker.fetch(new Request(`https://w.example/ws?token=${encodeURIComponent(token)}`, { headers: { Upgrade: "websocket" } }), env);
    }
    // Legacy 3-part tokens still route to Standard.
    const exp = Math.floor(Date.now() / 1000) + 60;
    const legacy = `u.g.${exp}.` + (await hmacHex(SECRET, `u.g.${exp}`));
    await worker.fetch(new Request(`https://w.example/ws?token=${legacy}`, { headers: { Upgrade: "websocket" } }), env);
    assert.deepEqual(seen, ["std123.api.runpod.ai", "prem456.api.runpod.ai", "std123.api.runpod.ai"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("admin load sends a session token to the GPU worker", async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); };
  try {
    const r = await worker.fetch(new Request("https://w.example/admin/load", { method: "POST", headers: { authorization: "Bearer orch-key" }, body: "{}" }), BASE_ENV);
    assert.equal(r.status, 200);
    const tok = calls[0].init.headers["X-Session-Token"];
    assert.equal((await verifySessionToken(SECRET, tok)).tier, "standard");
    assert.match(calls[0].url, /\/api\/load\?token=/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("dots in ids cannot change the token shape", async () => {
  const { token } = await mintSessionToken(SECRET, { userId: "a.b", garmentId: "c.d.e", tier: "standard", maxSessionSeconds: 300, ttlSeconds: 60 });
  assert.equal(token.split(".").length, 6);
});

test("resolveTier matrix", () => {
  const cfg = (o) => ({ ...config(BASE_ENV), ...o });
  assert.equal(resolveTier("standard", cfg({})), "standard");
  assert.throws(() => resolveTier("premium", cfg({})), /premium_not_configured/);
  assert.equal(resolveTier("premium", cfg({ premiumFallbackToStandard: true })), "standard");
});
