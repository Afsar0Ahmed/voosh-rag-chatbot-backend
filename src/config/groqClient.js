import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

let cachedModel = null;

/**
 * Automatically pick the best available chat model
 */
async function getAvailableModel() {
  if (cachedModel) return cachedModel;

  const models = await groq.models.list();

  // Prefer fast + instruction/chat models
  const preferredOrder = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ];

  for (const preferred of preferredOrder) {
    const found = models.data.find((m) => m.id === preferred);
    if (found) {
      cachedModel = found.id;
      console.log("✅ Using Groq model:", cachedModel);
      return cachedModel;
    }
  }

  // Fallback: any model that looks chat/instruct capable
  const fallback = models.data.find(
    (m) =>
      m.id.includes("llama") &&
      (m.id.includes("instruct") ||
        m.id.includes("instant") ||
        m.id.includes("versatile"))
  );

  if (!fallback) {
    throw new Error("❌ No usable Groq chat model found");
  }

  cachedModel = fallback.id;
  console.log("⚠️ Using fallback Groq model:", cachedModel);
  return cachedModel;
}

export async function generateLLMResponse(prompt) {
  if (!prompt) return "Error: prompt is empty.";

  try {
    const model = await getAvailableModel();

    const completion = await groq.chat.completions.create({
      model,

      
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("❌ Groq API error:", error.response?.data || error.message);
    return "⚠️ Error generating response from Groq.";
  }
}
