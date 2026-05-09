"use client";

import Link from "next/link";
import {
  SignInButton,
  useAuth,
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./theme-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Check,
  ChevronRight,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  User,
} from "lucide-react";

export function Header() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const showHeaderSignIn = pathname !== "/";

  return (
    <header className="relative z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-6">
        <Link href="/" className="text-3xl font-medium text-zinc-900 dark:text-zinc-50">
          NexDrive
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSignedIn ? (
            <AccountMenu />
          ) : showHeaderSignIn ? (
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button>Sign in</Button>
            </SignInButton>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function AccountMenu() {
  const router = useRouter();
  const clerk = useClerk();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: true,
  });
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const avatarUrl = user?.imageUrl;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName ?? user?.username ?? "NexDrive user";
  const memberships = userMemberships.data ?? [];

  async function selectOrganization(organizationId: string | null) {
    if (!isLoaded || !setActive) return;
    await setActive({ organization: organizationId });
    setIsOpen(false);
    router.push("/dashboard");
  }

  function openCreateOrganization() {
    setIsOpen(false);
    clerk.openCreateOrganization({
      afterCreateOrganizationUrl: "/dashboard",
    });
  }

  function openUserProfile() {
    setIsOpen(false);
    clerk.openUserProfile();
  }

  async function signOut() {
    setIsOpen(false);
    await clerk.signOut({ redirectUrl: "/" });
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-transparent transition hover:ring-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:ring-zinc-700"
      >
        <Avatar imageUrl={avatarUrl} name={name} size="sm" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar imageUrl={avatarUrl} name={name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{email}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close account menu"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <button
              type="button"
              onClick={openUserProfile}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Manage account
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <div className="p-2">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Workspaces
            </p>
            <MenuButton
              icon={<User className="h-4 w-4" />}
              label="Personal"
              sublabel={email}
              active={!organization}
              onClick={() => selectOrganization(null)}
            />

            {memberships.map((membership) => (
              <MenuButton
                key={membership.id}
                icon={<Building2 className="h-4 w-4" />}
                label={membership.organization.name}
                sublabel="Organization"
                active={organization?.id === membership.organization.id}
                onClick={() => selectOrganization(membership.organization.id)}
              />
            ))}

            <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />

            <MenuButton
              icon={<Plus className="h-4 w-4" />}
              label="New organization"
              onClick={openCreateOrganization}
            />
            {organization && (
              <MenuButton
                icon={<Settings className="h-4 w-4" />}
                label="Organization settings"
                onClick={() => {
                  setIsOpen(false);
                  clerk.openOrganizationProfile();
                }}
              />
            )}
            <MenuButton
              icon={<LogOut className="h-4 w-4" />}
              label="Sign out"
              onClick={signOut}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({
  imageUrl,
  name,
  size,
}: {
  imageUrl?: string;
  name: string;
  size: "sm" | "md";
}) {
  const dimension = size === "md" ? "h-11 w-11" : "h-9 w-9";
  const fallbackText = name.trim().charAt(0).toUpperCase() || "N";

  return (
    <span
      className={`flex ${dimension} shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950`}
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {!imageUrl && fallbackText}
    </span>
  );
}

function MenuButton({
  icon,
  label,
  sublabel,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950" : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-white/10 text-white dark:bg-zinc-950/10 dark:text-zinc-950" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-medium ${
            active ? "text-white dark:text-zinc-950" : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className={`block truncate text-xs ${
              active ? "text-white/60 dark:text-zinc-950/60" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {sublabel}
          </span>
        )}
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-white dark:text-zinc-950" />}
    </button>
  );
}
