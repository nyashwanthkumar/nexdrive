import { auth, clerkClient } from "@clerk/nextjs/server";

function isOrgAdmin(role: string | null | undefined) {
  return role === "org:admin" || role === "admin";
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { orgId, orgRole, userId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Organization session is required" }, { status: 401 });
  }

  if (!isOrgAdmin(orgRole)) {
    return Response.json({ error: "Only organization admins can revoke invitations" }, { status: 403 });
  }

  const { invitationId } = await params;
  if (!invitationId) {
    return Response.json({ error: "Invitation is required" }, { status: 400 });
  }

  const client = await clerkClient();
  await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId,
    requestingUserId: userId,
  });

  return Response.json({ ok: true });
}
