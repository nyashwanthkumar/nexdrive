export type ViewType =
  | "recent"
  | "starred"
  | "folders"
  | "images"
  | "videos"
  | "music"
  | "documents"
  | "pdfs"
  | "trash"
  | "activity";

export type DisplayMode = "grid" | "list";
export type SortMode = "newest" | "oldest" | "nameAsc" | "nameDesc";

type ViewMeta = {
  label: string;
  description: string;
};

export function getViewMeta(view: ViewType, currentFolderName?: string | null): ViewMeta {
  if (view === "folders" && currentFolderName) {
    return {
      label: currentFolderName,
      description: "Files inside this folder",
    };
  }

  const featureMeta: Record<ViewType, ViewMeta> = {
    recent: { label: "Recent", description: "Latest files in this workspace" },
    starred: { label: "Starred", description: "Files you have starred" },
    folders: { label: "Folders", description: "Create folders and organize files" },
    images: { label: "Images", description: "Image files in this workspace" },
    videos: { label: "Videos", description: "Video files in this workspace" },
    music: { label: "Music", description: "Audio files in this workspace" },
    documents: { label: "Documents", description: "Documents in this workspace" },
    pdfs: { label: "PDFs", description: "PDF files in this workspace" },
    trash: { label: "Trash", description: "Restore or permanently remove deleted files" },
    activity: { label: "Recent activity", description: "Latest file changes in this workspace" },
  };

  return featureMeta[view];
}
