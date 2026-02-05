// scripts/fetchAndUpsertNews.js
import Parser from "rss-parser";
import fs from "fs";
import path from "path";
import { embedTexts } from "../services/embeddings.js";
import { upsertVectors, ensureCollection } from "../services/vectorStore.js";

const parser = new Parser();
const articlesDir = path.resolve("data/articles");

// List of RSS feeds to fetch
const feeds = [
  "http://feeds.bbci.co.uk/news/world/rss.xml",
  "http://feeds.bbci.co.uk/news/technology/rss.xml",
  "http://feeds.bbci.co.uk/news/business/rss.xml",
  "http://feeds.bbci.co.uk/news/health/rss.xml",
  "http://feeds.bbci.co.uk/sport/rss.xml"
];

/**
 * Fetch RSS articles and save locally
 */
async function fetchArticles() {
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

  let articles = [];

  for (const url of feeds) {
    console.log(`📡 Fetching feed: ${url}`);
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items.slice(0, 10)) { // first 10 items per feed
        const titleSafe = item.title.replace(/[^a-z0-9]/gi, "_").slice(0, 30);
        const fileName = `${Date.now()}_${titleSafe}.txt`;
        const filePath = path.join(articlesDir, fileName);

        const content = `
Title: ${item.title}
Link: ${item.link}
Published: ${item.pubDate}

${item.contentSnippet || item.content || ""}
        `.trim();

        fs.writeFileSync(filePath, content);
        articles.push({ id: fileName, text: content });
        console.log(`✅ Saved: ${fileName}`);
      }
    } catch (err) {
      console.error(`❌ Error fetching ${url}:`, err.message);
    }
  }

  console.log(`🎉 Fetched and saved ${articles.length} articles`);
  return articles;
}

/**
 * Main function
 */
async function run() {
  try {
    // 1. Fetch articles
    const articles = await fetchArticles();
    if (!articles.length) {
      console.warn("⚠️ No articles to process.");
      return;
    }

    // 2. Ensure Qdrant collection exists
    await ensureCollection();

    // 3. Embed articles
    console.log("📚 Generating embeddings...");
    const vectors = await embedTexts(articles.map(a => a.text));

    // 4. Prepare items for upsert
    const items = articles.map((a, idx) => ({
      id: a.id,
      vector: vectors[idx],
      payload: { text: a.text }
    }));

    // 5. Upsert vectors into Qdrant
    await upsertVectors(items);

    console.log(`✅ Successfully upserted ${items.length} articles into Qdrant`);
  } catch (err) {
    console.error("❌ Error in fetchAndUpsertNews:", err);
  }
}

// Run the script
run();
