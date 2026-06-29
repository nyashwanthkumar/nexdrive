export type WorkspaceRole = "org:member" | "org:admin";

export type TeamMembership = {
  id: string;
  role: string;
  roleName?: string;
  createdAt?: number | string;
  publicUserData?: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    identifier: string;
    userId?: string;
    username?: string;
  } | null;
};

export type TeamInvitation = {
  id: string;
  emailAddress: string;
  role: string;
  roleName?: string;
  status: string;
  createdAt?: number | string;
};

export type OrganizationWorkspaceResource = {
  updateMember: (params: {
    userId: string;
    role: WorkspaceRole;
  }) => Promise<TeamMembership>;
  removeMember: (userId: string) => Promise<TeamMembership>;
};

export type OrganizationWorkspaceFeatureProps = {
  workspaceName: string;
  isOrganization: boolean;
  canManage: boolean;
  fileCount: number;
  activeShares: number;
};
