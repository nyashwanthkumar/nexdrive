"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-white px-6">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="border border-zinc-200 bg-white p-10 md:p-14">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-zinc-500">File management platform</p>

            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-zinc-900">
              FileDrive
            </h1>

            <p className="mt-6 text-base leading-8 text-zinc-700">
              Store, organize, and access files across personal and shared workspaces.
              Upload documents, preview media, search content, mark important files,
              and manage deleted items from a single dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isSignedIn ? (
                <Link href="/dashboard">
                  <Button size="lg">Open Dashboard</Button>
                </Link>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button size="lg">Get Started</Button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <Button size="lg" variant="outline">
                      Create Account
                    </Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>

          <div className="mt-12 grid gap-3 border-t border-zinc-200 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureItem title="Personal and shared workspaces" />
            <FeatureItem title="Upload and download files" />
            <FeatureItem title="Search by file name" />
            <FeatureItem title="Favorites and quick access" />
            <FeatureItem title="Trash, restore, and permanent delete" />
            <FeatureItem title="Role based file permissions" />
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({ title }: { title: string }) {
  return (
    <div className="border border-zinc-200 px-4 py-4 text-sm text-zinc-700">
      {title}
    </div>
  );
}
