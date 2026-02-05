import { createClient } from "redis";
import crypto from "crypto";

const redisUrl = process.env.REDIS_URL;
const SESSION_TTL = Number(process.env.SESSION_TTL_SECONDS || 86400);
const LLM_CACHE_TTL = Number(process.env.LLM_CACHE_TTL_SECONDS || 3600); // 1 hour

let client = null;

if (redisUrl) {
  client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on("connect", () => console.log("🔗 Redis connecting..."));
  client.on("ready", () => console.log("✅ Redis is ready!"));
  client.on("end", () => console.log("⚠️ Redis connection closed"));
  client.on("error", (err) =>
    console.error("❌ Redis Client Error:", err.message)
  );

  try {
    await client.connect();
    console.log("✅ Connected to Redis");

    // 🔍 Sanity test
    await client.set("ping", "pong");
    console.log("Redis test:", await client.get("ping"));
  } catch (err) {
    console.error("⚠️ Redis unavailable, continuing without cache");
    client = null;
  }
} else {
  console.warn("⚠️ REDIS_URL not set. Redis disabled.");
}

/* ------------------------
   Session History Helpers
------------------------- */

export async function storeHistory(sessionId, message) {
  if (!client) return;

  const key = `chat:${sessionId}`;
  await client.rPush(key, JSON.stringify(message));
  await client.expire(key, SESSION_TTL);
}

export async function getHistory(sessionId) {
  if (!client) return [];

  const key = `chat:${sessionId}`;
  const messages = await client.lRange(key, 0, -1);
  return messages.map((msg) => JSON.parse(msg));
}

export async function removeHistory(sessionId) {
  if (!client) return;

  const key = `chat:${sessionId}`;
  await client.del(key);
}

/* ------------------------
   🔥 LLM RESPONSE CACHE
------------------------- */

function hashPrompt(prompt) {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

export async function getCachedLLMResponse(prompt) {
  if (!client) return null;

  const key = `llm:cache:${hashPrompt(prompt)}`;
  const cached = await client.get(key);

  return cached ? JSON.parse(cached) : null;
}

export async function setCachedLLMResponse(prompt, response) {
  if (!client) return;

  const key = `llm:cache:${hashPrompt(prompt)}`;
  await client.set(key, JSON.stringify(response), {
    EX: LLM_CACHE_TTL,
  });
}
const SUMMARY_TTL = Number(process.env.SESSION_TTL_SECONDS || 86400);

export async function getSummary(sessionId) {
  if (!client) return null;

  const key = `chat:summary:${sessionId}`;
  return await client.get(key);
}

export async function setSummary(sessionId, summary) {
  if (!client) return;

  const key = `chat:summary:${sessionId}`;
  await client.set(key, summary, { EX: SUMMARY_TTL });
}

export default client;
