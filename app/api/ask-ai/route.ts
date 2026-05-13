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

export async function POST(request: Request) {
  try {
    await connection();
    const body = (await request.json()) as AskAiRequest;
    const apiKey = await resolveGeminiApiKey();

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

    const prompt = [
      "You are NexDrive AI, a helpful file workspace assistant inside a product called NexDrive.",
      "Answer naturally like a real chat assistant, but only use the workspace data below.",
      "If the user asks for something not present in the data, say that clearly instead of inventing details.",
      "Be concise, useful, and practical.",
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
              parts: [{ text: prompt }],
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
