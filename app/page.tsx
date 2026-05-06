"use client";

import { useAuth } from "@clerk/nextjs";
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
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f6f7f9] px-6 py-12">
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
          NexDrive
        </h1>
      </section>
    </main>
  );
}
