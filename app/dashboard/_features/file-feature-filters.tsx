import type { Id } from "@/convex/_generated/dataModel";
import type { SortMode, ViewType } from "./feature-types";

type FileItem = {
  _id: Id<"files">;
  _creationTime: number;
  name: string;
  orgId: string;
  userId?: string;
  type: string;
  size?: number;
  url?: string | null;
  isFavorite?: boolean;
  folderId?: Id<"folders">;
};

type FolderItem = {
  _id: Id<"folders">;
  name: string;
  orgId: string;
  userId?: string;
  shouldDelete?: boolean;
  isFavorite?: boolean;
  deletedAt?: number;
};

export function getDisplayedFiles(params: {
  activeFiles: FileItem[];
  trashFiles: FileItem[];
  search: string;
  activeView: ViewType;
  sortMode: SortMode;
  currentFolderId: Id<"folders"> | null;
}): FileItem[] {
  const { activeFiles, trashFiles, search, activeView, sortMode, currentFolderId } = params;
  const files = activeView === "trash" ? trashFiles : activeFiles;

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase());
    const matchesFolder =
      activeView === "recent" || activeView === "starred" || activeView === "trash"
        ? true
        : currentFolderId
        ? file.folderId === currentFolderId
        : !file.folderId;

    if (activeView === "starred") return matchesSearch && file.isFavorite;
    if (activeView === "activity") return false;
    if (activeView === "folders") {
      return currentFolderId ? matchesSearch && matchesFolder : false;
    }
    if (activeView === "images") return matchesSearch && file.type === "image";
    if (activeView === "videos") return matchesSearch && file.type === "video";
    if (activeView === "music") return matchesSearch && file.type === "audio";
    if (activeView === "documents") {
      return matchesSearch && ["document", "spreadsheet"].includes(file.type);
    }
    if (activeView === "pdfs") return matchesSearch && file.type === "pdf";
    return matchesSearch && matchesFolder;
  });

  return [...filteredFiles].sort((a, b) => {
    if (sortMode === "oldest") return a._creationTime - b._creationTime;
    if (sortMode === "nameAsc") return a.name.localeCompare(b.name);
    if (sortMode === "nameDesc") return b.name.localeCompare(a.name);
    return b._creationTime - a._creationTime;
  });
}

export function getVisibleFolders(params: {
  activeView: ViewType;
  currentFolderId: Id<"folders"> | null;
  folders: FolderItem[];
  search: string;
}): FolderItem[] {
  const { activeView, currentFolderId, folders, search } = params;

  if (activeView === "folders" && !currentFolderId) {
    return [...folders]
      .filter(
        (folder) =>
          !(folder.shouldDelete ?? false) &&
          folder.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (activeView === "starred") {
    return [...folders]
      .filter(
        (folder) =>
          !(folder.shouldDelete ?? false) &&
          (folder.isFavorite ?? false) &&
          folder.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return [];
}
