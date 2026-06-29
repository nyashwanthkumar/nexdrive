"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Crown,
  Loader2,
  Mail,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  OrganizationWorkspaceFeatureProps,
  OrganizationWorkspaceResource,
  TeamInvitation,
  TeamMembership,
  WorkspaceRole,
} from "./types";
import { fetchOrganizationTeam, revokeOrganizationInvite, sendOrganizationInvite } from "./api";
import { formatJoinDate, memberInitial, memberName, roleTitle } from "./utils";

export function OrganizationWorkspaceFeature({
  workspaceName,
  isOrganization,
  canManage,
  fileCount,
  activeShares,
}: OrganizationWorkspaceFeatureProps) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const team = organization as OrganizationWorkspaceResource | null;
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [joinedCount, setJoinedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("org:member");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [workingMemberId, setWorkingMemberId] = useState<string | null>(null);
  const [workingInviteId, setWorkingInviteId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    if (!isOrganization) {
      setMembers([]);
      setInvitations([]);
      setJoinedCount(0);
      setPendingCount(0);
      return;
    }

    try {
      setIsLoadingTeam(true);
      const payload = await fetchOrganizationTeam();

      setMembers(payload.members ?? []);
      setInvitations(canManage ? payload.invitations ?? [] : []);
      setJoinedCount(payload.joinedCount ?? payload.members?.length ?? 0);
      setPendingCount(canManage ? payload.pendingCount ?? payload.invitations?.length ?? 0 : 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load team");
    } finally {
      setIsLoadingTeam(false);
    }
  }, [canManage, isOrganization]);

  useEffect(() => {
    if (isOpen) void loadTeam();
  }, [isOpen, loadTeam]);

  async function sendInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!team || !canManage) return;

    const email = inviteEmail.trim();
    if (!email) return;

    try {
      setIsSendingInvite(true);
      await sendOrganizationInvite(email, inviteRole);
      setInviteEmail("");
      setInviteRole("org:member");
      toast.success("Invitation sent");
      await loadTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
    }
  }

  async function updateRole(member: TeamMembership, nextRole: WorkspaceRole) {
    const userId = member.publicUserData?.userId;
    if (!team || !userId || !canManage) return;

    try {
      setWorkingMemberId(member.id);
      await team.updateMember({ userId, role: nextRole });
      toast.success(nextRole === "org:admin" ? "Member promoted" : "Admin changed to member");
      await loadTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setWorkingMemberId(null);
    }
  }

  async function removeMember(member: TeamMembership) {
    const userId = member.publicUserData?.userId;
    if (!team || !userId || !canManage || userId === user?.id) return;

    try {
      setWorkingMemberId(member.id);
      await team.removeMember(userId);
      toast.success("Member removed");
      await loadTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setWorkingMemberId(null);
    }
  }

  async function revokeInvite(invitation: TeamInvitation) {
    if (!canManage) return;

    try {
      setWorkingInviteId(invitation.id);
      await revokeOrganizationInvite(invitation.id);
      toast.success("Invitation revoked");
      await loadTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke invitation");
    } finally {
      setWorkingInviteId(null);
    }
  }

  if (!isOrganization) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-xl border-transparent bg-transparent px-3 shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => setIsOpen(true)}
      >
        <Users className="mr-1.5 h-3.5 w-3.5" />
        Team
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[min(780px,calc(100vh-2rem))] overflow-auto p-0 sm:max-w-5xl">
          <div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 sm:px-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
                  <Users className="h-4 w-4" />
                </span>
                Workspace team
              </DialogTitle>
              <DialogDescription>
                Members, invitations, and role controls for {workspaceName}.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="bg-zinc-50/70 px-5 py-5 dark:bg-zinc-950/40 sm:px-6">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <WorkspaceStat label="Joined users" value={joinedCount.toString()} />
              {canManage ? <WorkspaceStat label="Pending invites" value={pendingCount.toString()} /> : null}
              <WorkspaceStat label="Files" value={fileCount.toString()} />
              <WorkspaceStat label="Shares" value={activeShares.toString()} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Members</h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {canManage
                        ? "Admins manage files, folders, shares, trash, invitations, and roles."
                        : "View everyone who has access to this workspace."}
                    </p>
                  </div>
                  {isLoadingTeam && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                </div>

                <div className="mt-4 space-y-2">
                  {!isOrganization ? (
                    <PersonalWorkspaceRow userName={user?.fullName ?? user?.username ?? "You"} />
                  ) : members.length > 0 ? (
                    members.map((member) => {
                      const userData = member.publicUserData;
                      const isCurrentUser = userData?.userId === user?.id;
                      const isAdmin = member.role === "org:admin" || member.role === "admin";
                      const canRemove = canManage && !isCurrentUser;
                      const canChangeRole = canManage && !isCurrentUser;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 bg-cover bg-center text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950"
                              style={userData?.imageUrl ? { backgroundImage: `url(${userData.imageUrl})` } : undefined}
                            >
                              {!userData?.imageUrl && memberInitial(member)}
                            </span>
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <strong className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                  {memberName(member)}
                                </strong>
                                {isCurrentUser && (
                                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    You
                                  </span>
                                )}
                              </span>
                              <small className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {[userData?.identifier, formatJoinDate(member.createdAt)].filter(Boolean).join(" - ")}
                              </small>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-200">
                              {isAdmin ? <Crown className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                              {member.roleName || roleTitle(member.role)}
                            </span>
                            {canChangeRole && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-xl"
                                disabled={workingMemberId === member.id}
                                onClick={() => void updateRole(member, isAdmin ? "org:member" : "org:admin")}
                              >
                                {isAdmin ? "Make member" : "Make admin"}
                              </Button>
                            )}
                            {canRemove && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-xl px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                                disabled={workingMemberId === member.id}
                                onClick={() => void removeMember(member)}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      {isLoadingTeam ? "Loading members..." : "No members found."}
                    </div>
                  )}
                </div>
              </section>

              {canManage ? (
                <aside className="space-y-4">
                  <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                    <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Invite</h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Send a Clerk invitation with the right role.
                    </p>

                    <form onSubmit={sendInvite} className="mt-4 space-y-3">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                        disabled={!isOrganization || isSendingInvite}
                      />
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                        disabled={!isOrganization || isSendingInvite}
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
                      >
                        <option value="org:member">Member</option>
                        <option value="org:admin">Admin</option>
                      </select>
                      <Button
                        type="submit"
                        className="w-full rounded-xl"
                        disabled={!isOrganization || isSendingInvite || !inviteEmail.trim()}
                      >
                        {isSendingInvite ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                        Send invite
                      </Button>
                    </form>
                  </section>

                  <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                    <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Pending</h2>
                    <div className="mt-3 space-y-2">
                      {invitations.length > 0 ? (
                        invitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                                {invitation.emailAddress}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                {invitation.roleName || roleTitle(invitation.role)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-xl px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                              disabled={workingInviteId === invitation.id}
                              onClick={() => void revokeInvite(invitation)}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          No pending invitations.
                        </div>
                      )}
                    </div>
                  </section>
                </aside>
              ) : (
                <aside>
                  <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                    <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Viewing access</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                      Members can see who belongs to this workspace. Invites, removals, and role changes are handled by admins.
                    </p>
                  </section>
                </aside>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WorkspaceStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
      {detail ? (
        <p className="mt-1 truncate text-[11px] text-zinc-400 dark:text-zinc-500">{detail}</p>
      ) : null}
    </div>
  );
}

function PersonalWorkspaceRow({ userName }: { userName: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
        {userName.trim().charAt(0).toUpperCase() || "N"}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {userName}
        </strong>
        <small className="text-xs text-zinc-500 dark:text-zinc-400">Personal owner</small>
      </span>
    </div>
  );
}
