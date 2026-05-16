import { connection, NextResponse } from "next/server";
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

async function resolveOpenAiApiKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY.trim();
  }

  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    return process.env.NEXT_PUBLIC_OPENAI_API_KEY.trim();
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const contents = await readFile(envPath, "utf8");
    const match =
      contents.match(/^OPENAI_API_KEY=(.+)$/m) ??
      contents.match(/^NEXT_PUBLIC_OPENAI_API_KEY=(.+)$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

function extractOutputText(payload: unknown) {
  const direct = (payload as { output_text?: string })?.output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const output = (payload as {
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  })?.output;

  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
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
      if (normalizedQuestion.includes("id")) score += 2;
      if (file.type === "pdf") score += 4;
      if (file.type === "image") score += 3;
      if (typeof file.size === "number" && file.size <= 12 * 1024 * 1024) score += 2;

      return { file, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0)
    .slice(0, 2)
    .map((entry) => entry.file);
}

async function buildFileInputs(files: AskAiRequest["files"]) {
  const inputs: Array<Record<string, unknown>> = [];

  for (const file of files) {
    if (!file.url) continue;

    const mimeType = inferMimeType(file);
    if (!mimeType) continue;

    if (mimeType === "application/pdf") {
      inputs.push({
        type: "input_file",
        file_url: file.url,
      });
      continue;
    }

    const response = await fetch(file.url);
    if (!response.ok) continue;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) continue;

    if (mimeType.startsWith("text/")) {
      inputs.push({
        type: "input_text",
        text: `File: ${file.name}\n${buffer.toString("utf8").slice(0, 12000)}`,
      });
      continue;
    }

    inputs.push({
      type: "input_image",
      image_url: `data:${mimeType};base64,${buffer.toString("base64")}`,
    });
  }

  return inputs;
}

export async function POST(request: Request) {
  try {
    await connection();
    const body = (await request.json()) as AskAiRequest;
    const apiKey = await resolveOpenAiApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const conversation = (body.messages ?? [])
      .slice(-8)
      .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
      .join("\n");

    const relevantFiles = pickRelevantFiles(body.question, body.files);
    const fileInputs = await buildFileInputs(relevantFiles);

    const prompt = [
      "You are NexDrive AI, a helpful file workspace assistant inside a product called NexDrive.",
      "Answer naturally like a real chat assistant.",
      "Use the workspace metadata and any attached files below.",
      "If the user asks for something not present in the files or metadata, say that clearly.",
      "",
      `Workspace: ${body.workspaceTitle}`,
      `Current view: ${body.viewLabel}`,
      `Visible files: ${body.files.length}`,
      `Visible folders: ${body.folders.length}`,
      `Active shares: ${body.activeShares}`,
      `Storage used: ${body.storageTotal} bytes of ${body.storageLimit} bytes`,
      "",
      "Files metadata:",
      JSON.stringify(body.files.slice(0, 30)),
      "",
      "Folders metadata:",
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              ...fileInputs,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || "OpenAI request failed" },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const message = extractOutputText(payload);

    if (!message) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response" },
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
