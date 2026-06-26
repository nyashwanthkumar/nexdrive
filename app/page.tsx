"use client";

import { SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-800 dark:border-t-zinc-200" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-zinc-950">
      <section className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <h1 className="text-5xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-6xl">
          NexDrive
        </h1>

        <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
          <Button size="lg" className="h-11 rounded-lg px-7 text-base">
            Get started
          </Button>
        </SignUpButton>
      </section>
    </main>
  );
}
