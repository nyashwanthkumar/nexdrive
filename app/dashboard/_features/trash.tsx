import type { Id } from "@/convex/_generated/dataModel";

type FolderItem = {
  _id: Id<"folders">;
  name: string;
  orgId: string;
  userId?: string;
  shouldDelete?: boolean;
  isFavorite?: boolean;
  isPinned?: boolean;
  deletedAt?: number;
};

export function getVisibleTrashFolders(folders: FolderItem[], search: string): FolderItem[] {
  return [...folders]
    .filter(
      (folder) =>
        (folder.shouldDelete ?? false) &&
        folder.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}
