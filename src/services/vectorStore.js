import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL || "http://127.0.0.1:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "news_articles";
const VECTOR_DIM = parseInt(process.env.VECTOR_DIM || "1536");

const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

/**
 * Ensure the collection exists, create if not.
 */
export async function ensureCollection() {
  try {
    const collections = await client.getCollections();
    const exists = collections?.collections?.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      await client.recreateCollection(COLLECTION_NAME, {
        vectors: { size: VECTOR_DIM, distance: "Cosine" },
      });
      console.log("✅ Created Qdrant collection:", COLLECTION_NAME);
    } else {
      console.log("ℹ️ Collection already exists:", COLLECTION_NAME);
    }
  } catch (err) {
    console.error("❌ Error ensuring collection:", err);
  }
}

/**
 * Upsert vectors safely.
 * Each item must have: { id, vector: number[], payload }
 */
export async function upsertVectors(items) {
  if (!items || !items.length) {
    console.warn("⚠️ No vectors to upsert.");
    return;
  }

  try {
    // Validate vector length
    const invalid = items.find(it => !Array.isArray(it.vector) || it.vector.length !== VECTOR_DIM);
    if (invalid) {
      console.error("❌ Invalid vector format or dimension:", invalid);
      return;
    }

    const points = items.map(it => ({
      id: it.id,
      vector: it.vector,
      payload: it.payload,
    }));

    await client.upsert({
      collection_name: COLLECTION_NAME,
      points,
    });

    console.log(`✅ Upserted ${items.length} vectors`);
  } catch (err) {
    console.error("❌ Error upserting vectors:", err);
  }
}

/**
 * Search vectors safely.
 * Returns an empty array if no results.
 */
export async function searchVectors(vector, topK = 5) {
  if (!Array.isArray(vector) || vector.length !== VECTOR_DIM) {
    console.error(`❌ Vector must be an array of length ${VECTOR_DIM}`);
    return [];
  }

  try {
    // Ensure collection exists before searching
    await ensureCollection();

    const result = await client.search({
      collection_name: COLLECTION_NAME,
      vector,
      limit: topK,
      with_payload: true,
    });

    // Safely handle empty results
    if (!result || !Array.isArray(result)) {
      console.warn("⚠️ Qdrant search returned no results");
      return [];
    }

    // Optional: map to include shard_key safely if exists
    return result.map(item => ({
      id: item?.id,
      score: item?.score,
      payload: item?.payload || {},
      shard_key: item?.shard_key || null, // avoid undefined destructure
    }));
  } catch (err) {
    console.error("❌ Qdrant search error:", err);
    return [];
  }
}
