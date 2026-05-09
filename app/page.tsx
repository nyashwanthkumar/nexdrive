"use client";

import { SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Files, FolderOpen, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f6f7f9] px-4 py-10 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-144px)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            NexDrive for project files.
          </h1>

          <p className="mt-4 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Upload files, keep folders tidy, and send share links when someone
            needs access.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <Button size="lg" className="h-11 rounded-xl px-5">
                Get started
              </Button>
            </SignUpButton>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
            {[
              "Preview PDFs and images",
              "Expiring share links",
              "Recent activity",
              "Storage usage",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <div className="rounded-xl border border-zinc-100 bg-[#f6f7f9] p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Recent
                </p>
                <p className="text-xs text-zinc-500">7 items in workspace</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-950">
                  Grid
                </span>
                <span className="px-3 py-1 text-xs text-zinc-500">List</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PreviewCard
                icon={<Files className="h-5 w-5 text-red-500" />}
                title="Design brief.pdf"
                type="PDF"
              />
              <PreviewCard
                icon={<FolderOpen className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />}
                title="Client assets"
                type="Folder"
              />
              <PreviewCard
                imageClass="bg-[linear-gradient(135deg,#0f172a,#38bdf8)]"
                title="hero-image.png"
                type="Image"
              />
              <PreviewCard
                icon={<Link2 className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />}
                title="Share links"
                type="3 active"
              />
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Storage</span>
                <span>142 MB of 1 GB</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full w-[14%] rounded-full bg-zinc-900 dark:bg-zinc-100" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewCard({
  icon,
  imageClass,
  title,
  type,
}: {
  icon?: ReactNode;
  imageClass?: string;
  title: string;
  type: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className={`flex h-24 items-center justify-center bg-zinc-100 dark:bg-zinc-800 ${imageClass ?? ""}`}
      >
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-zinc-950">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {title}
        </p>
        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {type}
        </span>
      </div>
    </div>
  );
}
