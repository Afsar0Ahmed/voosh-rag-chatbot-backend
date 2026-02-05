// src/config/qdrantClient.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const QDRANT_URL = process.env.QDRANT_URL || "http://127.0.0.1:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";

const qdrant = axios.create({
  baseURL: QDRANT_URL,
  headers: QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : {},
  timeout: 20000,
});

export default qdrant;
