import { NextResponse } from "next/server";

type AskAiRequest = {
  question: string;
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

function parseStructuredAnswer(rawText: string) {
  const sanitized = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(sanitized) as {
      title?: string;
      summary?: string;
      bullets?: string[];
    };

    return {
      title: parsed.title?.trim() || "Ask AI",
      summary: parsed.summary?.trim() || sanitized,
      bullets: Array.isArray(parsed.bullets)
        ? parsed.bullets.map((bullet) => bullet.trim()).filter(Boolean).slice(0, 5)
        : [],
    };
  } catch {
    const lines = sanitized
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

    return {
      title: "Ask AI",
      summary: lines[0] ?? sanitized ?? "No response returned.",
      bullets: lines.slice(1, 6),
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskAiRequest;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const prompt = [
      "You are NexDrive AI, a concise workspace assistant.",
      "Answer the user's question using only the workspace data below.",
      "If the question asks for something not present in the data, say that clearly instead of inventing details.",
      'Return strict JSON with exactly these keys: "title", "summary", "bullets".',
      '"title" should be short. "summary" should be 1-3 sentences. "bullets" should be an array of up to 5 short strings.',
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
      `User question: ${body.question}`,
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

    return NextResponse.json(parseStructuredAnswer(rawText));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ask AI request failed",
      },
      { status: 500 }
    );
  }
}
