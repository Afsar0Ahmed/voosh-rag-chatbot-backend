// backend/services/embeddings.js

/**
 * Uses Jina AI Embeddings instead of OpenAI
 */
export async function embedTexts(texts) {
  if (!texts || !texts.length) return [];

  try {
    const response = await fetch(process.env.JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v2",  // adjust based on your Jina model
        input: texts,
      }),
    });

    const data = await response.json();

    if (!data || !data.data) {
      console.error("❌ Invalid Jina response:", data);
      return texts.map(() => []);
    }

    // Each item in data.data has an ".embedding" property
    return data.data.map(d => d.embedding);
  } catch (err) {
    console.error("❌ Error creating embeddings with Jina:", err);
    return texts.map(() => []);
  }
}

export async function embedText(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}
