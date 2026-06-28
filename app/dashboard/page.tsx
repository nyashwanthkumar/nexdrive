"use client";

import { useOrganization, useOrganizationList, useUser, useAuth } from "@clerk/nextjs";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Activity,
  Bot,
  Check,
  Download,
  Eye,
  Files,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImageIcon,
  Link2,
  Loader2,
  Menu,
  Moon,
  Music,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SendHorizontal,
  Share2,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTheme } from "../_components/theme-provider";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDisplayedFiles, getVisibleFolders } from "./_features/file-feature-filters";
import { getViewMeta, type DisplayMode, type SortMode, type ViewType } from "./_features/feature-types";
import { getVisibleTrashFolders } from "./_features/trash";
import { ShareFileDialog, SharedLinksDialog } from "./_features/share";
import { UploadFeature } from "./_features/upload";
import { SortingFeature } from "./_features/sorting";
import { ViewModeFeature } from "./_features/view-mode";
import { SelectionFeature } from "./_features/selection";
import { RenameFileFeature, RenameFolderFeature } from "./_features/rename";
import { DeleteFolderFeature } from "./_features/delete";
import { FolderActionsFeature } from "./_features/folder-actions";
import { SidebarItemFeature } from "./_features/sidebar";
import { OrganizationWorkspaceFeature } from "./_features/organization-workspace";

type AskAiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  const { isSignedIn, isLoaded, orgId: activeOrgId, orgRole } = useAuth();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { organization } = useOrganization();
  const {
    isLoaded: isOrganizationListLoaded,
    setActive,
    userMemberships,
  } = useOrganizationList({
    userMemberships: true,
  });
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
  const [askAiQuestion, setAskAiQuestion] = useState("");
  const [askAiMessages, setAskAiMessages] = useState<AskAiChatMessage[]>([]);
  const [isAskAiLoading, setIsAskAiLoading] = useState(false);
  const [isEmptyTrashDialogOpen, setIsEmptyTrashDialogOpen] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [isResolvingInviteWorkspace, setIsResolvingInviteWorkspace] = useState(false);
  const inviteWorkspaceCheckKeyRef = useRef<string | null>(null);

  const isOrganizationWorkspace = !!activeOrgId;
  const orgId = activeOrgId ?? user?.id;

  const activeFiles = useQuery(
    api.files.getFiles,
    orgId ? { orgId, shouldDelete: false, actorRole: orgRole ?? undefined } : "skip"
  );

  const trashFiles = useQuery(
    api.files.getFiles,
    orgId ? { orgId, shouldDelete: true, actorRole: orgRole ?? undefined } : "skip"
  );

  const folders = useQuery(
    api.files.getFolders,
    orgId ? { orgId, actorRole: orgRole ?? undefined } : "skip"
  );

  const userRole = useQuery(api.files.getUserRole, orgId ? {} : "skip");
  const activityLogs = useQuery(
    api.files.getActivityLogs,
    orgId ? { orgId, actorRole: orgRole ?? undefined } : "skip"
  );
  const storageStats = useQuery(
    api.files.getStorageStats,
    orgId ? { orgId, actorRole: orgRole ?? undefined } : "skip"
  );
  const shareLinks = useQuery(
    api.files.getShareLinks,
    orgId ? { orgId, actorRole: orgRole ?? undefined } : "skip"
  );
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      !isOrganizationListLoaded ||
      !setActive ||
      isResolvingInviteWorkspace
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const invitedOrgId = params.get("join_org");
    const inviteCheckKey = `${user?.id ?? "unknown"}:${invitedOrgId ?? "single-pending"}`;
    if (inviteWorkspaceCheckKeyRef.current === inviteCheckKey) return;
    inviteWorkspaceCheckKeyRef.current = inviteCheckKey;

    const currentOrgId = organization?.id ?? activeOrgId ?? null;
    if (invitedOrgId && currentOrgId === invitedOrgId) {
      window.history.replaceState(null, "", "/dashboard");
      return;
    }

    const activateOrganization = setActive;
    let cancelled = false;

    async function resolveInviteWorkspace() {
      try {
        setIsResolvingInviteWorkspace(true);
        const memberships = userMemberships.data ?? [];
        const invitedMembership = invitedOrgId
          ? memberships.find((membership) => membership.organization.id === invitedOrgId)
          : undefined;

        if (invitedMembership) {
          await activateOrganization({
            organization: invitedMembership.organization.id,
            navigate: async ({ decorateUrl }) => {
              window.location.replace(decorateUrl("/dashboard"));
            },
          });
          return;
        }

        if (!user) return;

        const invitations = await user.getOrganizationInvitations({ status: "pending" });
        const pendingInvites = invitations.data ?? [];
        const pendingInvite = invitedOrgId
          ? pendingInvites.find((invite) => invite.publicOrganizationData.id === invitedOrgId)
          : pendingInvites.length === 1
          ? pendingInvites[0]
          : undefined;

        if (!pendingInvite) return;

        const nextOrgId = pendingInvite.publicOrganizationData.id;
        const nextOrgName = pendingInvite.publicOrganizationData.name;

        await pendingInvite.accept();
        await user.reload();
        await activateOrganization({
          organization: nextOrgId,
          navigate: async ({ decorateUrl }) => {
            window.location.replace(decorateUrl("/dashboard"));
          },
        });

        if (!cancelled) {
          window.history.replaceState(null, "", "/dashboard");
          router.refresh();
          toast.success(`Joined ${nextOrgName}`);
        }
      } catch (error) {
        console.error("Failed to accept invited organization", error);
        if (!cancelled) toast.error("Invite could not be accepted. Try the invite link again.");
      } finally {
        if (!cancelled) setIsResolvingInviteWorkspace(false);
      }
    }

    if (invitedOrgId || user) {
      void resolveInviteWorkspace();
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeOrgId,
    isLoaded,
    isOrganizationListLoaded,
    isResolvingInviteWorkspace,
    isSignedIn,
    organization?.id,
    router,
    setActive,
    user,
    userMemberships.data,
  ]);

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
      setAskAiQuestion("");
    };

    window.addEventListener("nexdrive:open-ask-ai", openAskAi);
    return () => window.removeEventListener("nexdrive:open-ask-ai", openAskAi);
  }, []);

  const isLoading = activeFiles === undefined || trashFiles === undefined || folders === undefined;
  const currentFolder = folders?.find((folder) => folder._id === currentFolderId);
  const workspaceTitle = isOrganizationWorkspace ? organization?.name ?? "Organization" : "Personal";

  const displayedFiles = useMemo(
    () =>
      getDisplayedFiles({
        activeFiles: activeFiles ?? [],
        trashFiles: trashFiles ?? [],
        search,
        activeView,
        sortMode,
        currentFolderId,
      }),
    [activeFiles, trashFiles, search, activeView, sortMode, currentFolderId]
  );

  useEffect(() => {
    setSelectedFileIds((current) =>
      current.filter((fileId) => displayedFiles.some((file) => file._id === fileId))
    );
  }, [displayedFiles]);

  const viewMeta = getViewMeta(activeView, currentFolder?.name);

  const visibleFolders = useMemo(() => {
    if (activeView === "trash") {
      return getVisibleTrashFolders(folders ?? [], search);
    }

    return getVisibleFolders({
      activeView,
      currentFolderId,
      folders: folders ?? [],
      search,
    });
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

  const workspaceRole = orgRole ?? userRole ?? null;
  const isWorkspaceAdmin = workspaceRole === "org:admin" || workspaceRole === "admin";
  const canManageCurrentWorkspace = !isOrganizationWorkspace || isWorkspaceAdmin;
  const selectedFiles = displayedFiles.filter((file) => selectedFileIds.includes(file._id));
  const selectedFolders = visibleFolders.filter((folder) => selectedFolderIds.includes(folder._id));
  const activeShares = (shareLinks ?? []).filter((share) => !share.isExpired && !share.isRevoked);
  const storageTotal = storageStats?.totalSize ?? 0;
  const storageLimit = 1024 * 1024 * 1024;
  const storagePercent = Math.min(100, Math.round((storageTotal / storageLimit) * 100));
  const selectableFiles = displayedFiles.filter((file) => canManageFile(file));
  const selectableFolders = visibleFolders.filter((folder) => canManageFolder(folder));
  const selectedItemCount = selectedFiles.length + selectedFolders.length;
  const toolbarItemCount = displayedFiles.length + visibleFolders.length;
  const selectableItemCount = selectableFiles.length + selectableFolders.length;
  const trashedFolders = (folders ?? []).filter((folder) => folder.shouldDelete ?? false);
  const emptyTrashFiles = (trashFiles ?? []).filter((file) => canManageFile(file));
  const emptyTrashFolders = trashedFolders.filter((folder) => canManageFolder(folder));
  const emptyTrashItemCount = emptyTrashFiles.length + emptyTrashFolders.length;
  const emptyTrashSummary = [
    emptyTrashFiles.length > 0 ? (emptyTrashFiles.length === 1 ? "1 file" : `${emptyTrashFiles.length} files`) : "",
    emptyTrashFolders.length > 0 ? (emptyTrashFolders.length === 1 ? "1 folder" : `${emptyTrashFolders.length} folders`) : "",
  ].filter(Boolean).join(" and ");
  const allVisibleSelected =
    selectableItemCount > 0 &&
    selectableFiles.every((file) => selectedFileIds.includes(file._id)) &&
    selectableFolders.every((folder) => selectedFolderIds.includes(folder._id));
  function formatBytes(size: number) {
    if (!size) return "0 MB";
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function formatDuration(totalSeconds: number) {
    if (totalSeconds < 60) return `${Math.round(totalSeconds)} seconds`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes} min ${seconds} sec`;
  }

  function normalizeQuestion(value: string) {
    return value.toLowerCase().replace(/[^\w\s.]/g, " ").replace(/\s+/g, " ").trim();
  }

  function createAskAiMessage(role: "user" | "assistant", content: string): AskAiChatMessage {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return { id, role, content };
  }

  function findRelevantFile(question: string, allowedTypes?: string[]) {
    const normalized = normalizeQuestion(question);
    const searchFiles = [...displayedFiles, ...((activeFiles ?? []).filter(
      (file) => !displayedFiles.some((displayed) => displayed._id === file._id)
    ))];

    const filteredByType = allowedTypes?.length
      ? searchFiles.filter((file) => allowedTypes.includes(file.type))
      : searchFiles;

    const byName = filteredByType.find((file) => {
      const candidates = [
        file.name.toLowerCase(),
        file.name.toLowerCase().replace(/\.[^.]+$/, ""),
      ];
      return candidates.some((candidate) => normalized.includes(candidate));
    });

    if (byName) return byName;

    if (allowedTypes?.includes("audio")) {
      return filteredByType.find((file) => file.type === "audio") ?? null;
    }
    if (allowedTypes?.includes("video")) {
      return filteredByType.find((file) => file.type === "video") ?? null;
    }
    if (allowedTypes?.includes("image")) {
      return filteredByType.find((file) => file.type === "image") ?? null;
    }

    return filteredByType[0] ?? null;
  }

  async function readMediaDuration(file: FileItem) {
    if (!file.url || !["audio", "video"].includes(file.type)) return null;

    return await new Promise<number | null>((resolve) => {
      const media = document.createElement(file.type === "audio" ? "audio" : "video");
      media.preload = "metadata";
      media.src = file.url!;

      const cleanup = () => {
        media.removeAttribute("src");
        media.load();
      };

      media.onloadedmetadata = () => {
        const duration = Number.isFinite(media.duration) ? media.duration : null;
        cleanup();
        resolve(duration);
      };

      media.onerror = () => {
        cleanup();
        resolve(null);
      };
    });
  }

  async function requestRemoteAskAi(question: string) {
    const response = await fetch("/api/ask-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        messages: askAiMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        workspaceTitle,
        viewLabel: viewMeta.label,
        files: displayedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          url: file.url,
          size: file.size,
          isFavorite: file.isFavorite ?? false,
          folderId: file.folderId,
        })),
        folders: visibleFolders.map((folder) => ({
          name: folder.name,
          isFavorite: folder.isFavorite ?? false,
        })),
        activeShares: activeShares.length,
        storageTotal,
        storageLimit,
      }),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorPayload?.error || "Remote Ask AI is not available");
    }

    const payload = (await response.json()) as {
      message?: string;
    };

    return payload.message?.trim() || "I could not generate a response just now.";
  }

  async function runAskAi(nextQuestion = askAiQuestion) {
    const question = nextQuestion.trim() || "Summarize this view";
    setIsAskAiOpen(true);
    setIsAskAiLoading(true);
    const userMessage = createAskAiMessage("user", question);
    setAskAiMessages((current) => [...current, userMessage]);
    setAskAiQuestion("");

    try {
      let assistantMessage = "";

      try {
        assistantMessage = await requestRemoteAskAi(question);
      } catch (error) {
        assistantMessage =
          error instanceof Error
            ? `I could not reach the AI service.\n\n${error.message}\n\nIf you just updated the API key, restart the dev server once and try again.`
            : "I could not reach the AI service. Restart the dev server and try again.";
      }

      setAskAiMessages((current) => [
        ...current,
        createAskAiMessage("assistant", assistantMessage),
      ]);
    } finally {
      setIsAskAiLoading(false);
    }
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
      await renameFile({ fileId: renamingFile._id, name: nextName, actorRole: workspaceRole ?? undefined });
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
      await renameFolder({ folderId: renamingFolder.id, name: nextName, actorRole: workspaceRole ?? undefined });
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
      await createFolder({ name: folderName, orgId, actorRole: workspaceRole ?? undefined });
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
      await deleteFolder({ folderId: folderPendingDelete.id, actorRole: workspaceRole ?? undefined });

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
      await restoreFolder({ folderId, actorRole: workspaceRole ?? undefined });
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
      await permanentlyDeleteFolder({ folderId, actorRole: workspaceRole ?? undefined });
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
      await toggleFavoriteFolder({ folderId, actorRole: workspaceRole ?? undefined });
      toast.success(isFavorite ? "Removed from favourites" : "Added to favourites");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update favourite folder");
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
        actorRole: workspaceRole ?? undefined,
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
          await permanentlyDeleteFolder({ folderId: folder._id, actorRole: workspaceRole ?? undefined });
        } else {
          await deleteFolder({ folderId: folder._id, actorRole: workspaceRole ?? undefined });
        }
      }

      for (const file of selectedFiles) {
        if (!canManageFile(file)) continue;
        if (activeView === "trash") {
          await permanentlyDeleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
        } else {
          await deleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
          await restoreFolder({ folderId: folder._id, actorRole: workspaceRole ?? undefined });
        }
      }

      for (const file of selectedFiles) {
        if (canManageFile(file)) {
          await restoreFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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

  async function emptyTrash() {
    if (emptyTrashItemCount === 0) return;

    try {
      setIsEmptyingTrash(true);

      for (const folder of emptyTrashFolders) {
        await permanentlyDeleteFolder({ folderId: folder._id, actorRole: workspaceRole ?? undefined });
      }

      for (const file of emptyTrashFiles) {
        await permanentlyDeleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
      }

      toast.success(emptyTrashItemCount === 1 ? "Item permanently deleted" : "Trash cleared");
      clearSelection();
      setIsEmptyTrashDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear trash");
    } finally {
      setIsEmptyingTrash(false);
    }
  }

  const isDarkTheme = resolvedTheme === "dark";

  function canManageFile(file: FileItem) {
    if (!user?.id) return false;
    const owner = (file.userId ?? "") === user.id || file.orgId === user.id;
    return isOrganizationWorkspace ? isWorkspaceAdmin : owner;
  }

  function canManageFolder(folder: { orgId: string; userId?: string }) {
    if (!user?.id) return false;
    const owner = (folder.userId ?? "") === user.id || folder.orgId === user.id;
    return isOrganizationWorkspace ? isWorkspaceAdmin : owner;
  }

  return (
    <>
      <main className="min-h-[calc(100vh-64px)] bg-[#f6f7f9] dark:bg-zinc-950">
        <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">

            {/* Sidebar */}
          <aside className="relative flex flex-col gap-3 border-b border-zinc-200/80 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-5">
            <UploadFeature>
              <button
                type="button"
                aria-label="Open sections"
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen((open) => !open)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm shadow-zinc-200/60 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-none dark:hover:bg-zinc-800 lg:hidden"
              >
                {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <UploadButton
                folders={folders ?? []}
                disabled={!canManageCurrentWorkspace || !orgId}
                orgId={orgId}
                actorRole={workspaceRole ?? undefined}
              />
            </UploadFeature>

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
              <SidebarItemFeature
                active={activeView === "recent"}
                icon={<Files className="h-4 w-4" />}
                label="All files"
                onClick={() => {
                  setActiveView("recent");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "starred"}
                icon={<Star className="h-4 w-4" />}
                label="Favourites"
                onClick={() => {
                  setActiveView("starred");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "activity"}
                icon={<Activity className="h-4 w-4" />}
                label="Activity"
                onClick={() => {
                  setActiveView("activity");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "folders"}
                icon={<FolderOpen className="h-4 w-4" />}
                label="Folders"
                onClick={() => {
                  setActiveView("folders");
                  setCurrentFolderId(null);
                }}
              />
              <div className="hidden lg:my-3 lg:block lg:h-px lg:bg-zinc-100" />
              <SidebarItemFeature
                active={activeView === "images"}
                icon={<ImageIcon className="h-4 w-4" />}
                label="Images"
                onClick={() => {
                  setActiveView("images");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "videos"}
                icon={<Video className="h-4 w-4" />}
                label="Videos"
                onClick={() => {
                  setActiveView("videos");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "music"}
                icon={<Music className="h-4 w-4" />}
                label="Music"
                onClick={() => {
                  setActiveView("music");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "documents"}
                icon={<FileText className="h-4 w-4" />}
                label="Documents"
                onClick={() => {
                  setActiveView("documents");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
                active={activeView === "pdfs"}
                icon={<FileText className="h-4 w-4" />}
                label="PDFs"
                onClick={() => {
                  setActiveView("pdfs");
                  setCurrentFolderId(null);
                }}
              />
              <SidebarItemFeature
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

          </aside>

          {/* Content */}
          <section className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">

            {/* Search */}
            <div className="nexdrive-fade-up flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2.5 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            {/* Header */}
            <div className="nexdrive-fade-up flex flex-wrap items-center justify-between gap-3 [animation-delay:40ms]">
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
                <OrganizationWorkspaceFeature
                  workspaceName={workspaceTitle}
                  isOrganization={isOrganizationWorkspace}
                  canManage={canManageCurrentWorkspace}
                  fileCount={storageStats?.fileCount ?? 0}
                  activeShares={activeShares.length}
                />
                {activeView === "trash" && emptyTrashItemCount > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 rounded-xl px-3"
                    disabled={isEmptyingTrash}
                    onClick={() => setIsEmptyTrashDialogOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete all
                  </Button>
                )}
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
                <SortingFeature
                  isOpen={isSortMenuOpen}
                  sortMode={sortMode}
                  onToggle={() => setIsSortMenuOpen((open) => !open)}
                  onSelect={(value) => {
                    setSortMode(value);
                    setIsSortMenuOpen(false);
                  }}
                />
                <ViewModeFeature displayMode={displayMode} onChange={setDisplayMode} />
              </div>
            </div>

            {activeView === "folders" && !currentFolderId && (
              <div className="nexdrive-fade-up flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
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
                  disabled={!canManageCurrentWorkspace}
                  onClick={() => setIsFolderDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create folder
                </Button>
              </div>
            )}

            <SelectionFeature
              activeView={activeView}
              selectedItemCount={selectedItemCount}
              isBulkWorking={isBulkWorking}
              onClear={clearSelection}
              onRestore={bulkRestoreSelected}
              onDelete={bulkDeleteSelected}
            />

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
              <div className="nexdrive-fade-up flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
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
                      ? "No favourites yet"
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
                      ? "Mark a file as favourite to add it here"
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
              <div className="nexdrive-fade-up overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                {(activityLogs ?? []).map((item, index) => (
                  <div
                    key={item._id}
                    style={{ "--nexdrive-item-delay": `${Math.min(index * 24, 160)}ms` } as React.CSSProperties}
                    className="nexdrive-item flex items-start gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0"
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
                {visibleFolders.map((folder, index) => (
                  <div
                    key={folder._id}
                    style={{ "--nexdrive-item-delay": `${Math.min(index * 24, 160)}ms` } as React.CSSProperties}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFolderSurfaceClick(folder)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleFolderSurfaceClick(folder);
                      }
                    }}
                    className={`nexdrive-item group relative flex h-20 items-center gap-3 rounded-2xl border px-4 text-left shadow-sm transition-all duration-200 ease-out ${
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
                        <FolderActionsFeature
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
                {visibleFolders.map((folder, index) => (
                  <div
                    key={folder._id}
                    style={{ "--nexdrive-item-delay": `${Math.min(index * 18, 140)}ms` } as React.CSSProperties}
                    role="button"
                    tabIndex={0}
                    className={`nexdrive-item flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 transition-all duration-200 ease-out last:border-b-0 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between ${
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
                        <FolderActionsFeature
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
                {displayedFiles.map((file, index) => (
                  <div
                    key={file._id}
                    style={{ "--nexdrive-item-delay": `${Math.min(index * 18, 140)}ms` } as React.CSSProperties}
                    role="button"
                    tabIndex={0}
                    className={`nexdrive-item flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 transition-all duration-200 ease-out last:border-b-0 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between ${
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
                            disabled={!file.url || !canManageCurrentWorkspace}
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
                                await deleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
                                await restoreFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
                                await permanentlyDeleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
                {displayedFiles.map((file, index) => (
                  <div
                    key={file._id}
                    style={{ "--nexdrive-item-delay": `${Math.min(index * 24, 180)}ms` } as React.CSSProperties}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFileSurfaceClick(file)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleFileSurfaceClick(file);
                      }
                    }}
                    className={`nexdrive-item group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ease-out ${
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
                          disabled={!canManageFile(file)}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!canManageFile(file)) return;
                            try {
                              await toggleFavorite({ fileId: file._id, actorRole: workspaceRole ?? undefined });
                              toast.success(
                                file.isFavorite ? "Removed from favourites" : "Added to favourites"
                              );
                            } catch {
                              toast.error("Failed to update favourite");
                            }
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                              disabled={!file.url || !canManageCurrentWorkspace}
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
                                  await deleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
                                  await restoreFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
                                  await permanentlyDeleteFile({ fileId: file._id, actorRole: workspaceRole ?? undefined });
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
            setAskAiQuestion("");
            setIsAskAiLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <div className="nexdrive-fade-up border-b border-zinc-100 px-5 pb-4 pt-5 dark:border-zinc-800 sm:px-6">
            <DialogHeader className="gap-2 pr-10">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
                  <Sparkles className="h-4 w-4" />
                </span>
                Ask AI
              </DialogTitle>
              <DialogDescription>
                Get quick help from the current {workspaceTitle} workspace without leaving this view.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 bg-zinc-50/55 px-5 py-4 dark:bg-zinc-950/40 sm:px-6">
            <div className="nexdrive-fade-up flex flex-wrap gap-2 [animation-delay:40ms]">
              {[
                "Summarize this view",
                "Find duplicates",
                "Organize better",
                "Clean up first",
                "Review sharing",
              ].map((prompt, index) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isAskAiLoading}
                  onClick={() => void runAskAi(prompt)}
                  style={{ "--nexdrive-item-delay": `${index * 36}ms` } as React.CSSProperties}
                  className="nexdrive-item inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-600 shadow-sm shadow-zinc-200/40 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:hover:text-zinc-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                  {prompt}
                </button>
              ))}
            </div>

            {(askAiMessages.length > 0 || isAskAiLoading) && (
              <div className="nexdrive-soft-scale rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                <div className="max-h-[320px] min-h-[180px] space-y-3 overflow-y-auto p-3 sm:p-4">
                  {askAiMessages.map((message, index) => (
                      <div
                        key={message.id}
                        style={{ "--nexdrive-item-delay": `${Math.min(index * 28, 160)}ms` } as React.CSSProperties}
                        className={`nexdrive-item flex items-end gap-2 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                            <Bot className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm whitespace-pre-wrap ${
                            message.role === "user"
                              ? "rounded-br-md bg-zinc-950 text-white shadow-zinc-300/40 dark:bg-zinc-100 dark:text-zinc-950 dark:shadow-none"
                              : "rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-700 shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:shadow-none"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}

                  {isAskAiLoading ? (
                    <div className="nexdrive-item flex items-end gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:shadow-none">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAskAi(askAiQuestion.trim() || "Summarize this view");
              }}
              className="nexdrive-fade-up space-y-3 [animation-delay:80ms]"
            >
              <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm shadow-zinc-200/50 transition-all duration-200 focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:focus-within:border-zinc-600 dark:focus-within:ring-zinc-800/70">
                <textarea
                  id="ask-ai-question"
                  value={askAiQuestion}
                  onChange={(event) => setAskAiQuestion(event.target.value)}
                  rows={askAiMessages.length > 0 || isAskAiLoading ? 3 : 8}
                  placeholder="Ask about this workspace..."
                  className={`w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                    askAiMessages.length > 0 || isAskAiLoading
                      ? "max-h-36 min-h-24"
                      : "max-h-[320px] min-h-[220px] sm:min-h-[260px]"
                  }`}
                />
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-1 pt-2 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    onClick={() => setAskAiMessages([])}
                    disabled={isAskAiLoading || askAiMessages.length === 0}
                  >
                    Clear
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setIsAskAiOpen(false)}>
                      Close
                    </Button>
                    <Button type="submit" size="sm" className="rounded-xl px-3" disabled={isAskAiLoading}>
                      {isAskAiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-3.5 w-3.5" />
                      )}
                      {isAskAiLoading ? "Thinking" : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="nexdrive-soft-scale fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
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

      <SharedLinksDialog
        open={isSharesDialogOpen}
        onOpenChange={setIsSharesDialogOpen}
        shareLinks={shareLinks ?? []}
        canManage={canManageCurrentWorkspace}
        onRevoke={async (shareId) => {
          await revokeShareLink({ shareId: shareId as Id<"shareLinks">, actorRole: workspaceRole ?? undefined });
        }}
      />

      <ShareFileDialog
        sharingFile={sharingFile ? { name: sharingFile.name } : null}
        shareDuration={shareDuration}
        shareUrl={shareUrl}
        isCreating={isCreatingShareLink}
        onShareDurationChange={setShareDuration}
        onClose={() => {
          setSharingFile(null);
          setShareUrl("");
          setShareDuration("24");
        }}
        onSubmit={submitShareLink}
      />

      <RenameFileFeature
        open={!!renamingFile}
        value={renameValue}
        isRenaming={isRenaming}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRenamingFile(null);
            setRenameValue("");
          }
        }}
        onValueChange={setRenameValue}
        onSubmit={submitRename}
        onCancel={() => {
          setRenamingFile(null);
          setRenameValue("");
        }}
      />

      <RenameFolderFeature
        open={!!renamingFolder}
        value={folderRenameValue}
        isRenaming={isRenamingFolder}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRenamingFolder(null);
            setFolderRenameValue("");
          }
        }}
        onValueChange={setFolderRenameValue}
        onSubmit={submitFolderRename}
        onCancel={() => {
          setRenamingFolder(null);
          setFolderRenameValue("");
        }}
      />

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
        open={isEmptyTrashDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isEmptyingTrash) setIsEmptyTrashDialogOpen(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete everything in trash?</DialogTitle>
            <DialogDescription>
              This will permanently delete {emptyTrashSummary} from {workspaceTitle}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/70 dark:bg-red-950/30 dark:text-red-200">
            Files and folders deleted here will be removed for everyone with access to this workspace.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isEmptyingTrash}
              onClick={() => setIsEmptyTrashDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isEmptyingTrash || emptyTrashItemCount === 0}
              onClick={emptyTrash}
            >
              {isEmptyingTrash ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete all"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteFolderFeature
        open={!!folderPendingDelete}
        folderName={folderPendingDelete?.name ?? ""}
        isDeleting={!!folderPendingDelete && deletingFolderId === folderPendingDelete.id}
        onOpenChange={(isOpen) => {
          if (!isOpen) setFolderPendingDelete(null);
        }}
        onCancel={() => setFolderPendingDelete(null)}
        onConfirm={handleDeleteFolder}
      />
    </>
  );
}
