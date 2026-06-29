"use client";

import { useAuth, useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useOrganizationInviteHandoff() {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId: activeOrgId } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const {
    isLoaded: isOrganizationListLoaded,
    setActive,
    userMemberships,
  } = useOrganizationList({
    userMemberships: true,
  });
  const [isResolvingInviteWorkspace, setIsResolvingInviteWorkspace] = useState(false);
  const inviteWorkspaceCheckKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      !isOrganizationListLoaded ||
      !setActive ||
      isResolvingInviteWorkspace
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const invitedOrgId = params.get("join_org");
    const inviteCheckKey = `${user?.id ?? "unknown"}:${invitedOrgId ?? "single-pending"}`;
    if (inviteWorkspaceCheckKeyRef.current === inviteCheckKey) return;
    inviteWorkspaceCheckKeyRef.current = inviteCheckKey;

    const currentOrgId = organization?.id ?? activeOrgId ?? null;
    if (invitedOrgId && currentOrgId === invitedOrgId) {
      window.history.replaceState(null, "", "/dashboard");
      return;
    }

    const activateOrganization = setActive;
    let cancelled = false;

    async function resolveInviteWorkspace() {
      try {
        setIsResolvingInviteWorkspace(true);
        const memberships = userMemberships.data ?? [];
        const invitedMembership = invitedOrgId
          ? memberships.find((membership) => membership.organization.id === invitedOrgId)
          : undefined;

        if (invitedMembership) {
          await activateOrganization({
            organization: invitedMembership.organization.id,
            navigate: async ({ decorateUrl }) => {
              window.location.replace(decorateUrl("/dashboard"));
            },
          });
          return;
        }

        if (!user) return;

        const invitations = await user.getOrganizationInvitations({ status: "pending" });
        const pendingInvites = invitations.data ?? [];
        const pendingInvite = invitedOrgId
          ? pendingInvites.find((invite) => invite.publicOrganizationData.id === invitedOrgId)
          : pendingInvites.length === 1
          ? pendingInvites[0]
          : undefined;

        if (!pendingInvite) return;

        const nextOrgId = pendingInvite.publicOrganizationData.id;
        const nextOrgName = pendingInvite.publicOrganizationData.name;

        await pendingInvite.accept();
        await user.reload();
        await activateOrganization({
          organization: nextOrgId,
          navigate: async ({ decorateUrl }) => {
            window.location.replace(decorateUrl("/dashboard"));
          },
        });

        if (!cancelled) {
          window.history.replaceState(null, "", "/dashboard");
          router.refresh();
          toast.success(`Joined ${nextOrgName}`);
        }
      } catch (error) {
        console.error("Failed to accept invited organization", error);
        if (!cancelled) toast.error("Invite could not be accepted. Try the invite link again.");
      } finally {
        if (!cancelled) setIsResolvingInviteWorkspace(false);
      }
    }

    if (invitedOrgId || user) {
      void resolveInviteWorkspace();
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeOrgId,
    isLoaded,
    isOrganizationListLoaded,
    isResolvingInviteWorkspace,
    isSignedIn,
    organization?.id,
    router,
    setActive,
    user,
    userMemberships.data,
  ]);
}
