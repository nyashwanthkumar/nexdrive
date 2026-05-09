"use client";

import { use } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { Download, FileText, ImageIcon, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function SharedFilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const file = useQuery(api.files.getSharedFile, { token });

  if (file === undefined) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f6f7f9]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </main>
    );
  }

  if (!file) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f6f7f9] px-4">
        <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <FileText className="h-6 w-6 text-zinc-400" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-zinc-950">Link unavailable</h1>
          <p className="mt-1 text-sm text-zinc-500">
            This shared file link has expired or was removed.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f6f7f9] px-4 py-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Shared with NexDrive
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold text-zinc-950">{file.name}</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Expires {new Date(file.expiresAt).toLocaleString()}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <a href={file.url ?? "#"} download={file.name} target="_blank" rel="noreferrer">
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>

        <div className="flex min-h-[420px] items-center justify-center bg-zinc-50">
          {file.type === "image" && file.url ? (
            <div className="relative h-[70vh] max-h-[720px] w-full">
              <Image
                src={file.url}
                alt={file.name}
                fill
                unoptimized
                className="object-contain p-4"
              />
            </div>
          ) : file.type === "pdf" && file.url ? (
            <object data={file.url} type="application/pdf" className="h-[75vh] w-full">
              <div className="p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-3 text-sm text-zinc-600">Preview is not available here.</p>
              </div>
            </object>
          ) : (
            <div className="p-8 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-zinc-400" />
              <p className="mt-3 text-sm text-zinc-600">Preview is not available for this file.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
