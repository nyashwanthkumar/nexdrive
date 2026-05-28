"use client";

import Link from "next/link";
import {
  SignInButton,
  OrganizationProfile,
  useAuth,
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useTheme } from "./theme-provider";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Building2,
  Check,
  ChevronRight,
  LogOut,
  Moon,
  Plus,
  Monitor,
  ShieldCheck,
  Settings,
  Sun,
  User,
  UserPlus,
} from "lucide-react";

type OrganizationSecurityMembership = {
  id: string;
  role: string;
  roleName?: string;
  publicUserData?: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    identifier: string;
    username?: string;
  };
};

type OrganizationSecurityResource = {
  membersCount: number;
  pendingInvitationsCount: number;
  getMemberships: (params?: {
    initialPage?: number;
    pageSize?: number;
    role?: string[];
  }) => Promise<{ data: OrganizationSecurityMembership[] }>;
};

type OrganizationSecuritySession = {
  id: string;
  status: string;
  lastActiveAt: Date;
  latestActivity: {
    browserName?: string;
    browserVersion?: string;
    deviceType?: string;
    ipAddress?: string;
    city?: string;
    country?: string;
    isMobile?: boolean;
  };
  revoke: () => Promise<OrganizationSecuritySession>;
};

export function Header() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const showHeaderSignIn = pathname !== "/";
  const isDashboard = pathname === "/dashboard";

  function openAskAi() {
    if (isDashboard) {
      window.dispatchEvent(new CustomEvent("nexdrive:open-ask-ai"));
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <header className="relative z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-6">
        <Link href="/" className="text-3xl font-medium text-zinc-900 dark:text-zinc-50">
          NexDrive
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSignedIn ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full px-4"
                onClick={openAskAi}
              >
                <Bot className="mr-2 h-4 w-4" />
                Ask AI
              </Button>
              <AccountMenu />
            </>
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

const organizationProfileAppearance = {
  elements: {
    rootBox: "w-full",
    card: "rounded-3xl border border-zinc-200 shadow-2xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950",
    navbar: "bg-zinc-50/90 dark:bg-zinc-950",
    navbarButton:
      "rounded-xl text-zinc-600 transition-all hover:bg-white hover:text-zinc-950 data-[active=true]:bg-zinc-950 data-[active=true]:text-white dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:data-[active=true]:bg-zinc-100 dark:data-[active=true]:text-zinc-950",
    pageScrollBox: "px-6 py-5",
    page: "space-y-4",
    profileSection: "rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900",
    profileSectionTitle: "text-sm font-semibold text-zinc-950 dark:text-zinc-50",
    profileSectionContent: "text-sm text-zinc-600 dark:text-zinc-300",
    table: "overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800",
    tableHead: "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400",
    tableRow: "border-zinc-100 dark:border-zinc-800",
    formButtonPrimary:
      "rounded-xl bg-zinc-950 text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200",
    formButtonReset:
      "rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
    badge: "rounded-full",
  },
} as const;

function AccountMenu() {
  const clerk = useClerk();
  const { orgRole } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: true,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isOrganizationProfileOpen, setIsOrganizationProfileOpen] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org:member" | "org:admin">("org:member");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
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
  const memberships = useMemo(() => userMemberships.data ?? [], [userMemberships.data]);
  const isOrgAdmin = orgRole === "org:admin" || orgRole === "admin";

  function goToDashboard(url: string) {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      window.location.href = url;
      return;
    }

    window.location.assign(url);
  }

  async function selectOrganization(organizationId: string | null) {
    if (!isLoaded || !setActive || isSwitchingWorkspace) return;

    const currentOrganizationId = organization?.id ?? null;
    if (currentOrganizationId === organizationId) {
      setIsOpen(false);
      return;
    }

    try {
      setIsSwitchingWorkspace(true);
      await setActive({
        organization: organizationId,
        navigate: async ({ decorateUrl }) => {
          goToDashboard(decorateUrl("/dashboard"));
        },
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch organization", error);
      setIsOpen(false);
      setIsSwitchingWorkspace(false);
    } finally {
      setIsSwitchingWorkspace(false);
    }
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

  function openOrganizationProfile() {
    setIsOpen(false);
    setIsOrganizationProfileOpen(true);
  }

  function openInviteDialog() {
    setIsOpen(false);
    setInviteEmail("");
    setInviteRole("org:member");
    setIsInviteDialogOpen(true);
  }

  async function sendInvite() {
    if (!organization) return;

    const nextEmail = inviteEmail.trim();
    if (!nextEmail) {
      return;
    }

    try {
      setIsSendingInvite(true);
      await organization.inviteMember({
        emailAddress: nextEmail,
        role: inviteRole,
      });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("org:member");
      toast.success("Invitation email sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
    }
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
              sublabel={isSwitchingWorkspace && !organization ? "Switching..." : email}
              active={!organization}
              disabled={isSwitchingWorkspace}
              onClick={() => selectOrganization(null)}
            />

            {memberships.map((membership) => (
              <MenuButton
                key={membership.id}
                icon={<Building2 className="h-4 w-4" />}
                label={membership.organization.name}
                sublabel={
                  isSwitchingWorkspace && organization?.id === membership.organization.id
                    ? "Switching..."
                    : "Organization"
                }
                active={organization?.id === membership.organization.id}
                disabled={isSwitchingWorkspace}
                onClick={() => selectOrganization(membership.organization.id)}
              />
            ))}

            <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />
            <MenuButton
              icon={<Plus className="h-4 w-4" />}
              label={isSwitchingWorkspace ? "Please wait..." : "New organization"}
              disabled={isSwitchingWorkspace}
              onClick={openCreateOrganization}
            />
            {organization && isOrgAdmin && (
              <MenuButton
                icon={<UserPlus className="h-4 w-4" />}
                label="Invite member"
                disabled={isSwitchingWorkspace}
                onClick={openInviteDialog}
              />
            )}
            {organization && (
              <MenuButton
                icon={<Settings className="h-4 w-4" />}
                label="Manage organization"
                disabled={isSwitchingWorkspace}
                onClick={openOrganizationProfile}
              />
            )}
            <MenuButton
              icon={<LogOut className="h-4 w-4" />}
              label="Sign out"
              disabled={isSwitchingWorkspace}
              onClick={signOut}
            />
          </div>
        </div>
      )}

      <Dialog
        open={isInviteDialogOpen}
        onOpenChange={(isOpen) => {
          setIsInviteDialogOpen(isOpen);
          if (!isOpen) {
            setInviteEmail("");
            setInviteRole("org:member");
          }
        }}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Invite to organization</DialogTitle>
            <DialogDescription>
              Clerk will send the invitation email for {organization?.name ?? "this organization"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                autoFocus
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="invite-role" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as "org:member" | "org:admin")}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              >
                <option value="org:member">Member</option>
                <option value="org:admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isSendingInvite || !inviteEmail.trim()} onClick={() => void sendInvite()}>
                {isSendingInvite ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOrganizationProfileOpen}
        onOpenChange={setIsOrganizationProfileOpen}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-auto p-0 sm:max-w-5xl" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Manage organization</DialogTitle>
            <DialogDescription>
              Manage organization profile, members, roles, invitations, and security.
            </DialogDescription>
          </DialogHeader>
          <OrganizationProfile appearance={organizationProfileAppearance} routing="hash">
            <OrganizationProfile.Page label="general" />
            <OrganizationProfile.Page label="members" />
            <OrganizationProfile.Page
              label="Security"
              url="security"
              labelIcon={<ShieldCheck className="h-4 w-4" />}
            >
              <OrganizationSecurityPanel
                organization={organization as OrganizationSecurityResource | null}
                organizationName={organization?.name ?? "this organization"}
              />
            </OrganizationProfile.Page>
          </OrganizationProfile>
        </DialogContent>
      </Dialog>
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

function OrganizationSecurityPanel({
  organization,
  organizationName,
}: {
  organization: OrganizationSecurityResource | null;
  organizationName: string;
}) {
  const { sessionId } = useAuth();
  const { user } = useUser();
  const [admins, setAdmins] = useState<OrganizationSecurityMembership[]>([]);
  const [sessions, setSessions] = useState<OrganizationSecuritySession[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmins() {
      if (!organization) {
        setAdmins([]);
        return;
      }

      try {
        setIsLoadingAdmins(true);
        const response = await organization.getMemberships({
          pageSize: 10,
          role: ["org:admin"],
        });
        if (!cancelled) setAdmins(response.data);
      } catch {
        if (!cancelled) setAdmins([]);
      } finally {
        if (!cancelled) setIsLoadingAdmins(false);
      }
    }

    void loadAdmins();

    return () => {
      cancelled = true;
    };
  }, [organization]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      if (!user) {
        setSessions([]);
        return;
      }

      try {
        setIsLoadingSessions(true);
        const nextSessions = await user.getSessions();
        if (!cancelled) setSessions(nextSessions as OrganizationSecuritySession[]);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setIsLoadingSessions(false);
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function revokeSession(targetSession: OrganizationSecuritySession) {
    try {
      setRevokingSessionId(targetSession.id);
      await targetSession.revoke();
      setSessions((current) => current.filter((session) => session.id !== targetSession.id));
      toast.success("Session revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  }

  return (
    <div className="space-y-5 pb-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Admins</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Who controls {organizationName}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Admins can manage members, roles, invitations, profile settings, and organization deletion.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {isLoadingAdmins ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Loading admins...</div>
          ) : admins.length > 0 ? (
            admins.map((membership) => {
              const userData = membership.publicUserData;
              const fullName = [userData?.firstName, userData?.lastName].filter(Boolean).join(" ");
              const displayName = fullName || userData?.username || userData?.identifier || "Admin";
              const imageUrl = userData?.imageUrl;

              return (
                <div key={membership.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 bg-cover bg-center text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950"
                    style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                  >
                    {!imageUrl && displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">{displayName}</strong>
                    {userData?.identifier && <small className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{userData.identifier}</small>}
                  </span>
                  <em className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold not-italic text-white dark:bg-zinc-100 dark:text-zinc-950">{membership.roleName || "Admin"}</em>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">No admins found from Clerk.</div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Active devices</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Your signed-in sessions</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              These are your real Clerk sessions. Devices are tied to your account, not the organization.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {isLoadingSessions ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Loading devices...</div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => {
              const activity = session.latestActivity;
              const isCurrentSession = session.id === sessionId;
              const browser = [activity.browserName, activity.browserVersion].filter(Boolean).join(" ");
              const location = [activity.city, activity.country].filter(Boolean).join(", ");

              return (
                <div key={session.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {activity.deviceType || (activity.isMobile ? "Mobile device" : "Desktop device")}
                      </p>
                      {isCurrentSession && (
                        <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {[browser || "Unknown browser", activity.ipAddress, location].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      Last active {new Date(session.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                  {!isCurrentSession && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={revokingSessionId === session.id}
                      onClick={() => void revokeSession(session)}
                    >
                      {revokingSessionId === session.id ? "Revoking..." : "Revoke"}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">No active devices found.</div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Password and two-step verification</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Password</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{user?.passwordEnabled ? "Enabled" : "Not enabled"}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Two-step verification</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{user?.twoFactorEnabled ? "Enabled" : "Not enabled"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  sublabel,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
