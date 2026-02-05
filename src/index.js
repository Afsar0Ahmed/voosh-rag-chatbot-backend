import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", chatRoutes); // → POST /api/chat

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 RAG backend listening on port ${PORT}`);
});
