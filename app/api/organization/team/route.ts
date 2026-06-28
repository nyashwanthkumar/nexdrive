import { auth, clerkClient } from "@clerk/nextjs/server";

function isOrgAdmin(role: string | null | undefined) {
  return role === "org:admin" || role === "admin";
}

export async function GET() {
  const { orgId, orgRole, userId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Organization session is required" }, { status: 401 });
  }

  const client = await clerkClient();
  const [membersResponse, invitationsResponse] = await Promise.all([
    client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
      orderBy: "+created_at",
    }),
    isOrgAdmin(orgRole)
      ? client.organizations.getOrganizationInvitationList({
          organizationId: orgId,
          limit: 50,
          status: ["pending"],
        })
      : Promise.resolve({ data: [], totalCount: 0 }),
  ]);

  return Response.json({
    canManage: isOrgAdmin(orgRole),
    joinedCount: membersResponse.totalCount ?? membersResponse.data.length,
    pendingCount: isOrgAdmin(orgRole)
      ? invitationsResponse.totalCount ?? invitationsResponse.data.length
      : 0,
    members: membersResponse.data.map((member) => ({
      id: member.id,
      role: member.role,
      roleName: member.role === "org:admin" ? "Admin" : "Member",
      createdAt: member.createdAt,
      publicUserData: member.publicUserData
        ? {
            firstName: member.publicUserData.firstName,
            lastName: member.publicUserData.lastName,
            imageUrl: member.publicUserData.imageUrl,
            identifier: member.publicUserData.identifier,
            userId: member.publicUserData.userId,
          }
        : null,
    })),
    invitations: invitationsResponse.data.map((invitation) => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      roleName: invitation.roleName,
      status: invitation.status ?? "pending",
      createdAt: invitation.createdAt,
    })),
  });
}
