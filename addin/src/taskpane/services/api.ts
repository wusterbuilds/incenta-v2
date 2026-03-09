import { ChatMessage, ProFormaContext, AuditResult, TranslationResult } from "../types";

const BASE_URL = "https://localhost:4000";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function sendChat(
  messages: ChatMessage[],
  proFormaContext?: ProFormaContext
): Promise<ChatMessage> {
  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await request<{ role: string; content: string; data?: unknown }>(
    "/agent/chat",
    { messages: apiMessages, proFormaContext }
  );

  return {
    id: generateId(),
    role: "assistant",
    type: "text",
    content: response.content,
    data: response.data as ChatMessage["data"],
    timestamp: Date.now(),
  };
}

export async function runAudit(
  proFormaContext: ProFormaContext
): Promise<AuditResult> {
  return request<AuditResult>("/agent/audit", { proFormaContext });
}

export async function translateProForma(file: File): Promise<TranslationResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/agent/translate`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
