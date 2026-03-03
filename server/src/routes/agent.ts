import { Router, Request, Response } from "express";
import { chat } from "../services/claude";
import { getMockResponse } from "../services/mockAgent";
import { Message, ProFormaContext } from "../types";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { messages, proFormaContext } = req.body as {
      messages: Message[];
      proFormaContext: ProFormaContext;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const hasApiKey =
      process.env.ANTHROPIC_API_KEY &&
      !process.env.ANTHROPIC_API_KEY.includes("placeholder");

    if (hasApiKey) {
      const response = await chat(messages, proFormaContext);
      res.json(response);
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const mockResponse = getMockResponse(
      lastMessage?.content || "",
      proFormaContext
    );
    res.json(mockResponse);
  } catch (error) {
    console.error("Agent chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
