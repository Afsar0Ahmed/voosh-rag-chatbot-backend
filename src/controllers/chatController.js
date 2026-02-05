import { generateResponse, fetchHistory, deleteHistory } from "../services/chatService.js";

export async function postChat(req, res) {
  try {
    const { sessionId, message } = req.body;
    const response = await generateResponse(sessionId, message);
    res.json({ sessionId, answer: response });
  } catch (error) {
    console.error("ChatController error:", error.message);
    res.status(500).json({ error: "Error processing chat." });
  }
}

export async function getHistory(req, res) {
  try {
    const { sessionId } = req.params;
    const history = await fetchHistory(sessionId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Error fetching history." });
  }
}

export async function clearHistory(req, res) {
  try {
    const { sessionId } = req.params;
    await deleteHistory(sessionId);
    res.json({ message: "History cleared." });
  } catch (error) {
    res.status(500).json({ error: "Error clearing history." });
  }
}
