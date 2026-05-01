import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    name: v.string(),
    orgId: v.string(),
    userId: v.optional(v.string()),
    fileId: v.id("_storage"),
    type: v.union(v.literal("image"), v.literal("csv"), v.literal("pdf")),
    isFavorite: v.optional(v.boolean()),
    shouldDelete: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  }),
});
