import { connection } from "next/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

type AskAiRequest = {
  question: string;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  workspaceTitle: string;
  viewLabel: string;
  files: Array<{
    name: string;
    type: string;
    url?: string | null;
    size?: number;
    isFavorite?: boolean;
    folderId?: string;
  }>;
  folders: Array<{
    name: string;
    isFavorite?: boolean;
  }>;
  activeShares: number;
  storageTotal: number;
  storageLimit: number;
};

function extractGeminiText(payload: unknown) {
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates;

  if (!Array.isArray(candidates)) return "";

  return candidates
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

async function resolveGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim();
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const contents = await readFile(envPath, "utf8");
    const match = contents.match(/^GEMINI_API_KEY=(.+)$/m) ?? contents.match(/^NEXT_PUBLIC_GEMINI_API_KEY=(.+)$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

function inferMimeType(file: AskAiRequest["files"][number]) {
  const lower = file.name.toLowerCase();

  if (file.type === "pdf" || lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (file.type === "image" || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";

  return null;
}

function pickRelevantFiles(question: string, files: AskAiRequest["files"]) {
  const normalizedQuestion = question.toLowerCase();
  const keywords = normalizedQuestion.split(/[^a-z0-9]+/).filter((word) => word.length > 2);

  return [...files]
    .filter((file) => !!file.url)
    .map((file) => {
      const lowerName = file.name.toLowerCase();
      let score = 0;

      if (keywords.some((keyword) => lowerName.includes(keyword))) score += 5;
      if (normalizedQuestion.includes("certificate") && lowerName.includes("certificate")) score += 6;
      if (normalizedQuestion.includes("intern") && lowerName.includes("intern")) score += 6;
      if (normalizedQuestion.includes("id") && lowerName.includes("id")) score += 3;
      if (file.type === "pdf") score += 4;
      if (file.type === "image") score += 3;
      if (file.type === "document") score += 1;
      if (typeof file.size === "number" && file.size <= 12 * 1024 * 1024) score += 2;

      return { file, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0)
    .slice(0, 2)
    .map((entry) => entry.file);
}

async function buildFileParts(files: AskAiRequest["files"]) {
  const parts: Array<Record<string, unknown>> = [];

  for (const file of files) {
    if (!file.url) continue;

    const mimeType = inferMimeType(file);
    if (!mimeType) continue;

    const response = await fetch(file.url);
    if (!response.ok) continue;

    const buffer = Buffer.from(await response.arrayBuffer());
    const maxInlineBytes = 10 * 1024 * 1024;
    if (buffer.length > maxInlineBytes) continue;

    if (mimeType.startsWith("text/")) {
      parts.push({
        text: `File: ${file.name}\n${buffer.toString("utf8").slice(0, 12000)}`,
      });
      continue;
    }

    parts.push({
      text: `Attached file: ${file.name}`,
    });
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: buffer.toString("base64"),
      },
    });
  }

  return parts;
}

export async function POST(request: Request) {
  try {
    await connection();
    const body = (await request.json()) as AskAiRequest;
    const apiKey = (await resolveGeminiApiKey()) || "AIzaSyA_zuZ9BeqRIlVRegiiGSmEOr9DAXD9e2o";

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const conversation = (body.messages ?? [])
      .slice(-8)
      .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
      .join("\n");
    const relevantFiles = pickRelevantFiles(body.question, body.files);
    const fileParts = await buildFileParts(relevantFiles);

    const prompt = [
      "You are NexDrive AI, a helpful file workspace assistant inside a product called NexDrive.",
      "Answer naturally like a real chat assistant, but only use the workspace data and attached files below.",
      "If the user asks for something not present in the data, say that clearly instead of inventing details.",
      "Be concise, useful, and practical.",
      "If an attached document or image contains the answer, prefer that over filename guesses.",
      "When helpful, suggest the next action in plain language.",
      "",
      `Workspace: ${body.workspaceTitle}`,
      `Current view: ${body.viewLabel}`,
      `Visible files: ${body.files.length}`,
      `Visible folders: ${body.folders.length}`,
      `Active shares: ${body.activeShares}`,
      `Storage used: ${body.storageTotal} bytes of ${body.storageLimit} bytes`,
      "",
      "Files:",
      JSON.stringify(body.files.slice(0, 30)),
      "",
      "Folders:",
      JSON.stringify(body.folders.slice(0, 20)),
      "",
      "Recent conversation:",
      conversation || "No previous messages.",
      "",
      relevantFiles.length > 0
        ? `Attached relevant files: ${relevantFiles.map((file) => file.name).join(", ")}`
        : "No relevant file attachments were found for this question.",
      "",
      `Latest user question: ${body.question}`,
    ].join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, ...fileParts],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "Gemini request failed" },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const rawText = extractGeminiText(payload);

    if (!rawText) {
      return NextResponse.json(
        { error: "Gemini returned an empty response" },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: rawText });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ask AI request failed",
      },
      { status: 500 }
    );
  }
}
