import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 🔑 Model comes from env (no hardcoding)
const MODEL = process.env.GROQ_MODEL;

if (!MODEL) {
  throw new Error("❌ GROQ_MODEL is not set in environment variables");
}

export async function generateLLMResponse(prompt) {
  if (!prompt) return "Error: prompt is empty.";

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("❌ Groq API error:", error.response?.data || error.message);
    return "⚠️ Error generating response from Groq.";
  }
}
const models = await groq.models.list();
console.log(models.data.map(m => m.id));
