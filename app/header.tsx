"use client";

import Link from "next/link";
import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white relative z-50">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-6">
        <Link href="/" className="text-3xl font-medium text-zinc-900">
          FileDrive
        </Link>

        {isSignedIn ? (
          <div className="flex items-center gap-3 overflow-visible">
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
              afterSelectPersonalUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "overflow-visible",
                },
              }}
            />
            <UserButton />
          </div>
        ) : (
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}