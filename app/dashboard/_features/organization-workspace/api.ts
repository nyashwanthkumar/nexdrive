import type { TeamInvitation, TeamMembership, WorkspaceRole } from "./types";

type ApiErrorPayload = {
  error?: string;
};

export type OrganizationTeamPayload = {
  joinedCount?: number;
  pendingCount?: number;
  members?: TeamMembership[];
  invitations?: TeamInvitation[];
};

async function readApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  return new Error(payload?.error || fallback);
}

export async function fetchOrganizationTeam() {
  const response = await fetch("/api/organization/team", {
    method: "GET",
  });

  if (!response.ok) {
    throw await readApiError(response, "Could not load team");
  }

  return (await response.json()) as OrganizationTeamPayload;
}

export async function sendOrganizationInvite(emailAddress: string, role: WorkspaceRole) {
  const response = await fetch("/api/organization/invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailAddress,
      role,
    }),
  });

  if (!response.ok) {
    throw await readApiError(response, "Failed to send invite");
  }
}

export async function revokeOrganizationInvite(invitationId: string) {
  const response = await fetch(`/api/organization/invitations/${invitationId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readApiError(response, "Failed to revoke invitation");
  }
}
