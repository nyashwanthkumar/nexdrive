import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

function getRole(orgRole: unknown) {
  return typeof orgRole === "string" ? orgRole : null;
}

function isOrgAdmin(orgRole: unknown) {
  const role = getRole(orgRole);
  return role === "org:admin" || role === "admin";
}

function isOrgMember(orgRole: unknown) {
  const role = getRole(orgRole);
  return role === "org:member" || role === "member";
}

function isPersonalWorkspace(orgId: string) {
  return orgId.startsWith("user_");
}

function getActiveWorkspaceIds(identity: { subject: string } & Record<string, unknown>) {
  return [
    typeof identity.orgId === "string" ? identity.orgId : null,
    typeof identity.org_id === "string" ? identity.org_id : null,
    typeof identity.organizationId === "string" ? identity.organizationId : null,
    typeof identity.organization_id === "string" ? identity.organization_id : null,
  ].filter((value): value is string => !!value);
}

function canAccessWorkspace(
  orgId: string,
  identity: { subject: string } & Record<string, unknown>,
  actorRole?: string
) {
  if (isPersonalWorkspace(orgId)) {
    return orgId === identity.subject;
  }

  const activeWorkspaceIds = getActiveWorkspaceIds(identity);

  if (activeWorkspaceIds.length > 0) {
    return activeWorkspaceIds.includes(orgId);
  }

  return (
    isOrgAdminActor(identity, actorRole) ||
    isOrgMember(identity.orgRole) ||
    isOrgMember(identity.org_role) ||
    isOrgMember(actorRole)
  );
}

function isOrgAdminActor(identity: Record<string, unknown>, actorRole?: string) {
  return isOrgAdmin(identity.orgRole) || isOrgAdmin(identity.org_role) || isOrgAdmin(actorRole);
}

function assertOrgAdminForMutation(
  orgId: string,
  identity: { subject: string } & Record<string, unknown>,
  actorRole: string | undefined,
  message: string
) {
  if (!isPersonalWorkspace(orgId) && !isOrgAdminActor(identity, actorRole)) {
    throw new Error(message);
  }
}

function isFileOwner(file: { userId?: string; orgId: string }, identity: { subject: string }) {
  return (file.userId ?? "") === identity.subject || file.orgId === identity.subject;
}

function isFolderOwner(folder: { userId?: string; orgId: string }, identity: { subject: string }) {
  return (folder.userId ?? "") === identity.subject || folder.orgId === identity.subject;
}

async function logFileActivity(
  ctx: MutationCtx,
  args: {
    orgId: string;
    userId: string;
    action: "uploaded" | "renamed" | "trashed" | "restored" | "shared" | "revoked_share";
    fileId?: Id<"files">;
    fileName: string;
  }
) {
  await ctx.db.insert("activityLogs", {
    ...args,
    createdAt: Date.now(),
  });
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const createFile = mutation({
  args: {
    name: v.string(),
    orgId: v.string(),
    fileId: v.id("_storage"),
    folderId: v.optional(v.id("folders")),
    size: v.optional(v.number()),
    actorRole: v.optional(v.string()),
    type: v.union(
      v.literal("image"),
      v.literal("pdf"),
      v.literal("document"),
      v.literal("spreadsheet"),
      v.literal("audio"),
      v.literal("video")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    if (!canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this workspace");
    }

    assertOrgAdminForMutation(
      args.orgId,
      identity,
      args.actorRole,
      "Only organization admins can upload files"
    );

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);

      if (!folder || folder.orgId !== args.orgId) {
        throw new Error("Folder not found in this workspace");
      }
    }

    const newFileId = await ctx.db.insert("files", {
      name: args.name,
      orgId: args.orgId,
      userId: identity.subject,
      fileId: args.fileId,
      folderId: args.folderId,
      size: args.size,
      type: args.type,
      isFavorite: false,
      shouldDelete: false,
      deletedAt: undefined,
    });

    await logFileActivity(ctx, {
      orgId: args.orgId,
      userId: identity.subject,
      action: "uploaded",
      fileId: newFileId,
      fileName: args.name,
    });
  },
});

export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const personalWorkspace = isPersonalWorkspace(file.orgId);
    const owner = isFileOwner(file, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(file.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this file");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only delete your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can move files to trash");
      }
    }

    await ctx.db.patch(args.fileId, {
      shouldDelete: true,
      deletedAt: Date.now(),
    });

    await logFileActivity(ctx, {
      orgId: file.orgId,
      userId: identity.subject,
      action: "trashed",
      fileId: args.fileId,
      fileName: file.name,
    });
  },
});

export const restoreFile = mutation({
  args: {
    fileId: v.id("files"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const personalWorkspace = isPersonalWorkspace(file.orgId);
    const owner = isFileOwner(file, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(file.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this file");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only restore your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can restore files");
      }
    }

    await ctx.db.patch(args.fileId, {
      shouldDelete: false,
      deletedAt: undefined,
    });

    await logFileActivity(ctx, {
      orgId: file.orgId,
      userId: identity.subject,
      action: "restored",
      fileId: args.fileId,
      fileName: file.name,
    });
  },
});

export const permanentlyDeleteFile = mutation({
  args: {
    fileId: v.id("files"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const personalWorkspace = isPersonalWorkspace(file.orgId);
    const owner = isFileOwner(file, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(file.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this file");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only permanently delete your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can permanently delete files");
      }
    }

    await ctx.storage.delete(file.fileId);
    await ctx.db.delete(args.fileId);
  },
});

export const toggleFavorite = mutation({
  args: {
    fileId: v.id("files"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    if (!canAccessWorkspace(file.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this file");
    }

    assertOrgAdminForMutation(
      file.orgId,
      identity,
      args.actorRole,
      "Only organization admins can update files"
    );

    await ctx.db.patch(args.fileId, {
      isFavorite: !(file.isFavorite ?? false),
    });
  },
});

export const createFolder = mutation({
  args: {
    name: v.string(),
    orgId: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    if (!canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this workspace");
    }

    assertOrgAdminForMutation(
      args.orgId,
      identity,
      args.actorRole,
      "Only organization admins can create folders"
    );

    const name = args.name.trim();

    if (!name) {
      throw new Error("Folder name is required");
    }

    if (name.length > 100) {
      throw new Error("Folder name is too long");
    }

    await ctx.db.insert("folders", {
      name,
      orgId: args.orgId,
      userId: identity.subject,
      isFavorite: false,
      shouldDelete: false,
      deletedAt: undefined,
    });
  },
});

export const getFolders = query({
  args: {
    orgId: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    if (!canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      return [];
    }

    return await ctx.db
      .query("folders")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect()
      .then((folders) =>
        folders.map((folder) => ({
          ...folder,
          isFavorite: folder.isFavorite ?? false,
          shouldDelete: folder.shouldDelete ?? false,
        }))
      );
  },
});

export const toggleFavoriteFolder = mutation({
  args: {
    folderId: v.id("folders"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const folder = await ctx.db.get(args.folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }

    if (!canAccessWorkspace(folder.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this folder");
    }

    assertOrgAdminForMutation(
      folder.orgId,
      identity,
      args.actorRole,
      "Only organization admins can update folders"
    );

    await ctx.db.patch(args.folderId, {
      isFavorite: !(folder.isFavorite ?? false),
    });
  },
});

export const deleteFolder = mutation({
  args: {
    folderId: v.id("folders"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const folder = await ctx.db.get(args.folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }

    const personalWorkspace = isPersonalWorkspace(folder.orgId);
    const owner = isFolderOwner(folder, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(folder.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this folder");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only delete your own folders");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can delete folders");
      }
    }

    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("folderId"), args.folderId))
      .collect();

    for (const file of files) {
      await ctx.db.patch(file._id, {
        folderId: undefined,
      });
    }

    await ctx.db.patch(args.folderId, {
      shouldDelete: true,
      deletedAt: Date.now(),
    });

    await logFileActivity(ctx, {
      orgId: folder.orgId,
      userId: identity.subject,
      action: "trashed",
      fileName: folder.name,
    });
  },
});

export const restoreFolder = mutation({
  args: {
    folderId: v.id("folders"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const folder = await ctx.db.get(args.folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }

    const personalWorkspace = isPersonalWorkspace(folder.orgId);
    const owner = isFolderOwner(folder, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(folder.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this folder");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only restore your own folders");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can restore folders");
      }
    }

    await ctx.db.patch(args.folderId, {
      shouldDelete: false,
      deletedAt: undefined,
    });

    await logFileActivity(ctx, {
      orgId: folder.orgId,
      userId: identity.subject,
      action: "restored",
      fileName: folder.name,
    });
  },
});

export const permanentlyDeleteFolder = mutation({
  args: {
    folderId: v.id("folders"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const folder = await ctx.db.get(args.folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }

    const personalWorkspace = isPersonalWorkspace(folder.orgId);
    const owner = isFolderOwner(folder, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(folder.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this folder");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only permanently delete your own folders");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can permanently delete folders");
      }
    }

    await ctx.db.delete(args.folderId);
  },
});

export const renameFile = mutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const name = args.name.trim();

    if (!name) {
      throw new Error("Name is required");
    }

    if (name.length > 200) {
      throw new Error("Name is too long");
    }

    const personalWorkspace = isPersonalWorkspace(file.orgId);
    const owner = isFileOwner(file, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(file.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this file");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only rename your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can rename files");
      }
    }

    await ctx.db.patch(args.fileId, {
      name,
    });

    await logFileActivity(ctx, {
      orgId: file.orgId,
      userId: identity.subject,
      action: "renamed",
      fileId: args.fileId,
      fileName: name,
    });
  },
});

export const renameFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const folder = await ctx.db.get(args.folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }

    const name = args.name.trim();

    if (!name) {
      throw new Error("Name is required");
    }

    if (name.length > 100) {
      throw new Error("Name is too long");
    }

    const personalWorkspace = isPersonalWorkspace(folder.orgId);
    const owner = isFolderOwner(folder, identity);
    const admin = isOrgAdminActor(identity, args.actorRole);

    if (!canAccessWorkspace(folder.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this folder");
    }

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only rename your own folders");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only organization admins can rename folders");
      }
    }

    await ctx.db.patch(args.folderId, {
      name,
    });
  },
});

export const createShareLink = mutation({
  args: {
    fileId: v.id("files"),
    token: v.string(),
    expiresAt: v.number(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    if (!canAccessWorkspace(file.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this file");
    }

    assertOrgAdminForMutation(
      file.orgId,
      identity,
      args.actorRole,
      "Only organization admins can create share links"
    );

    if (file.shouldDelete) {
      throw new Error("Restore this file before sharing it");
    }

    if (args.expiresAt <= Date.now()) {
      throw new Error("Expiration must be in the future");
    }

    const token = args.token.trim();

    if (token.length < 24) {
      throw new Error("Share token is too short");
    }

    await ctx.db.insert("shareLinks", {
      fileId: args.fileId,
      token,
      orgId: file.orgId,
      createdBy: identity.subject,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    await logFileActivity(ctx, {
      orgId: file.orgId,
      userId: identity.subject,
      action: "shared",
      fileId: args.fileId,
      fileName: file.name,
    });
  },
});

export const getSharedFile = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!share || share.revokedAt || share.expiresAt <= Date.now()) {
      return null;
    }

    const file = await ctx.db.get(share.fileId);

    if (!file || file.shouldDelete) {
      return null;
    }

    return {
      name: file.name,
      type: file.type,
      expiresAt: share.expiresAt,
      url: await ctx.storage.getUrl(file.fileId),
    };
  },
});

export const getShareLinks = query({
  args: {
    orgId: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      return [];
    }

    const shares = await ctx.db
      .query("shareLinks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    const now = Date.now();

    return (
      await Promise.all(
        shares.map(async (share) => {
          const file = await ctx.db.get(share.fileId);

          if (!file) return null;

          return {
            ...share,
            fileName: file.name,
            fileType: file.type,
            isExpired: share.expiresAt <= now,
            isRevoked: !!share.revokedAt,
          };
        })
      )
    ).filter((share) => share !== null);
  },
});

export const revokeShareLink = mutation({
  args: {
    shareId: v.id("shareLinks"),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    const share = await ctx.db.get(args.shareId);

    if (!share) {
      throw new Error("Share link not found");
    }

    if (!canAccessWorkspace(share.orgId, identity, args.actorRole)) {
      throw new Error("You do not have access to this share link");
    }

    assertOrgAdminForMutation(
      share.orgId,
      identity,
      args.actorRole,
      "Only organization admins can revoke share links"
    );

    const file = await ctx.db.get(share.fileId);

    await ctx.db.patch(args.shareId, {
      revokedAt: Date.now(),
    });

    if (file) {
      await logFileActivity(ctx, {
        orgId: share.orgId,
        userId: identity.subject,
        action: "revoked_share",
        fileId: share.fileId,
        fileName: file.name,
      });
    }
  },
});

export const getStorageStats = query({
  args: {
    orgId: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      return null;
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeFiles = files.filter((file) => !(file.shouldDelete ?? false));
    const totalSize = activeFiles.reduce((sum, file) => sum + (file.size ?? 0), 0);
    const byType = activeFiles.reduce<Record<string, number>>((acc, file) => {
      acc[file.type] = (acc[file.type] ?? 0) + (file.size ?? 0);
      return acc;
    }, {});

    return {
      fileCount: activeFiles.length,
      totalSize,
      byType,
    };
  },
});

export const getActivityLogs = query({
  args: {
    orgId: v.string(),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      return [];
    }

    if (!isPersonalWorkspace(args.orgId) && !isOrgAdminActor(identity, args.actorRole)) {
      return [];
    }

    return await ctx.db
      .query("activityLogs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(30);
  },
});

export const getFiles = query({
  args: {
    orgId: v.string(),
    shouldDelete: v.optional(v.boolean()),
    actorRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    if (!canAccessWorkspace(args.orgId, identity, args.actorRole)) {
      return [];
    }

    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();

    const filteredFiles = files.filter((file) => {
      const isDeleted = file.shouldDelete ?? false;
      return isDeleted === (args.shouldDelete ?? false);
    });

    return await Promise.all(
      filteredFiles.map(async (file) => ({
        ...file,
        userId: file.userId ?? "",
        isFavorite: file.isFavorite ?? false,
        shouldDelete: file.shouldDelete ?? false,
        deletedAt: file.deletedAt,
        url: await ctx.storage.getUrl(file.fileId),
      }))
    );
  },
});

export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    return getRole(identity.orgRole) ?? getRole(identity.org_role);
  },
});

export const permanentlyDeleteOldFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("files").collect();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const shouldDelete = file.shouldDelete ?? false;
      const deletedAt = file.deletedAt;

      if (shouldDelete && deletedAt && now - deletedAt >= thirtyDays) {
        await ctx.storage.delete(file.fileId);
        await ctx.db.delete(file._id);
      }
    }
  },
});
