import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
  files: defineTable({
    name: v.string(),
    orgId: v.string(),
    userId: v.optional(v.string()),
    fileId: v.id("_storage"),
    folderId: v.optional(v.id("folders")),
    size: v.optional(v.number()),
    type: v.union(
      v.literal("image"),
      v.literal("pdf"),
      v.literal("document"),
      v.literal("spreadsheet"),
      v.literal("audio"),
      v.literal("video")
    ),
    isFavorite: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    shouldDelete: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  }).index("by_org", ["orgId"]),
  folders: defineTable({
    name: v.string(),
    orgId: v.string(),
    userId: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    shouldDelete: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  }).index("by_org", ["orgId"]),
  shareLinks: defineTable({
    fileId: v.id("files"),
    token: v.string(),
    orgId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"]),
  activityLogs: defineTable({
    orgId: v.string(),
    userId: v.string(),
    action: v.union(
      v.literal("uploaded"),
      v.literal("renamed"),
      v.literal("trashed"),
      v.literal("restored"),
      v.literal("shared"),
      v.literal("revoked_share")
    ),
    fileId: v.optional(v.id("files")),
    fileName: v.string(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),
});
