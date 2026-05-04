"use client";

import { useOrganization, useUser, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UploadButton } from "./_components/upload-button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImageIcon,
  Loader2,
  RotateCcw,
  Search,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ViewType = "all" | "favorites" | "trash";

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { organization } = useOrganization();
  const { user } = useUser();

  const deleteFile = useMutation(api.files.deleteFile);
  const restoreFile = useMutation(api.files.restoreFile);
  const permanentlyDeleteFile = useMutation(api.files.permanentlyDeleteFile);
  const toggleFavorite = useMutation(api.files.toggleFavorite);

  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<ViewType>("all");

  const orgId = organization?.id ?? user?.id;

  const activeFiles = useQuery(
    api.files.getFiles,
    orgId ? { orgId, shouldDelete: false } : "skip"
  );

  const trashFiles = useQuery(
    api.files.getFiles,
    orgId ? { orgId, shouldDelete: true } : "skip"
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  const isLoading = activeFiles === undefined || trashFiles === undefined;

  const displayedFiles = useMemo(() => {
    const files = activeView === "trash" ? trashFiles ?? [] : activeFiles ?? [];
    return files.filter((file) => {
      const matchesSearch = file.name
        .toLowerCase()
        .includes(search.toLowerCase());
      if (activeView === "favorites") return matchesSearch && file.isFavorite;
      return matchesSearch;
    });
  }, [activeFiles, trashFiles, search, activeView]);

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
    if (type === "csv") return <FileSpreadsheet className="h-7 w-7 text-emerald-500" />;
    return <FolderOpen className="h-7 w-7 text-zinc-400" />;
  }

  const viewMeta = {
    all: { label: "Files", description: "All files in the current workspace" },
    favorites: { label: "Favourites", description: "Files you have starred" },
    trash: { label: "Trash", description: "Restore or permanently remove deleted files" },
  }[activeView];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-zinc-50">
      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">

        {/* Sidebar */}
        <aside className="flex flex-col border-r border-zinc-200 bg-white px-3 py-5">
          <div className="mb-5 px-1">
            <UploadButton />
          </div>

          <nav className="space-y-0.5">
            <SidebarItem
              active={activeView === "all"}
              icon={<FolderOpen className="h-4 w-4" />}
              label="Files"
              onClick={() => setActiveView("all")}
            />
            <SidebarItem
              active={activeView === "favorites"}
              icon={<Star className="h-4 w-4" />}
              label="Favourites"
              onClick={() => setActiveView("favorites")}
            />
            <SidebarItem
              active={activeView === "trash"}
              icon={<Trash2 className="h-4 w-4" />}
              label="Trash"
              onClick={() => setActiveView("trash")}
            />
          </nav>

          <div className="mt-auto border-t border-zinc-100 pt-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Workspace
            </p>
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
                {organization ? (
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </div>
              <span className="truncate text-sm text-zinc-700 font-medium">
                {workspaceTitle}
              </span>
            </div>
          </div>
        </aside>

        {/* Content */}
        <section className="flex flex-col gap-5 px-6 py-5">

          {/* Search bar */}
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">
                {viewMeta.label}
              </h1>
              <p className="text-sm text-zinc-500">{viewMeta.description}</p>
            </div>
            {!isLoading && displayedFiles.length > 0 && (
              <span className="text-xs text-zinc-400">
                {displayedFiles.length}{" "}
                {displayedFiles.length === 1 ? "file" : "files"}
              </span>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Loading files...</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && displayedFiles.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                {activeView === "trash" ? (
                  <Trash2 className="h-5 w-5 text-zinc-400" />
                ) : activeView === "favorites" ? (
                  <Star className="h-5 w-5 text-zinc-400" />
                ) : (
                  <FolderOpen className="h-5 w-5 text-zinc-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  {activeView === "trash"
                    ? "Trash is empty"
                    : activeView === "favorites"
                    ? "No favourites yet"
                    : "No files found"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {activeView === "trash"
                    ? "Deleted files will appear here"
                    : activeView === "favorites"
                    ? "Star a file to add it here"
                    : search
                    ? "Try a different search term"
                    : "Upload a file to get started"}
                </p>
              </div>
            </div>
          )}

          {/* File grid */}
          {!isLoading && displayedFiles.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {displayedFiles.map((file) => (
                <div
                  key={file._id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="relative h-36 w-full overflow-hidden bg-zinc-50">
                    {file.type === "image" && file.url ? (
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileTypeIcon type={file.type} />
                      </div>
                    )}

                    {activeView !== "trash" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await toggleFavorite({ fileId: file._id });
                            toast.success(
                              file.isFavorite
                                ? "Removed from favourites"
                                : "Added to favourites"
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

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-zinc-900">
                        {file.name}
                      </p>
                      <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {file.type}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {activeView !== "trash" ? (
                        <>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 rounded-lg text-xs"
                            disabled={!file.url}
                          >
                            <a
                              href={file.url ?? "#"}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                              Download
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500"
                            onClick={async () => {
                              try {
                                await deleteFile({ fileId: file._id });
                                toast.success("Moved to trash");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to move to trash"
                                );
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
                            className="h-8 flex-1 rounded-lg text-xs"
                            onClick={async () => {
                              try {
                                await restoreFile({ fileId: file._id });
                                toast.success("File restored");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to restore"
                                );
                              }
                            }}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500"
                            onClick={async () => {
                              try {
                                await permanentlyDeleteFile({
                                  fileId: file._id,
                                });
                                toast.success("Permanently deleted");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to delete"
                                );
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
          ? "bg-zinc-900 font-medium text-white"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
