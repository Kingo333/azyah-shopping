import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { testUsers } from "../test-worker/worker.js";
import { hmacHex } from "../src/token.js";

const SECRET = "test-secret";
const ENV = { SESSION_SIGNING_SECRET: SECRET, RUNPOD_API_KEY: "rp", RUNPOD_LB_ENDPOINT_ID: "test789", LIVECAM_TEST_USER_IDS: "owner-1, kiosk-2" };

// The live Worker's token: userId.garmentId.exp + "." + HMAC.
async function liveToken(userId, expOffset = 60) {
  const payload = `${userId}.g1.${Math.floor(Date.now() / 1000) + expOffset}`;
  return `${payload}.${await hmacHex(SECRET, payload)}`;
}

const ws = (token, env = ENV) => worker.fetch(new Request(`https://t.example/ws?token=${encodeURIComponent(token)}`, { headers: { Upgrade: "websocket" } }), env);

test("listed accounts reach the TEST endpoint with the live Worker's token", async () => {
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (req) => { seen.push([new URL(req.url).host, req.headers.get("authorization")]); return new Response("ok"); };
  try {
    const r = await ws(await liveToken("kiosk-2"));
    assert.equal(r.status, 200);
    assert.deepEqual(seen, [["test789.api.runpod.ai", "Bearer rp"]]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("with a list, only listed accounts; without one, any valid live session (sale-code guests too); bad or expired tokens never", async () => {
  assert.equal((await ws(await liveToken("shopper-9"))).status, 403);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("ok");
  try {
    const open = { ...ENV, LIVECAM_TEST_USER_IDS: "" };
    assert.equal((await ws(await liveToken("sales-demo-account"), open)).status, 200);
    assert.equal((await ws("u.g.123.bad", open)).status, 401);
    assert.equal((await ws(await liveToken("sales-demo-account", -10), open)).status, 401);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal((await ws("u.g.123.bad")).status, 401);
  assert.equal((await ws(await liveToken("owner-1", -10))).status, 401);
  const noUpgrade = await worker.fetch(new Request("https://t.example/ws?token=x"), ENV);
  assert.equal(noUpgrade.status, 400);
  assert.equal((await worker.fetch(new Request("https://t.example/sessions/start", { method: "POST" }), ENV)).status, 404);
  assert.deepEqual(testUsers({ LIVECAM_TEST_USER_IDS: " a ,b\nc " }), ["a", "b", "c"]);
});
