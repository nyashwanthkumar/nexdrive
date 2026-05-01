import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

function getRole(orgRole: unknown) {
  return typeof orgRole === "string" ? orgRole : null;
}

function isOrgAdmin(orgRole: unknown) {
  const role = getRole(orgRole);
  return role === "org:admin" || role === "admin";
}

function isPersonalWorkspace(orgId: string) {
  return orgId.startsWith("user_");
}

function isFileOwner(file: { userId?: string; orgId: string }, identity: { subject: string }) {
  return (file.userId ?? "") === identity.subject || file.orgId === identity.subject;
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
    type: v.union(v.literal("image"), v.literal("csv"), v.literal("pdf")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("you must be logged in");
    }

    await ctx.db.insert("files", {
      name: args.name,
      orgId: args.orgId,
      userId: identity.subject,
      fileId: args.fileId,
      type: args.type,
      isFavorite: false,
      shouldDelete: false,
      deletedAt: undefined,
    });
  },
});

export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
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
    const admin = isOrgAdmin(identity.orgRole);

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only delete your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only the uploader or organization admin can move files to trash");
      }
    }

    await ctx.db.patch(args.fileId, {
      shouldDelete: true,
      deletedAt: Date.now(),
    });
  },
});

export const restoreFile = mutation({
  args: {
    fileId: v.id("files"),
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
    const admin = isOrgAdmin(identity.orgRole);

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only restore your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only the uploader or organization admin can restore files");
      }
    }

    await ctx.db.patch(args.fileId, {
      shouldDelete: false,
      deletedAt: undefined,
    });
  },
});

export const permanentlyDeleteFile = mutation({
  args: {
    fileId: v.id("files"),
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
    const admin = isOrgAdmin(identity.orgRole);

    if (personalWorkspace) {
      if (!owner) {
        throw new Error("You can only permanently delete your own files");
      }
    } else {
      if (!admin && !owner) {
        throw new Error("Only the uploader or organization admin can permanently delete files");
      }
    }

    await ctx.storage.delete(file.fileId);
    await ctx.db.delete(args.fileId);
  },
});

export const toggleFavorite = mutation({
  args: {
    fileId: v.id("files"),
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

    await ctx.db.patch(args.fileId, {
      isFavorite: !(file.isFavorite ?? false),
    });
  },
});

export const getFiles = query({
  args: {
    orgId: v.string(),
    shouldDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
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

    return getRole(identity.orgRole);
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
