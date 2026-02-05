import { generateLLMResponse } from "../config/groqClient.js";
import {
  storeHistory,
  getHistory,
  removeHistory,
  getCachedLLMResponse,
  setCachedLLMResponse,
  getSummary,
  setSummary,
} from "../config/redisClient.js";

const MAX_MESSAGES_BEFORE_SUMMARY = 6;
const RECENT_MESSAGES_TO_KEEP = 2;

export async function generateResponse(sessionId, message) {
  // 1️⃣ Store user message
  await storeHistory(sessionId, { role: "user", text: message });

  // 2️⃣ Get full history
  const history = await getHistory(sessionId);

  // 3️⃣ Summarize only if needed
  if (history.length > MAX_MESSAGES_BEFORE_SUMMARY) {
    console.log("🧠 Summarizing conversation...");

    const messagesToSummarize = history.slice(
      0,
      history.length - RECENT_MESSAGES_TO_KEEP
    );

    const recentMessages = history.slice(
      history.length - RECENT_MESSAGES_TO_KEEP
    );

    const summaryPrompt = `
Summarize the following conversation briefly so it can be used as context later:

${messagesToSummarize.map(m => `${m.role}: ${m.text}`).join("\n")}
`;

    const summary = await generateLLMResponse(summaryPrompt);

    await setSummary(sessionId, summary);

    // 🧹 Clear history and keep only recent messages
    await removeHistory(sessionId);
    for (const msg of recentMessages) {
      await storeHistory(sessionId, msg);
    }

    console.log("✅ Summary stored and recent messages preserved");
  }

  // 4️⃣ Get summary (if exists)
  const summary = await getSummary(sessionId);

  // 5️⃣ Build final prompt
  const finalPrompt = summary
    ? `Conversation summary:\n${summary}\n\nUser: ${message}`
    : message;

  // 6️⃣ Cache lookup (simple version)
  const cachedReply = await getCachedLLMResponse(finalPrompt);
  if (cachedReply) {
    console.log("⚡ LLM cache HIT");
    await storeHistory(sessionId, { role: "bot", text: cachedReply });
    return cachedReply;
  }

  console.log("🤖 LLM cache MISS");

  // 7️⃣ Call LLM
  const reply = await generateLLMResponse(finalPrompt);

  // 8️⃣ Cache + store
  await setCachedLLMResponse(finalPrompt, reply);
  await storeHistory(sessionId, { role: "bot", text: reply });

  return reply;
}
export async function fetchHistory(sessionId) {
  return await getHistory(sessionId);
}

export async function deleteHistory(sessionId) {
  await removeHistory(sessionId);
}
