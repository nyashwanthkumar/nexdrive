import { auth, clerkClient } from "@clerk/nextjs/server";

type InvitePayload = {
  emailAddress?: string;
  role?: string;
};

function isOrgAdmin(role: string | null | undefined) {
  return role === "org:admin" || role === "admin";
}

export async function POST(request: Request) {
  const { orgId, orgRole, userId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Organization session is required" }, { status: 401 });
  }

  if (!isOrgAdmin(orgRole)) {
    return Response.json({ error: "Only organization admins can invite members" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as InvitePayload | null;
  const emailAddress = body?.emailAddress?.trim();
  const role = body?.role === "org:admin" ? "org:admin" : "org:member";

  if (!emailAddress) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const client = await clerkClient();
  const origin = new URL(request.url).origin;

  await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress,
    role,
    inviterUserId: userId,
    redirectUrl: `${origin}/dashboard?join_org=${encodeURIComponent(orgId)}`,
  });

  return Response.json({ ok: true });
}
