import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AskAiMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskAiRequest = {
  question?: string;
  messages?: AskAiMessage[];
  workspaceTitle?: string;
  viewLabel?: string;
  files?: Array<{
    name: string;
    type: string;
    size?: number;
    isFavorite?: boolean;
    folderId?: string;
  }>;
  folders?: Array<{
    name: string;
    isFavorite?: boolean;
  }>;
  activeShares?: number;
  storageTotal?: number;
  storageLimit?: number;
};

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  );
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function formatBytes(size = 0) {
  if (!Number.isFinite(size) || size <= 0) return "0 MB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

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

function readGeminiError(payload: unknown) {
  const message = (payload as { error?: { message?: string } })?.error?.message;
  return typeof message === "string" && message.trim() ? message.trim() : "";
}

function buildPrompt(body: Required<AskAiRequest>) {
  const files = body.files.slice(0, 40).map((file) => ({
    name: file.name,
    type: file.type,
    size: formatBytes(file.size),
    favorite: Boolean(file.isFavorite),
  }));

  const folders = body.folders.slice(0, 30).map((folder) => ({
    name: folder.name,
    favorite: Boolean(folder.isFavorite),
  }));

  const recentMessages = body.messages
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");

  return [
    "You are NexDrive AI, a concise file workspace assistant inside NexDrive.",
    "Help the user understand, organize, clean up, or review files in their current workspace.",
    "Use only the workspace metadata below. Do not claim to read file contents unless the metadata proves it.",
    "If the answer is not available from the metadata, say what is missing and suggest the next practical step.",
    "",
    `Workspace: ${body.workspaceTitle}`,
    `Current view: ${body.viewLabel}`,
    `Visible files: ${body.files.length}`,
    `Visible folders: ${body.folders.length}`,
    `Active share links: ${body.activeShares}`,
    `Storage used: ${formatBytes(body.storageTotal)} of ${formatBytes(body.storageLimit)}`,
    "",
    "Files:",
    JSON.stringify(files, null, 2),
    "",
    "Folders:",
    JSON.stringify(folders, null, 2),
    "",
    "Recent chat:",
    recentMessages || "No earlier messages.",
    "",
    `User question: ${body.question}`,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Ask AI needs a Gemini API key. Add GEMINI_API_KEY to .env.local, restart npm.cmd run dev, and try again.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as AskAiRequest | null;
    const question = body?.question?.trim();

    if (!question) {
      return NextResponse.json({ error: "Ask AI needs a question." }, { status: 400 });
    }

    const normalizedBody: Required<AskAiRequest> = {
      question,
      messages: Array.isArray(body?.messages) ? body.messages : [],
      workspaceTitle: body?.workspaceTitle?.trim() || "NexDrive workspace",
      viewLabel: body?.viewLabel?.trim() || "Current view",
      files: Array.isArray(body?.files) ? body.files : [],
      folders: Array.isArray(body?.folders) ? body.folders : [],
      activeShares: Number.isFinite(body?.activeShares) ? Number(body?.activeShares) : 0,
      storageTotal: Number.isFinite(body?.storageTotal) ? Number(body?.storageTotal) : 0,
      storageLimit: Number.isFinite(body?.storageLimit) ? Number(body?.storageLimit) : 0,
    };

    const model = getGeminiModel();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(normalizedBody) }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 900,
          },
        }),
      }
    );

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const providerMessage = readGeminiError(payload);
      return NextResponse.json(
        {
          error: providerMessage
            ? `Gemini request failed: ${providerMessage}`
            : "Gemini request failed. Check GEMINI_API_KEY and try again.",
        },
        { status: 502 }
      );
    }

    const message = extractGeminiText(payload);

    if (!message) {
      return NextResponse.json(
        { error: "Gemini returned an empty answer. Try a shorter question." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ask AI request failed",
      },
      { status: 500 }
    );
  }
}
