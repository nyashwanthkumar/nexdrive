"use client";

import { TaskResetPassword } from "@clerk/nextjs";

export default function ResetPasswordTaskPage() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f6f7f9] px-4 py-10 dark:bg-zinc-950">
      <TaskResetPassword redirectUrlComplete="/dashboard" />
    </main>
  );
}
