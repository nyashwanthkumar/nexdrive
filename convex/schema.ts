import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    name: v.string(),
    orgId: v.string(),
    userId: v.optional(v.string()),
    fileId: v.id("_storage"),
    folderId: v.optional(v.id("folders")),
    type: v.union(
      v.literal("image"),
      v.literal("pdf"),
      v.literal("document"),
      v.literal("spreadsheet"),
      v.literal("audio"),
      v.literal("video")
    ),
    isFavorite: v.optional(v.boolean()),
    shouldDelete: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  }),
  folders: defineTable({
    name: v.string(),
    orgId: v.string(),
    userId: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
  }),
});
