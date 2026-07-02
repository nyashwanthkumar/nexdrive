import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type AiProviderConfig = {
  apiKey: string;
  endpoint: string;
  model: string;
  headers?: Record<string, string>;
};

function cleanApiKey(value: string | undefined) {
  const key = value?.trim().replace(/^["']|["']$/g, "") || "";
  return key.replace(/^Bearer\s+/i, "").trim();
}

function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
}

function getAiProviderConfig(): AiProviderConfig | null {
  const openRouterApiKey = cleanApiKey(process.env.OPENROUTER_API_KEY);

  if (!openRouterApiKey) return null;

  return {
    apiKey: openRouterApiKey,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: getOpenRouterModel(),
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
      "X-Title": "NexDrive",
    },
  };
}

function formatBytes(size = 0) {
  if (!Number.isFinite(size) || size <= 0) return "0 MB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function extractOpenRouterText(payload: unknown) {
  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices;
  if (!Array.isArray(choices) || !choices.length) return "";
  return (choices[0]?.message?.content ?? "").trim();
}

function readOpenRouterError(payload: unknown) {
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
    const provider = getAiProviderConfig();

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "Ask AI needs an OpenRouter API key. Add OPENROUTER_API_KEY to .env.local, restart npm.cmd run dev, and try again.",
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

    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: "user",
            content: buildPrompt(normalizedBody),
          },
        ],
        temperature: 0.3,
        max_tokens: 900,
      }),
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const providerMessage = readOpenRouterError(payload);
      return NextResponse.json(
        {
          error: providerMessage
            ? `OpenRouter request failed: ${providerMessage}`
            : "OpenRouter request failed. Check OPENROUTER_API_KEY and try again.",
        },
        { status: 502 }
      );
    }

    const message = extractOpenRouterText(payload);

    if (!message) {
      return NextResponse.json(
        { error: "OpenRouter returned an empty answer. Try a shorter question." },
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
