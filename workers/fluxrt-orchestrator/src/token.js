// Session token shared with the GPU workers (fluxrt-serverless, joyai-serverless).
//
// token   = payload + "." + hex(HMAC-SHA256(SESSION_SIGNING_SECRET, payload))
// payload = userId.garmentId.tier.maxSessionSeconds.expEpochSeconds   (v2, minted here)
//         | userId.garmentId.expEpochSeconds                          (legacy, still verified)
//
// exp stays the LAST segment so older GPU servers that read the last segment
// as the expiry keep working. exp is the connect deadline; maxSessionSeconds
// caps streaming time once the model is ready (enforced by the GPU worker).

export const TIERS = ["standard", "premium"];

const enc = new TextEncoder();

export async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Dots separate payload fields, so ids must not contain them.
export function safeSegment(value, fallback) {
  const s = String(value ?? "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  return s || fallback;
}

export async function mintSessionToken(secret, { userId, garmentId, tier, maxSessionSeconds, ttlSeconds, now }) {
  if (!secret) throw new Error("missing_session_signing_secret");
  if (!TIERS.includes(tier)) throw new Error("invalid_tier");
  const nowS = Math.floor((now ?? Date.now()) / 1000);
  const exp = nowS + ttlSeconds;
  const payload = [
    safeSegment(userId, "anon"),
    safeSegment(garmentId, "none"),
    tier,
    String(maxSessionSeconds),
    String(exp),
  ].join(".");
  return { token: payload + "." + (await hmacHex(secret, payload)), exp };
}

// Returns { tier, exp, maxSessionSeconds, legacy } or null. Fails closed on an empty secret.
export async function verifySessionToken(secret, token, now) {
  if (!secret || typeof token !== "string" || !token.includes(".")) return null;
  const lastDot = token.lastIndexOf(".");
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1).toLowerCase();
  if (!timingSafeEqual(await hmacHex(secret, payload), sig)) return null;

  const parts = payload.split(".");
  const isEpoch = (s) => /^\d{9,}$/.test(s);
  let tier, maxSessionSeconds, expStr, legacy;

  if (parts.length === 5) {
    [, , tier, maxSessionSeconds, expStr] = parts;
    if (!TIERS.includes(tier) || !/^\d+$/.test(maxSessionSeconds) || Number(maxSessionSeconds) <= 0) return null;
    maxSessionSeconds = Number(maxSessionSeconds);
    legacy = false;
  } else if (parts.length === 3) {
    expStr = parts[2];
    tier = "standard";
    maxSessionSeconds = null;
    legacy = true;
  } else {
    return null;
  }

  if (!isEpoch(expStr)) return null;
  const exp = Number(expStr);
  if (exp < Math.floor((now ?? Date.now()) / 1000)) return null;
  return { tier, exp, maxSessionSeconds, legacy };
}
