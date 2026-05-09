"use client";

import { useOrganization, useUser, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UploadButton } from "./_components/upload-button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Activity,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUpDown,
  Building2,
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Grid2X2,
  ImageIcon,
  List,
  Link2,
  Loader2,
  MoreVertical,
  Music,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ViewType =
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
type DisplayMode = "grid" | "list";
type SortMode = "newest" | "oldest" | "nameAsc" | "nameDesc";

type FileItem = {
  _id: Id<"files">;
  _creationTime: number;
  name: string;
  orgId: string;
  userId?: string;
  type: string;
  url?: string | null;
  isFavorite?: boolean;
  folderId?: Id<"folders">;
};

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { organization } = useOrganization();
  const { user } = useUser();

  const deleteFile = useMutation(api.files.deleteFile);
  const restoreFile = useMutation(api.files.restoreFile);
  const permanentlyDeleteFile = useMutation(api.files.permanentlyDeleteFile);
  const toggleFavorite = useMutation(api.files.toggleFavorite);
  const renameFile = useMutation(api.files.renameFile);
  const createFolder = useMutation(api.files.createFolder);
  const deleteFolder = useMutation(api.files.deleteFolder);
  const renameFolder = useMutation(api.files.renameFolder);
  const toggleFavoriteFolder = useMutation(api.files.toggleFavoriteFolder);
  const createShareLink = useMutation(api.files.createShareLink);

  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<ViewType>("recent");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<{
    id: Id<"folders">;
    name: string;
  } | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | null>(null);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderMenuId, setFolderMenuId] = useState<Id<"folders"> | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<Id<"folders"> | null>(null);
  const [folderPendingDelete, setFolderPendingDelete] = useState<{
    id: Id<"folders">;
    name: string;
  } | null>(null);
  const [sharingFile, setSharingFile] = useState<FileItem | null>(null);
  const [shareDuration, setShareDuration] = useState("24");
  const [shareUrl, setShareUrl] = useState("");
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);

  const orgId = organization?.id ?? user?.id;

  const activeFiles = useQuery(
    api.files.getFiles,
    orgId ? { orgId, shouldDelete: false } : "skip"
  );

  const trashFiles = useQuery(
    api.files.getFiles,
    orgId ? { orgId, shouldDelete: true } : "skip"
  );

  const folders = useQuery(
    api.files.getFolders,
    orgId ? { orgId } : "skip"
  );

  const userRole = useQuery(api.files.getUserRole, orgId ? {} : "skip");
  const activityLogs = useQuery(
    api.files.getActivityLogs,
    orgId ? { orgId } : "skip"
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewFile(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-folder-menu]")) {
        setFolderMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const isLoading = activeFiles === undefined || trashFiles === undefined || folders === undefined;
  const currentFolder = folders?.find((folder) => folder._id === currentFolderId);

  const displayedFiles = useMemo(() => {
    const files = activeView === "trash" ? trashFiles ?? [] : activeFiles ?? [];
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
  }, [activeFiles, trashFiles, search, activeView, sortMode, currentFolderId]);

  const workspaceTitle = organization ? organization.name : "Personal";

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  function FileTypeIcon({ type }: { type: string }) {
    if (type === "image") return <ImageIcon className="h-7 w-7 text-sky-500" />;
    if (type === "pdf") return <FileText className="h-7 w-7 text-red-500" />;
    if (type === "spreadsheet") return <FileSpreadsheet className="h-7 w-7 text-emerald-500" />;
    if (type === "document") return <FileText className="h-7 w-7 text-indigo-500" />;
    if (type === "audio") return <Music className="h-7 w-7 text-fuchsia-500" />;
    if (type === "video") return <Video className="h-7 w-7 text-orange-500" />;
    return <FolderOpen className="h-7 w-7 text-zinc-400" />;
  }

  const viewMeta = {
    recent: { label: "Recent", description: "Latest files in this workspace" },
    starred: { label: "Starred", description: "Files you have starred" },
    folders: {
      label: currentFolder ? currentFolder.name : "Folders",
      description: currentFolder ? "Files inside this folder" : "Create folders and organize files",
    },
    images: { label: "Images", description: "Image files in this workspace" },
    videos: { label: "Videos", description: "Video files in this workspace" },
    music: { label: "Music", description: "Audio files in this workspace" },
    documents: { label: "Documents", description: "Documents in this workspace" },
    pdfs: { label: "PDFs", description: "PDF files in this workspace" },
    trash: { label: "Trash", description: "Restore or permanently remove deleted files" },
    activity: { label: "Recent activity", description: "Latest file changes in this workspace" },
  }[activeView];

  const visibleFolders =
    activeView === "folders" && !currentFolderId
      ? [...(folders ?? [])]
          .filter((folder) => folder.name.toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name))
      : activeView === "starred"
      ? [...(folders ?? [])]
          .filter(
            (folder) =>
              (folder.isFavorite ?? false) &&
              folder.name.toLowerCase().includes(search.toLowerCase())
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

  function openRenameDialog(file: FileItem) {
    setRenamingFile(file);
    setRenameValue(file.name);
  }

  async function submitRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renamingFile) return;

    const nextName = renameValue.trim();
    if (!nextName) {
      toast.error("Name is required");
      return;
    }

    try {
      setIsRenaming(true);
      await renameFile({ fileId: renamingFile._id, name: nextName });
      setRenamingFile(null);
      setRenameValue("");
      toast.success("File renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename");
    } finally {
      setIsRenaming(false);
    }
  }

  function openRenameFolderDialog(folder: { _id: Id<"folders">; name: string }) {
    setFolderMenuId(null);
    setRenamingFolder({ id: folder._id, name: folder.name });
    setFolderRenameValue(folder.name);
  }

  async function submitFolderRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renamingFolder) return;

    const nextName = folderRenameValue.trim();
    if (!nextName) {
      toast.error("Name is required");
      return;
    }

    try {
      setIsRenamingFolder(true);
      await renameFolder({ folderId: renamingFolder.id, name: nextName });
      setRenamingFolder(null);
      setFolderRenameValue("");
      toast.success("Folder renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename folder");
    } finally {
      setIsRenamingFolder(false);
    }
  }

  async function submitFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orgId) {
      toast.error("Organization or user not found");
      return;
    }

    try {
      setIsCreatingFolder(true);
      await createFolder({ name: folderName, orgId });
      setFolderName("");
      setIsFolderDialogOpen(false);
      toast.success("Folder created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleDeleteFolder() {
    if (!folderPendingDelete) return;
    try {
      setDeletingFolderId(folderPendingDelete.id);
      await deleteFolder({ folderId: folderPendingDelete.id });

      if (currentFolderId === folderPendingDelete.id) {
        setCurrentFolderId(null);
      }

      setFolderPendingDelete(null);
      toast.success("Folder deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete folder");
    } finally {
      setDeletingFolderId(null);
    }
  }

  async function handleToggleFolderFavorite(folderId: Id<"folders">, isFavorite: boolean) {
    try {
      setFolderMenuId(null);
      await toggleFavoriteFolder({ folderId });
      toast.success(isFavorite ? "Removed from starred" : "Added to starred");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update starred folder");
    }
  }

  function createToken() {
    const randomId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replaceAll("-", "")
        : Math.random().toString(36).slice(2);

    return `${randomId}${Math.random().toString(36).slice(2, 10)}`;
  }

  async function submitShareLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sharingFile) return;

    try {
      setIsCreatingShareLink(true);
      const token = createToken();
      const expiresAt = Date.now() + Number(shareDuration) * 60 * 60 * 1000;

      await createShareLink({
        fileId: sharingFile._id,
        token,
        expiresAt,
      });

      const url = `${window.location.origin}/share/${token}`;
      setShareUrl(url);
      await navigator.clipboard?.writeText(url);
      toast.success("Share link copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create share link");
    } finally {
      setIsCreatingShareLink(false);
    }
  }

  const isWorkspaceAdmin = userRole === "org:admin" || userRole === "admin";

  function canManageFile(file: FileItem) {
    if (!user?.id) return false;
    const owner = (file.userId ?? "") === user.id || file.orgId === user.id;
    return organization ? isWorkspaceAdmin || owner : owner;
  }

  function canManageFolder(folder: { orgId: string; userId?: string }) {
    if (!user?.id) return false;
    const owner = (folder.userId ?? "") === user.id || folder.orgId === user.id;
    return organization ? isWorkspaceAdmin || owner : owner;
  }

  return (
    <>
      <main className="min-h-[calc(100vh-64px)] bg-[#f6f7f9]">
        <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">

            {/* Sidebar */}
          <aside className="flex flex-col gap-3 border-b border-zinc-200/80 bg-white px-3 py-3 lg:border-b-0 lg:border-r lg:py-5">
            <div className="px-1 lg:mb-2">
              <UploadButton folders={folders ?? []} />
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
              <SidebarItem
                active={activeView === "recent"}
                icon={<Clock className="h-4 w-4" />}
                label="Recent"
                onClick={() => {
                  setActiveView("recent");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "starred"}
                icon={<Star className="h-4 w-4" />}
                label="Starred"
                onClick={() => {
                  setActiveView("starred");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "activity"}
                icon={<Activity className="h-4 w-4" />}
                label="Activity"
                onClick={() => {
                  setActiveView("activity");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "folders"}
                icon={<FolderOpen className="h-4 w-4" />}
                label="Folders"
                onClick={() => {
                  setActiveView("folders");
                  setCurrentFolderId(null);
                }}
              />
              <div className="hidden lg:my-3 lg:block lg:h-px lg:bg-zinc-100" />
              <SidebarItem
                active={activeView === "images"}
                icon={<ImageIcon className="h-4 w-4" />}
                label="Images"
                onClick={() => {
                  setActiveView("images");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "videos"}
                icon={<Video className="h-4 w-4" />}
                label="Videos"
                onClick={() => {
                  setActiveView("videos");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "music"}
                icon={<Music className="h-4 w-4" />}
                label="Music"
                onClick={() => {
                  setActiveView("music");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "documents"}
                icon={<FileText className="h-4 w-4" />}
                label="Documents"
                onClick={() => {
                  setActiveView("documents");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "pdfs"}
                icon={<FileText className="h-4 w-4" />}
                label="PDFs"
                onClick={() => {
                  setActiveView("pdfs");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItem
                active={activeView === "trash"}
                icon={<Trash2 className="h-4 w-4" />}
                label="Trash"
                onClick={() => {
                  setActiveView("trash");
                  setCurrentFolderId(null);
                }}
              />
            </nav>

            <div className="mt-auto hidden border-t border-zinc-100 pt-4 lg:block">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Workspace
              </p>
              <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                  {organization ? (
                    <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </div>
                <span className="truncate text-sm font-medium text-zinc-700">
                  {workspaceTitle}
                </span>
              </div>
            </div>
          </aside>

          {/* Content */}
          <section className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">

            {/* Search */}
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2.5 shadow-sm shadow-zinc-200/40">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-950">{viewMeta.label}</h1>
                <p className="mt-0.5 text-xs text-zinc-500">{viewMeta.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {activeView === "folders" && !currentFolderId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setIsFolderDialogOpen(true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Folder
                  </Button>
                )}
                {!isLoading && displayedFiles.length + visibleFolders.length > 0 && (
                  <span className="text-xs text-zinc-400">
                    {displayedFiles.length + visibleFolders.length}{" "}
                    {displayedFiles.length + visibleFolders.length === 1 ? "item" : "items"}
                  </span>
                )}
                <div className="flex h-9 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 text-sm shadow-sm">
                  {sortMode === "nameAsc" ? (
                    <ArrowDownAZ className="h-4 w-4 text-zinc-500" />
                  ) : sortMode === "nameDesc" ? (
                    <ArrowDownZA className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 text-zinc-500" />
                  )}
                  <select
                    aria-label="Sort files"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="h-full cursor-pointer bg-transparent text-xs font-medium text-zinc-700 outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="nameAsc">Name A-Z</option>
                    <option value="nameDesc">Name Z-A</option>
                  </select>
                </div>
                <div className="flex h-9 overflow-hidden rounded-full border border-zinc-300 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    aria-label="List view"
                    onClick={() => setDisplayMode("list")}
                    className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                      displayMode === "list"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    {displayMode === "list" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <List className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Grid view"
                    onClick={() => setDisplayMode("grid")}
                    className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                      displayMode === "grid"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    {displayMode === "grid" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Grid2X2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm">Loading files...</p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading &&
              displayedFiles.length === 0 &&
              visibleFolders.length === 0 &&
              (activeView !== "activity" || (activityLogs ?? []).length === 0) && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                  {activeView === "trash" ? (
                    <Trash2 className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "activity" ? (
                    <Activity className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "starred" ? (
                    <Star className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "folders" ? (
                    <FolderOpen className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "images" ? (
                    <ImageIcon className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "videos" ? (
                    <Video className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "music" ? (
                    <Music className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "documents" ? (
                    <FileText className="h-5 w-5 text-zinc-400" />
                  ) : activeView === "pdfs" ? (
                    <FileText className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <FolderOpen className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">
                    {activeView === "trash"
                      ? "Trash is empty"
                      : activeView === "activity"
                      ? "No activity yet"
                      : activeView === "starred"
                      ? "No starred files yet"
                      : activeView === "folders"
                      ? currentFolderId
                        ? "This folder is empty"
                        : "No folders yet"
                      : activeView === "images"
                      ? "No images found"
                      : activeView === "videos"
                      ? "No videos found"
                      : activeView === "music"
                      ? "No music found"
                      : activeView === "documents"
                      ? "No documents found"
                      : activeView === "pdfs"
                      ? "No PDFs found"
                      : "No files found"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {activeView === "trash"
                      ? "Deleted files will appear here"
                      : activeView === "activity"
                      ? "Upload, rename, share, or delete a file to see updates here"
                      : activeView === "starred"
                      ? "Star a file to add it here"
                      : activeView === "folders"
                      ? currentFolderId
                        ? "Use Upload to choose this folder as the destination"
                        : "Create a folder to organize your files"
                      : activeView === "images"
                      ? "Upload an image to see it here"
                      : activeView === "videos"
                      ? "Upload a video to see it here"
                      : activeView === "music"
                      ? "Upload an audio file to see it here"
                      : activeView === "documents"
                      ? "Upload a document to see it here"
                      : activeView === "pdfs"
                      ? "Upload a PDF to see it here"
                      : search
                      ? "Try a different search term"
                      : "Upload a file to get started"}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && activeView === "activity" && (activityLogs ?? []).length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40">
                {(activityLogs ?? []).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-800">
                        You {item.action}{" "}
                        <span className="font-medium text-zinc-950">
                          {item.fileName}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && visibleFolders.length > 0 && displayMode === "grid" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleFolders.map((folder) => (
                  <div
                    key={folder._id}
                    className="group flex h-20 items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 text-left shadow-sm shadow-zinc-200/40 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(folder._id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-700">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900">
                          {folder.name}
                        </span>
                      </span>
                    </button>
                    <FolderActionsMenu
                      isFavorite={folder.isFavorite ?? false}
                      isOpen={folderMenuId === folder._id}
                      isDeleting={deletingFolderId === folder._id}
                      canManage={canManageFolder(folder)}
                      onToggle={() =>
                        setFolderMenuId((current) =>
                          current === folder._id ? null : folder._id
                        )
                      }
                      onDelete={() => {
                        setFolderMenuId(null);
                        setFolderPendingDelete({ id: folder._id, name: folder.name });
                      }}
                      onRename={() => openRenameFolderDialog(folder)}
                      onToggleFavorite={() =>
                        handleToggleFolderFavorite(folder._id, folder.isFavorite ?? false)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && visibleFolders.length > 0 && displayMode === "list" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-visible">
                {visibleFolders.map((folder) => (
                  <div
                    key={folder._id}
                    className="flex h-20 items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 shadow-sm shadow-zinc-200/40 transition-colors hover:bg-zinc-50/70"
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(folder._id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                        <FolderOpen className="h-5 w-5 text-zinc-600" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          {folder.name}
                        </span>
                      </span>
                    </button>
                    <FolderActionsMenu
                      isFavorite={folder.isFavorite ?? false}
                      isOpen={folderMenuId === folder._id}
                      isDeleting={deletingFolderId === folder._id}
                      canManage={canManageFolder(folder)}
                      onToggle={() =>
                        setFolderMenuId((current) =>
                          current === folder._id ? null : folder._id
                        )
                      }
                      onDelete={() => {
                        setFolderMenuId(null);
                        setFolderPendingDelete({ id: folder._id, name: folder.name });
                      }}
                      onRename={() => openRenameFolderDialog(folder)}
                      onToggleFavorite={() =>
                        handleToggleFolderFavorite(folder._id, folder.isFavorite ?? false)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* File list */}
            {!isLoading && displayedFiles.length > 0 && displayMode === "list" && (
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40">
                {displayedFiles.map((file) => (
                  <div
                    key={file._id}
                    className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-zinc-50/70 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      disabled={!file.url}
                      onClick={() => file.url && setPreviewFile(file)}
                      className="flex min-w-0 items-center gap-3 text-left disabled:cursor-default"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                        {file.type === "image" && file.url ? (
                          <Image
                            src={file.url}
                            alt={file.name}
                            width={44}
                            height={44}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileTypeIcon type={file.type} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-zinc-900">
                          {file.name}
                        </p>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                          {file.type}
                        </span>
                      </div>
                    </button>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {activeView !== "trash" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            disabled={!file.url}
                            onClick={() => file.url && setPreviewFile(file)}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Preview
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            disabled={!file.url}
                          >
                            <a href={file.url ?? "#"} download={file.name} target="_blank" rel="noreferrer">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs"
                            disabled={!file.url}
                            onClick={() => {
                              setSharingFile(file);
                              setShareDuration("24");
                              setShareUrl("");
                            }}
                          >
                            <Link2 className="mr-1.5 h-3.5 w-3.5" />
                            Share
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            disabled={!canManageFile(file)}
                            onClick={() => openRenameDialog(file)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                            disabled={!canManageFile(file)}
                            onClick={async () => {
                              try {
                                await deleteFile({ fileId: file._id });
                                toast.success("Moved to trash");
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Failed to move to trash");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            disabled={!canManageFile(file)}
                            onClick={async () => {
                              try {
                                await restoreFile({ fileId: file._id });
                                toast.success("File restored");
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Failed to restore");
                              }
                            }}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                            disabled={!canManageFile(file)}
                            onClick={async () => {
                              try {
                                await permanentlyDeleteFile({ fileId: file._id });
                                toast.success("Permanently deleted");
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Failed to delete");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File grid */}
            {!isLoading && displayedFiles.length > 0 && displayMode === "grid" && (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {displayedFiles.map((file) => (
                  <div
                    key={file._id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/70"
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative h-28 w-full cursor-pointer overflow-hidden bg-zinc-100"
                      onClick={() => file.url && setPreviewFile(file)}
                    >
                      {file.type === "image" && file.url ? (
                        <Image
                          src={file.url}
                          alt={file.name}
                          fill
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,#ffffff,transparent_42%),linear-gradient(135deg,#f4f4f5,#e4e4e7)]">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/85 shadow-sm">
                            <FileTypeIcon type={file.type} />
                          </div>
                        </div>
                      )}

                      {file.url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/0 opacity-0 transition-all duration-150 group-hover:bg-zinc-950/35 group-hover:opacity-100">
                          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm">
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </span>
                        </div>
                      )}

                      {/* Favourite star */}
                      {activeView !== "trash" && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await toggleFavorite({ fileId: file._id });
                              toast.success(
                                file.isFavorite ? "Removed from favourites" : "Added to favourites"
                              );
                            } catch {
                              toast.error("Failed to update favourite");
                            }
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              file.isFavorite
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-zinc-400"
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Info + actions */}
                    <div className="flex flex-1 flex-col gap-2 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-[15px] font-semibold text-zinc-900">
                          {file.name}
                        </p>
                        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {file.type}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {activeView !== "trash" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 flex-1 rounded-lg px-2.5 text-xs"
                              disabled={!file.url}
                              onClick={() => {
                                setSharingFile(file);
                                setShareDuration("24");
                                setShareUrl("");
                              }}
                            >
                              <Link2 className="mr-1 h-3.5 w-3.5" />
                              Share
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 flex-1 rounded-lg px-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                              disabled={!file.url}
                            >
                              <a href={file.url ?? "#"} download={file.name} target="_blank" rel="noreferrer">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 flex-1 rounded-lg px-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                              disabled={!canManageFile(file)}
                              onClick={() => openRenameDialog(file)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 flex-1 rounded-lg px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                              disabled={!canManageFile(file)}
                              onClick={async () => {
                                try {
                                  await deleteFile({ fileId: file._id });
                                  toast.success("Moved to trash");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to move to trash");
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 flex-1 rounded-lg px-2 text-xs"
                              disabled={!canManageFile(file)}
                              onClick={async () => {
                                try {
                                  await restoreFile({ fileId: file._id });
                                  toast.success("File restored");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to restore");
                                }
                              }}
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                              Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-lg px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                              disabled={!canManageFile(file)}
                              onClick={async () => {
                                try {
                                  await permanentlyDeleteFile({ fileId: file._id });
                                  toast.success("Permanently deleted");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to delete");
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {previewFile.type}
                </span>
                <p className="truncate text-sm font-medium text-zinc-900">
                  {previewFile.name}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                  <a href={previewFile.url ?? "#"} download={previewFile.name} target="_blank" rel="noreferrer">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-50 p-0">

              {/* Image preview */}
              {previewFile.type === "image" && previewFile.url && (
                <div className="flex h-full w-full items-center justify-center p-6">
                  <Image
                    src={previewFile.url}
                    alt={previewFile.name}
                    width={1200}
                    height={900}
                    unoptimized
                    className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
                  />
                </div>
              )}

              {/* PDF preview */}
              {previewFile.type === "pdf" && previewFile.url && (
                <object
                  data={previewFile.url}
                  type="application/pdf"
                  className="h-[75vh] w-full"
                >
                  <div className="flex flex-col items-center gap-4 p-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                      <FileText className="h-7 w-7 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-700">
                        Unable to preview this PDF in your browser
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Download the file to view it
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <a href={previewFile.url} download={previewFile.name} target="_blank" rel="noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download PDF
                      </a>
                    </Button>
                  </div>
                </object>
              )}

              {/* Video preview */}
              {previewFile.type === "video" && previewFile.url && (
                <video
                  src={previewFile.url}
                  controls
                  className="max-h-[75vh] max-w-full bg-black"
                />
              )}

              {/* Audio preview */}
              {previewFile.type === "audio" && previewFile.url && (
                <div className="flex w-full max-w-xl flex-col items-center gap-4 p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <Music className="h-7 w-7 text-fuchsia-500" />
                  </div>
                  <p className="text-sm font-medium text-zinc-700">
                    {previewFile.name}
                  </p>
                  <audio src={previewFile.url} controls className="w-full" />
                </div>
              )}

              {/* Documents and spreadsheets */}
              {["document", "spreadsheet"].includes(previewFile.type) && (
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    {previewFile.type === "spreadsheet" ? (
                      <FileSpreadsheet className="h-7 w-7 text-emerald-500" />
                    ) : (
                      <FileText className="h-7 w-7 text-indigo-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-700">
                      Preview is not available for this file type
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Download the file to open it in the right app
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <a href={previewFile.url ?? "#"} download={previewFile.name} target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </a>
                  </Button>
                </div>
              )}

              {/* Fallback */}
              {!["image", "pdf", "document", "spreadsheet", "audio", "video"].includes(previewFile.type) && (
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                    <FolderOpen className="h-7 w-7 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-700">
                      Preview not available for this file type
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Download the file to open it
                    </p>
                  </div>
                  {previewFile.url && (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <a href={previewFile.url} download={previewFile.name} target="_blank" rel="noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!sharingFile}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSharingFile(null);
            setShareUrl("");
            setShareDuration("24");
          }
        }}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Share file</DialogTitle>
            <DialogDescription>
              Create an expiring link for {sharingFile ? `"${sharingFile.name}"` : "this file"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitShareLink} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="share-duration" className="text-sm font-medium text-zinc-700">
                Link expires after
              </label>
              <select
                id="share-duration"
                value={shareDuration}
                onChange={(event) => setShareDuration(event.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              >
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
              </select>
            </div>

            {shareUrl && (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                <Input value={shareUrl} readOnly className="border-0 bg-transparent shadow-none" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(shareUrl);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            <DialogFooter className="border-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSharingFile(null);
                  setShareUrl("");
                }}
              >
                Close
              </Button>
              <Button type="submit" disabled={isCreatingShareLink}>
                {isCreatingShareLink ? "Creating..." : "Create link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renamingFile}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRenamingFile(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Rename file</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRename} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="rename-file-name"
                className="text-sm font-medium text-zinc-700"
              >
                Name
              </label>
              <Input
                id="rename-file-name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                autoFocus
                placeholder="Enter a file name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenamingFile(null);
                  setRenameValue("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? "Renaming..." : "Rename"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renamingFolder}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRenamingFolder(null);
            setFolderRenameValue("");
          }
        }}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Rename folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitFolderRename} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="rename-folder-name"
                className="text-sm font-medium text-zinc-700"
              >
                Name
              </label>
              <Input
                id="rename-folder-name"
                value={folderRenameValue}
                onChange={(event) => setFolderRenameValue(event.target.value)}
                autoFocus
                placeholder="Enter a folder name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenamingFolder(null);
                  setFolderRenameValue("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenamingFolder}>
                {isRenamingFolder ? "Renaming..." : "Rename"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFolderDialogOpen}
        onOpenChange={(isOpen) => {
          setIsFolderDialogOpen(isOpen);
          if (!isOpen) setFolderName("");
        }}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">New folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitFolder} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="folder-name"
                className="text-sm font-medium text-zinc-700"
              >
                Name
              </label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                autoFocus
                placeholder="Folder name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFolderDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingFolder}>
                {isCreatingFolder ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!folderPendingDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setFolderPendingDelete(null);
          }
        }}
      >
        <DialogContent className="gap-4 p-5 sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl">Delete folder?</DialogTitle>
            <DialogDescription>
              {folderPendingDelete
                ? `Move "${folderPendingDelete.name}" to trash? The folder will be removed and files inside it will be moved back to Files.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFolderPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!folderPendingDelete || deletingFolderId === folderPendingDelete.id}
              onClick={handleDeleteFolder}
            >
              {folderPendingDelete && deletingFolderId === folderPendingDelete.id
                ? "Deleting..."
                : "Move to trash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FolderActionsMenu({
  isFavorite,
  isOpen,
  isDeleting,
  canManage,
  onToggle,
  onRename,
  onToggleFavorite,
  onDelete,
}: {
  isFavorite: boolean;
  isOpen: boolean;
  isDeleting: boolean;
  canManage: boolean;
  onToggle: () => void;
  onRename: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative shrink-0" data-folder-menu>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isDeleting}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-30 min-w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl shadow-zinc-200/70">
          <button
            type="button"
            disabled={!canManage}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
            onClick={(event) => {
              event.stopPropagation();
              if (!canManage) return;
              onRename();
            }}
          >
            <Pencil className="h-4 w-4" />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
            {isFavorite ? "Remove from starred" : "Add to starred"}
          </button>
          <div className="my-1 h-px bg-zinc-100" />
          <button
            type="button"
            disabled={!canManage}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
            onClick={(event) => {
              event.stopPropagation();
              if (!canManage) return;
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Move to trash
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-auto shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors lg:w-full ${
        active
          ? "bg-zinc-900 font-medium text-white"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
