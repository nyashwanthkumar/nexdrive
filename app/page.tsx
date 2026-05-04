"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Upload,
  Search,
  Star,
  Trash2,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: FolderOpen,
    title: "Personal & shared workspaces",
    description:
      "Switch between your personal files and organisation workspaces from a single account.",
  },
  {
    icon: Upload,
    title: "Upload and download files",
    description:
      "Upload images, PDFs, and spreadsheets instantly with a preview for each file type.",
  },
  {
    icon: Search,
    title: "Search by file name",
    description:
      "Find any file in seconds using the search bar across all your workspaces.",
  },
  {
    icon: Star,
    title: "Favourites and quick access",
    description:
      "Star important files so they always appear when you need them most.",
  },
  {
    icon: Trash2,
    title: "Trash, restore, and delete",
    description:
      "Move files to trash and restore them any time, or permanently remove them.",
  },
  {
    icon: ShieldCheck,
    title: "Role based permissions",
    description:
      "Admins and members have different access levels so your data stays protected.",
  },
];

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          File management platform
        </p>

        <h1 className="max-w-2xl text-[3rem] font-semibold leading-[1.1] tracking-tight text-zinc-900">
          Your files,{" "}
          <span className="text-zinc-400">everywhere you work.</span>
        </h1>

        <p className="mt-6 max-w-lg text-base leading-7 text-zinc-500">
          Store, organise, and access files across personal and shared
          workspaces. Upload documents, preview media, search content, and
          manage deleted items from a single dashboard.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button size="lg" className="rounded-lg px-6">
                Open Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button size="lg" className="rounded-lg px-6">
                  Get Started
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="lg" variant="outline" className="rounded-lg px-6">
                  Create Account
                </Button>
              </SignUpButton>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-10 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            What's included
          </p>
          <div className="grid grid-cols-1 gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group bg-zinc-50 p-8 transition-colors duration-150 hover:bg-white"
              >
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors group-hover:border-zinc-300">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  {title}
                </h3>
                <p className="text-sm leading-6 text-zinc-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
