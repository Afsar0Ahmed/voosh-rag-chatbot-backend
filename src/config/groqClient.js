import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

let cachedModel = null;

async function getAvailableModel() {
  if (cachedModel) return cachedModel;

  const models = await groq.models.list();

  // pick the first chat-capable model
  const chatModel = models.data.find(
    (m) => m.id.includes("chat") || m.id.includes("instruct")
  );

  if (!chatModel) {
    throw new Error("No usable Groq chat model available for this account");
  }

  cachedModel = chatModel.id;
  console.log("✅ Using Groq model:", cachedModel);

  return cachedModel;
}

export async function generateLLMResponse(prompt) {
  if (!prompt) return "Error: prompt is empty.";

  try {
    const model = await getAvailableModel();

    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("❌ Groq FINAL error:", error.message);
    return "⚠️ No available Groq model. Check Groq console.";
  }
}
