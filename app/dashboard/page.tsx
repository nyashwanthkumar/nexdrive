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
  Bot,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Eye,
  Files,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Grid2X2,
  ImageIcon,
  List,
  Link2,
  Loader2,
  Menu,
  MoreVertical,
  Moon,
  Music,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Star,
  Sun,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTheme } from "../_components/theme-provider";
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
type AskAiIntent = "summary" | "duplicates" | "organize" | "cleanup" | "sharing";
type AskAiResult = {
  intent: AskAiIntent;
  title: string;
  summary: string;
  bullets: string[];
};

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

function FileTypeIcon({ type }: { type: string }) {
  if (type === "image") return <ImageIcon className="h-7 w-7 text-sky-500" />;
  if (type === "pdf") return <FileText className="h-7 w-7 text-red-500" />;
  if (type === "spreadsheet") return <FileSpreadsheet className="h-7 w-7 text-emerald-500" />;
  if (type === "document") return <FileText className="h-7 w-7 text-indigo-500" />;
  if (type === "audio") return <Music className="h-7 w-7 text-fuchsia-500" />;
  if (type === "video") return <Video className="h-7 w-7 text-orange-500" />;
  return <FolderOpen className="h-7 w-7 text-zinc-400" />;
}

function FileCardThumbnail({
  file,
}: {
  file: FileItem;
}) {
  if (file.type === "image" && file.url) {
    return (
      <Image
        src={file.url}
        alt={file.name}
        fill
        className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />
    );
  }

  if (file.type === "video" && file.url) {
    return (
      <video
        src={file.url}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,#ffffff,transparent_42%),linear-gradient(135deg,#f4f4f5,#e4e4e7)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/85 shadow-sm">
          <FileTypeIcon type={file.type} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { organization } = useOrganization();
  const { user } = useUser();

  const deleteFile = useMutation(api.files.deleteFile);
  const restoreFile = useMutation(api.files.restoreFile);
  const permanentlyDeleteFile = useMutation(api.files.permanentlyDeleteFile);
  const toggleFavorite = useMutation(api.files.toggleFavorite);
  const renameFile = useMutation(api.files.renameFile);
  const createFolder = useMutation(api.files.createFolder);
  const deleteFolder = useMutation(api.files.deleteFolder);
  const restoreFolder = useMutation(api.files.restoreFolder);
  const permanentlyDeleteFolder = useMutation(api.files.permanentlyDeleteFolder);
  const renameFolder = useMutation(api.files.renameFolder);
  const toggleFavoriteFolder = useMutation(api.files.toggleFavoriteFolder);
  const createShareLink = useMutation(api.files.createShareLink);
  const revokeShareLink = useMutation(api.files.revokeShareLink);
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Id<"files">[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Id<"folders">[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [isSharesDialogOpen, setIsSharesDialogOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [askAiQuestion, setAskAiQuestion] = useState("Summarize this view");
  const [askAiResult, setAskAiResult] = useState<AskAiResult | null>(null);

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
  const storageStats = useQuery(
    api.files.getStorageStats,
    orgId ? { orgId } : "skip"
  );
  const shareLinks = useQuery(
    api.files.getShareLinks,
    orgId ? { orgId } : "skip"
  );
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!user) return;

    void syncCurrentUser({
      clerkId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? user.username ?? "NexDrive user",
      imageUrl: user.imageUrl,
    });
  }, [syncCurrentUser, user]);

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
      if (!target.closest("[data-sort-menu]")) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const openAskAi = () => {
      setIsAskAiOpen(true);
      setAskAiQuestion("Summarize this view");
    };

    window.addEventListener("nexdrive:open-ask-ai", openAskAi);
    return () => window.removeEventListener("nexdrive:open-ask-ai", openAskAi);
  }, []);

  const isLoading = activeFiles === undefined || trashFiles === undefined || folders === undefined;
  const currentFolder = folders?.find((folder) => folder._id === currentFolderId);
  const workspaceTitle = organization ? organization.name : "Personal";

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

  useEffect(() => {
    setSelectedFileIds((current) =>
      current.filter((fileId) => displayedFiles.some((file) => file._id === fileId))
    );
  }, [displayedFiles]);

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

  const visibleFolders = useMemo(() => {
    if (activeView === "folders" && !currentFolderId) {
      return [...(folders ?? [])]
          .filter(
            (folder) =>
              !(folder.shouldDelete ?? false) &&
              folder.name.toLowerCase().includes(search.toLowerCase())
          )
          .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (activeView === "starred") {
      return [...(folders ?? [])]
          .filter(
            (folder) =>
              !(folder.shouldDelete ?? false) &&
              (folder.isFavorite ?? false) &&
              folder.name.toLowerCase().includes(search.toLowerCase())
          )
          .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (activeView === "trash") {
      return [...(folders ?? [])]
          .filter(
            (folder) =>
              (folder.shouldDelete ?? false) &&
              folder.name.toLowerCase().includes(search.toLowerCase())
          )
          .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
    }

    return [];
  }, [activeView, currentFolderId, folders, search]);

  useEffect(() => {
    setSelectedFolderIds((current) =>
      current.filter((folderId) => visibleFolders.some((folder) => folder._id === folderId))
    );
  }, [visibleFolders]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  const selectedFiles = displayedFiles.filter((file) => selectedFileIds.includes(file._id));
  const selectedFolders = visibleFolders.filter((folder) => selectedFolderIds.includes(folder._id));
  const activeShares = (shareLinks ?? []).filter((share) => !share.isExpired && !share.isRevoked);
  const storageTotal = storageStats?.totalSize ?? 0;
  const storageLimit = 1024 * 1024 * 1024;
  const storagePercent = Math.min(100, Math.round((storageTotal / storageLimit) * 100));
  const selectableFiles = displayedFiles.filter((file) => activeView === "trash" || canManageFile(file));
  const selectableFolders = visibleFolders.filter((folder) => activeView === "trash" || canManageFolder(folder));
  const selectedItemCount = selectedFiles.length + selectedFolders.length;
  const toolbarItemCount = displayedFiles.length + visibleFolders.length;
  const selectableItemCount = selectableFiles.length + selectableFolders.length;
  const allVisibleSelected =
    selectableItemCount > 0 &&
    selectableFiles.every((file) => selectedFileIds.includes(file._id)) &&
    selectableFolders.every((folder) => selectedFolderIds.includes(folder._id));
  const sortLabels: Record<SortMode, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    nameAsc: "Name A-Z",
    nameDesc: "Name Z-A",
  };

  function formatBytes(size: number) {
    if (!size) return "0 MB";
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function detectAskAiIntent(question: string): AskAiIntent {
    const value = question.toLowerCase();
    if (value.includes("duplicate")) return "duplicates";
    if (value.includes("organize") || value.includes("folder")) return "organize";
    if (value.includes("share") || value.includes("link")) return "sharing";
    if (value.includes("clean") || value.includes("large") || value.includes("storage")) return "cleanup";
    return "summary";
  }

  function buildAskAiResult(intent: AskAiIntent): AskAiResult {
    const filesForAnalysis = displayedFiles;
    const foldersForAnalysis = visibleFolders;
    const dominantTypes = filesForAnalysis.reduce<Record<string, number>>((acc, file) => {
      acc[file.type] = (acc[file.type] ?? 0) + 1;
      return acc;
    }, {});
    const sortedTypes = Object.entries(dominantTypes).sort((a, b) => b[1] - a[1]);
    const recentNames = filesForAnalysis.slice(0, 3).map((file) => file.name);
    const looseFiles = (activeFiles ?? []).filter((file) => !file.folderId);
    const soonExpiringShares = activeShares.filter((share) => share.expiresAt - Date.now() < 24 * 60 * 60 * 1000);
    const duplicateGroups = Array.from(
      filesForAnalysis.reduce<Map<string, FileItem[]>>((groups, file) => {
        const normalizedName = file.name
          .toLowerCase()
          .replace(/\.[^.]+$/, "")
          .replace(/\s*\(\d+\)$/, "")
          .replace(/\s+copy$/, "")
          .trim();
        const key = `${normalizedName}|${file.type}|${file.size ?? 0}`;
        groups.set(key, [...(groups.get(key) ?? []), file]);
        return groups;
      }, new Map())
    )
      .map(([, group]) => group)
      .filter((group) => group.length > 1);
    const largestFiles = [...(activeFiles ?? [])]
      .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
      .slice(0, 3);

    if (intent === "duplicates") {
      return {
        intent,
        title: "Possible duplicates",
        summary:
          duplicateGroups.length > 0
            ? `I found ${duplicateGroups.length} duplicate-looking group${duplicateGroups.length === 1 ? "" : "s"} in this view.`
            : "I do not see obvious duplicate file groups in this view right now.",
        bullets:
          duplicateGroups.length > 0
            ? duplicateGroups.slice(0, 3).map((group) => `${group.length} copies of ${group[0].name}`)
            : [
                "File names and sizes in this view look distinct.",
                "If you want stronger duplicate detection later, we can add content hashing.",
              ],
      };
    }

    if (intent === "organize") {
      const suggestions = [];
      if (looseFiles.length > 3) {
        suggestions.push(`${looseFiles.length} active files are still sitting at the root level.`);
      }
      if (sortedTypes.length > 0) {
        suggestions.push(`The busiest file type right now is ${sortedTypes[0][0]} with ${sortedTypes[0][1]} files.`);
      }
      if (foldersForAnalysis.length < 2 && filesForAnalysis.length > 4) {
        suggestions.push("You would benefit from a few simple folders for images, docs, and shared assets.");
      }

      return {
        intent,
        title: "Organization suggestions",
        summary:
          suggestions.length > 0
            ? "This workspace is in decent shape, but there are a few easy cleanup wins."
            : "The current view already looks fairly tidy.",
        bullets:
          suggestions.length > 0
            ? suggestions
            : [
                "Your files are already grouped reasonably well.",
                "A next step would be naming folders by project or delivery stage.",
              ],
      };
    }

    if (intent === "cleanup") {
      return {
        intent,
        title: "Cleanup opportunities",
        summary: `Storage is using ${formatBytes(storageTotal)} of ${formatBytes(storageLimit)} across ${storageStats?.fileCount ?? 0} active files.`,
        bullets:
          largestFiles.length > 0
            ? largestFiles.map((file) => `${file.name} is taking ${formatBytes(file.size ?? 0)}`)
            : [
                "There are no active files yet, so there is nothing to clean up.",
              ],
      };
    }

    if (intent === "sharing") {
      return {
        intent,
        title: "Sharing snapshot",
        summary:
          activeShares.length > 0
            ? `You currently have ${activeShares.length} active share link${activeShares.length === 1 ? "" : "s"}.`
            : "There are no active share links in this workspace right now.",
        bullets:
          activeShares.length > 0
            ? [
                `${soonExpiringShares.length} share link${soonExpiringShares.length === 1 ? "" : "s"} expire within 24 hours.`,
                "Open Shares to review or revoke links quickly.",
              ]
            : [
                "Use share links for files that need quick external access.",
                "Expiry keeps links safer for temporary handoffs.",
              ],
      };
    }

    return {
      intent: "summary",
      title: "Workspace summary",
      summary: `${viewMeta.label} currently shows ${filesForAnalysis.length} file${filesForAnalysis.length === 1 ? "" : "s"} and ${foldersForAnalysis.length} folder${foldersForAnalysis.length === 1 ? "" : "s"}.`,
      bullets: [
        sortedTypes.length > 0
          ? `${sortedTypes[0][0]} is the most common file type in this view.`
          : "This view does not have files yet.",
        recentNames.length > 0
          ? `Recent files here: ${recentNames.join(", ")}.`
          : "There are no recent files in this view yet.",
        `You are using ${formatBytes(storageTotal)} of ${formatBytes(storageLimit)} in ${workspaceTitle}.`,
      ],
    };
  }

  function runAskAi(nextQuestion = askAiQuestion) {
    const intent = detectAskAiIntent(nextQuestion);
    setAskAiQuestion(nextQuestion);
    setAskAiResult(buildAskAiResult(intent));
    setIsAskAiOpen(true);
  }

  function toggleSelectedFile(fileId: Id<"files">) {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId]
    );
  }

  function toggleSelectedFolder(folderId: Id<"folders">) {
    setSelectedFolderIds((current) =>
      current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId]
    );
  }

  function toggleSelectAllVisible() {
    const manageableFileIds = selectableFiles.map((file) => file._id);
    const manageableFolderIds = selectableFolders.map((folder) => folder._id);
    const allFilesSelected =
      manageableFileIds.length === 0 ||
      manageableFileIds.every((id) => selectedFileIds.includes(id));
    const allFoldersSelected =
      manageableFolderIds.length === 0 ||
      manageableFolderIds.every((id) => selectedFolderIds.includes(id));

    if (manageableFileIds.length + manageableFolderIds.length > 0 && allFilesSelected && allFoldersSelected) {
      setSelectedFileIds((current) => current.filter((id) => !manageableFileIds.includes(id)));
      setSelectedFolderIds((current) => current.filter((id) => !manageableFolderIds.includes(id)));
      return;
    }

    setSelectedFileIds((current) => Array.from(new Set([...current, ...manageableFileIds])));
    setSelectedFolderIds((current) => Array.from(new Set([...current, ...manageableFolderIds])));
  }

  function clearSelection() {
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
    setIsSelectionMode(false);
  }

  function handleFolderSurfaceClick(folder: (typeof visibleFolders)[number]) {
    if (isSelectionMode && canManageFolder(folder)) {
      toggleSelectedFolder(folder._id);
      return;
    }

    if (activeView !== "trash") {
      setCurrentFolderId(folder._id);
    }
  }

  function handleFileSurfaceClick(file: FileItem) {
    if (isSelectionMode && canManageFile(file)) {
      toggleSelectedFile(file._id);
      return;
    }

    if (file.url) {
      setPreviewFile(file);
    }
  }

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
      toast.success("Folder moved to trash");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete folder");
    } finally {
      setDeletingFolderId(null);
    }
  }

  async function handleRestoreFolder(folderId: Id<"folders">) {
    try {
      setDeletingFolderId(folderId);
      await restoreFolder({ folderId });
      toast.success("Folder restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore folder");
    } finally {
      setDeletingFolderId(null);
    }
  }

  async function handlePermanentlyDeleteFolder(folderId: Id<"folders">) {
    try {
      setDeletingFolderId(folderId);
      await permanentlyDeleteFolder({ folderId });
      toast.success("Folder permanently deleted");
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

  async function bulkDeleteSelected() {
    if (selectedFiles.length === 0 && selectedFolders.length === 0) return;

    try {
      setIsBulkWorking(true);

      for (const folder of selectedFolders) {
        if (!canManageFolder(folder)) continue;
        if (activeView === "trash") {
          await permanentlyDeleteFolder({ folderId: folder._id });
        } else {
          await deleteFolder({ folderId: folder._id });
        }
      }

      for (const file of selectedFiles) {
        if (!canManageFile(file)) continue;
        if (activeView === "trash") {
          await permanentlyDeleteFile({ fileId: file._id });
        } else {
          await deleteFile({ fileId: file._id });
        }
      }

      toast.success(activeView === "trash" ? "Selected items deleted" : "Selected items moved to trash");
      clearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk action failed");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function bulkRestoreSelected() {
    if (selectedFiles.length === 0 && selectedFolders.length === 0) return;

    try {
      setIsBulkWorking(true);

      for (const folder of selectedFolders) {
        if (canManageFolder(folder)) {
          await restoreFolder({ folderId: folder._id });
        }
      }

      for (const file of selectedFiles) {
        if (canManageFile(file)) {
          await restoreFile({ fileId: file._id });
        }
      }

      toast.success("Selected items restored");
      clearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore selected items");
    } finally {
      setIsBulkWorking(false);
    }
  }

  const isWorkspaceAdmin = userRole === "org:admin" || userRole === "admin";
  const isDarkTheme = resolvedTheme === "dark";

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
      <main className="min-h-[calc(100vh-64px)] bg-[#f6f7f9] dark:bg-zinc-950">
        <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">

            {/* Sidebar */}
          <aside className="relative flex flex-col gap-3 border-b border-zinc-200/80 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-5">
            <div className="flex items-center gap-2 px-1 lg:mb-2">
              <button
                type="button"
                aria-label="Open sections"
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen((open) => !open)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm shadow-zinc-200/60 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-none dark:hover:bg-zinc-800 lg:hidden"
              >
                {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <UploadButton folders={folders ?? []} />
            </div>

            <nav
              onClick={() => setIsMobileNavOpen(false)}
              className={`absolute left-3 right-3 top-[72px] z-30 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20 lg:static lg:block lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
                isMobileNavOpen ? "grid gap-1" : "hidden"
              } lg:space-y-0.5`}
            >
              <button
                type="button"
                className="mb-1 flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 lg:hidden"
                onClick={(event) => {
                  event.stopPropagation();
                  setTheme(isDarkTheme ? "light" : "dark");
                }}
              >
                <span className="flex items-center gap-2.5">
                  {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDarkTheme ? "Light mode" : "Dark mode"}
                </span>
                <span className="text-xs text-zinc-400">
                  {isDarkTheme ? "On" : "Off"}
                </span>
              </button>
              <div className="mb-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    <Files className="h-4 w-4" />
                    Storage
                  </span>
                  <span className="text-xs text-zinc-400">
                    {storagePercent}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatBytes(storageTotal)} / {formatBytes(storageLimit)} • {storageStats?.fileCount ?? 0} files
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {activeShares.length} active shares
                </p>
              </div>
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

            <div className="hidden border-t border-zinc-100 pt-4 dark:border-zinc-800 lg:block">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Storage
              </p>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {formatBytes(storageTotal)}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {storagePercent}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>{formatBytes(storageLimit)} total</span>
                  <span>{storageStats?.fileCount ?? 0} files</span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {activeShares.length} active shares
                </div>
              </div>
            </div>

            <div className="hidden border-t border-zinc-100 pt-4 dark:border-zinc-800 lg:block">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Workspace
              </p>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                    {organization ? (
                      <Building2 className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <User className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      {workspaceTitle}
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {organization ? "Organization workspace" : "Personal workspace"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </aside>

          {/* Content */}
          <section className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">

            {/* Search */}
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2.5 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{viewMeta.label}</h1>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{viewMeta.description}</p>
              </div>
              <div className="relative z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 p-1.5 shadow-sm shadow-zinc-200/50 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-none">
                {!isLoading && toolbarItemCount > 0 && (
                  <span className="hidden rounded-lg bg-zinc-100 px-2.5 py-2 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline-flex">
                    {toolbarItemCount}{" "}
                    {toolbarItemCount === 1 ? "item" : "items"}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-transparent bg-transparent px-3 shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => setIsSharesDialogOpen(true)}
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  Shares
                  {activeShares.length > 0 && (
                    <span className="ml-1 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-950">
                      {activeShares.length}
                    </span>
                  )}
                </Button>
                {selectableFiles.length + selectableFolders.length > 0 && (
                  isSelectionMode ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-zinc-50/95 px-1.5 py-1 shadow-inner shadow-white/70 dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-none">
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="flex h-8 items-center rounded-full bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Selecting
                      </button>
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="flex h-8 items-center rounded-full px-3.5 text-xs font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      >
                        {allVisibleSelected ? "Clear all" : "Select all"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSelectionMode(true)}
                      className="flex h-9 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-zinc-50 px-3.5 text-xs font-medium text-zinc-600 shadow-sm shadow-zinc-200/40 transition hover:bg-white hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Select
                    </button>
                  )
                )}
                <div className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />
                <div data-sort-menu className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSortMenuOpen((open) => !open)}
                    className="flex h-9 items-center gap-2 rounded-xl bg-zinc-100 px-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {sortMode === "nameAsc" ? (
                      <ArrowDownAZ className="h-4 w-4 text-zinc-500" />
                    ) : sortMode === "nameDesc" ? (
                      <ArrowDownZA className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-zinc-500" />
                    )}
                    <span className="text-xs font-medium">{sortLabels[sortMode]}</span>
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </button>
                  {isSortMenuOpen && (
                    <div className="absolute right-0 top-11 z-[80] min-w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                      {(
                        [
                          ["newest", "Newest first"],
                          ["oldest", "Oldest first"],
                          ["nameAsc", "Name A-Z"],
                          ["nameDesc", "Name Z-A"],
                        ] as [SortMode, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setSortMode(value);
                            setIsSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            sortMode === value
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>{label}</span>
                          {sortMode === value ? <Check className="h-4 w-4" /> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex h-9 overflow-hidden rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
                  <button
                    type="button"
                    aria-label="List view"
                    onClick={() => setDisplayMode("list")}
                    className={`flex h-8 w-10 items-center justify-center rounded-lg transition-colors ${
                      displayMode === "list"
                        ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                    className={`flex h-8 w-10 items-center justify-center rounded-lg transition-colors ${
                      displayMode === "grid"
                        ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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

            {activeView === "folders" && !currentFolderId && (
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Folders
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Keep related uploads together. Folders moved to trash can be restored later.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={() => setIsFolderDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create folder
                </Button>
              </div>
            )}

            {selectedItemCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-zinc-200/80 bg-zinc-100/80 px-3 py-2 shadow-sm shadow-zinc-200/40 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-none">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {selectedItemCount} selected
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeView === "trash" ? (
                    <button
                      type="button"
                      disabled={isBulkWorking}
                      onClick={bulkRestoreSelected}
                      className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-zinc-600 transition hover:bg-white hover:text-zinc-950 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isBulkWorking}
                    onClick={bulkDeleteSelected}
                    className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-zinc-600 transition hover:bg-white hover:text-red-600 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    {activeView === "trash" ? "Delete forever" : "Move to trash"}
                  </button>
                </div>
              </div>
            )}

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
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                {(activityLogs ?? []).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">
                        You {item.action}{" "}
                        <span className="font-medium text-zinc-950 dark:text-zinc-50">
                          {item.fileName}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
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
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFolderSurfaceClick(folder)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleFolderSurfaceClick(folder);
                      }
                    }}
                    className={`group relative flex h-20 items-center gap-3 rounded-2xl border px-4 text-left shadow-sm transition-all duration-150 ${
                      selectedFolderIds.includes(folder._id)
                        ? "border-sky-200 bg-sky-50/80 shadow-sky-100/80 dark:border-sky-500/40 dark:bg-sky-500/10 dark:shadow-none"
                        : "border-zinc-200/80 bg-white shadow-zinc-200/40 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-700"
                    }`}
                  >
                    {selectedFolderIds.includes(folder._id) && (
                      <span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1 rounded-full bg-zinc-900 px-2 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <Check className="h-3 w-3" />
                        Selected
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {folder.name}
                        </span>
                      </span>
                    </div>
                    {activeView === "trash" ? (
                      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={deletingFolderId === folder._id || !canManageFolder(folder)}
                          onClick={() => handleRestoreFolder(folder._id)}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                          disabled={deletingFolderId === folder._id || !canManageFolder(folder)}
                          onClick={() => handlePermanentlyDeleteFolder(folder._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div onClick={(event) => event.stopPropagation()}>
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
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isLoading && visibleFolders.length > 0 && displayMode === "list" && (
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                {visibleFolders.map((folder) => (
                  <div
                    key={folder._id}
                    role="button"
                    tabIndex={0}
                    className={`flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 transition-colors last:border-b-0 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between ${
                      selectedFolderIds.includes(folder._id)
                        ? "bg-sky-50/80 dark:bg-sky-500/10"
                        : "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/70"
                    }`}
                    onClick={() => handleFolderSurfaceClick(folder)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleFolderSurfaceClick(folder);
                      }
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                          <FolderOpen className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {folder.name}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {selectedFolderIds.includes(folder._id)
                              ? "Selected"
                              : isSelectionMode
                              ? "Tap to select folder"
                              : "Open folder"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {activeView === "trash" ? (
                      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={deletingFolderId === folder._id || !canManageFolder(folder)}
                          onClick={() => handleRestoreFolder(folder._id)}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                          disabled={deletingFolderId === folder._id || !canManageFolder(folder)}
                          onClick={() => handlePermanentlyDeleteFolder(folder._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div onClick={(event) => event.stopPropagation()}>
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
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* File list */}
            {!isLoading && displayedFiles.length > 0 && displayMode === "list" && (
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                {displayedFiles.map((file) => (
                  <div
                    key={file._id}
                    role="button"
                    tabIndex={0}
                    className={`flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 transition-colors last:border-b-0 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between ${
                      selectedFileIds.includes(file._id)
                        ? "bg-sky-50/80 dark:bg-sky-500/10"
                        : "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/70"
                    }`}
                    onClick={() => handleFileSurfaceClick(file)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleFileSurfaceClick(file);
                      }
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                            {file.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                            {selectedFileIds.includes(file._id) && (
                              <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
                                Selected
                              </span>
                            )}
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium uppercase tracking-wide dark:bg-zinc-800">
                              {file.type}
                            </span>
                            {typeof file.size === "number" && <span>{formatBytes(file.size)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end" onClick={(event) => event.stopPropagation()}>
                      {activeView !== "trash" ? (
                        <div className="flex items-center gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-1 dark:border-zinc-800 dark:bg-zinc-950/80">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-xl px-2.5 text-zinc-400 hover:bg-white hover:text-zinc-700 dark:hover:bg-zinc-900"
                            disabled={!file.url}
                          >
                            <a href={file.url ?? "#"} download={file.name} target="_blank" rel="noreferrer" title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-xl px-2.5 text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                            disabled={!file.url}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSharingFile(file);
                              setShareDuration("24");
                              setShareUrl("");
                            }}
                            title="Share"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-xl px-2.5 text-zinc-400 hover:bg-white hover:text-zinc-700 dark:hover:bg-zinc-900"
                            disabled={!canManageFile(file)}
                            onClick={(event) => {
                              event.stopPropagation();
                              openRenameDialog(file);
                            }}
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-xl px-2.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                            disabled={!canManageFile(file)}
                            onClick={async (event) => {
                              event.stopPropagation();
                              try {
                                await deleteFile({ fileId: file._id });
                                toast.success("Moved to trash");
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Failed to move to trash");
                              }
                            }}
                            title="Move to trash"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            disabled={!canManageFile(file)}
                            onClick={async (event) => {
                              event.stopPropagation();
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
                            onClick={async (event) => {
                              event.stopPropagation();
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
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFileSurfaceClick(file)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleFileSurfaceClick(file);
                      }
                    }}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 ${
                      selectedFileIds.includes(file._id)
                        ? "border-sky-200 bg-sky-50/80 shadow-md shadow-sky-100/70 dark:border-sky-500/40 dark:bg-sky-500/10 dark:shadow-none"
                        : "border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-700"
                    }`}
                  >
                    {selectedFileIds.includes(file._id) && (
                      <span className="absolute left-3 top-3 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {/* Thumbnail */}
                    <div
                      className="relative h-28 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                    >
                      <FileCardThumbnail file={file} />

                      {file.url && !isSelectionMode && (
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
                    <div className="flex flex-1 flex-col gap-3 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                            {file.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium uppercase tracking-wide dark:bg-zinc-800">
                              {file.type}
                            </span>
                            {typeof file.size === "number" && <span>{formatBytes(file.size)}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                          {isSelectionMode ? "" : "Open"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2" onClick={(event) => event.stopPropagation()}>
                        {activeView !== "trash" ? (
                          <div className="flex items-center gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-1 dark:border-zinc-800 dark:bg-zinc-950/80">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-xl px-2.5 text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                              disabled={!file.url}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSharingFile(file);
                                setShareDuration("24");
                                setShareUrl("");
                              }}
                              title="Share"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-xl px-2 text-zinc-400 hover:bg-white hover:text-zinc-700 dark:hover:bg-zinc-900"
                              disabled={!file.url}
                            >
                              <a href={file.url ?? "#"} download={file.name} target="_blank" rel="noreferrer" title="Download">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-xl px-2 text-zinc-400 hover:bg-white hover:text-zinc-700 dark:hover:bg-zinc-900"
                              disabled={!canManageFile(file)}
                              onClick={(event) => {
                                event.stopPropagation();
                                openRenameDialog(file);
                              }}
                              title="Rename"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-xl px-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                              disabled={!canManageFile(file)}
                              onClick={async (event) => {
                                event.stopPropagation();
                                try {
                                  await deleteFile({ fileId: file._id });
                                  toast.success("Moved to trash");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to move to trash");
                                }
                              }}
                              title="Move to trash"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 flex-1 rounded-lg px-2 text-xs"
                              disabled={!canManageFile(file)}
                              onClick={async (event) => {
                                event.stopPropagation();
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
                              onClick={async (event) => {
                                event.stopPropagation();
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

      <Dialog
        open={isAskAiOpen}
        onOpenChange={(isOpen) => {
          setIsAskAiOpen(isOpen);
          if (!isOpen) {
            setAskAiQuestion("Summarize this view");
          }
        }}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-5 w-5" />
              Ask AI
            </DialogTitle>
            <DialogDescription>
              Get quick help from the current {workspaceTitle} workspace without leaving this view.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {[
              "Summarize this view",
              "Find possible duplicates",
              "Suggest better organization",
              "What should I clean up first?",
              "Review sharing status",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => runAskAi(prompt)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              runAskAi(askAiQuestion.trim() || "Summarize this view");
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <label htmlFor="ask-ai-question" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Question
              </label>
              <textarea
                id="ask-ai-question"
                value={askAiQuestion}
                onChange={(event) => setAskAiQuestion(event.target.value)}
                rows={4}
                placeholder="Ask about this workspace..."
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAskAiOpen(false)}>
                Close
              </Button>
              <Button type="submit">Ask</Button>
            </div>
          </form>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {askAiResult?.title ?? "Workspace summary"}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {askAiResult?.summary ?? "Run a prompt to get a quick workspace readout."}
                </p>
              </div>

              {askAiResult?.bullets?.length ? (
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {askAiResult.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {askAiResult ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {askAiResult.intent === "sharing" && (
                    <Button size="sm" variant="outline" onClick={() => setIsSharesDialogOpen(true)}>
                      Open shares
                    </Button>
                  )}
                  {askAiResult.intent === "organize" && (
                    <Button size="sm" variant="outline" onClick={() => setIsFolderDialogOpen(true)}>
                      Create folder
                    </Button>
                  )}
                  {askAiResult.intent === "summary" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveView("folders");
                        setCurrentFolderId(null);
                        setIsAskAiOpen(false);
                      }}
                    >
                      Open folders
                    </Button>
                  )}
                  {askAiResult.intent === "cleanup" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveView("trash");
                        setCurrentFolderId(null);
                        setIsAskAiOpen(false);
                      }}
                    >
                      Open trash
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        open={isSharesDialogOpen}
        onOpenChange={setIsSharesDialogOpen}
      >
        <DialogContent className="gap-5 p-5 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Shared links</DialogTitle>
            <DialogDescription>
              Review active and expired links without adding more controls to each file.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] space-y-2 overflow-auto">
            {(shareLinks ?? []).length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                No shared links yet.
              </div>
            ) : (
              (shareLinks ?? []).map((share) => {
                const shareUrlValue =
                  typeof window === "undefined" ? "" : `${window.location.origin}/share/${share.token}`;
                const inactive = share.isExpired || share.isRevoked;

                return (
                  <div
                    key={share._id}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {share.fileName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {inactive
                          ? share.isRevoked
                            ? "Revoked"
                            : "Expired"
                          : `Expires ${new Date(share.expiresAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={inactive}
                        onClick={async () => {
                          await navigator.clipboard?.writeText(shareUrlValue);
                          toast.success("Link copied");
                        }}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={inactive}
                        onClick={async () => {
                          try {
                            await revokeShareLink({ shareId: share._id });
                            toast.success("Share link revoked");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed to revoke link");
                          }
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

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
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
        active
          ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
