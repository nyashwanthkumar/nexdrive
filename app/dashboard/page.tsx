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
  Folder,
  FolderOpen,
  Heart,
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

      if (activeView === "favorites") {
        return matchesSearch && file.isFavorite;
      }

      return matchesSearch;
    });
  }, [activeFiles, trashFiles, search, activeView]);

  const workspaceTitle = organization ? organization.name : "Personal workspace";

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  function FileIcon({ type }: { type: string }) {
    if (type === "image") {
      return <ImageIcon className="h-9 w-9 text-sky-600" />;
    }

    if (type === "pdf") {
      return <FileText className="h-9 w-9 text-red-600" />;
    }

    if (type === "csv") {
      return <FileSpreadsheet className="h-9 w-9 text-emerald-600" />;
    }

    return <Folder className="h-9 w-9 text-zinc-500" />;
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f7f9fc]">
      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-6 md:py-5">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-5">
              <UploadButton />
            </div>

            <nav className="space-y-1">
              <SidebarItem
                active={activeView === "all"}
                icon={<FolderOpen className="h-4 w-4" />}
                label="Files"
                onClick={() => setActiveView("all")}
              />
              <SidebarItem
                active={activeView === "favorites"}
                icon={<Heart className="h-4 w-4" />}
                label="Favorites"
                onClick={() => setActiveView("favorites")}
              />
              <SidebarItem
                active={activeView === "trash"}
                icon={<Trash2 className="h-4 w-4" />}
                label="Trash"
                onClick={() => setActiveView("trash")}
              />
            </nav>

            <div className="mt-6 border-t border-zinc-200 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Current Workspace
              </p>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-700">
                    {organization ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>

                  <p className="truncate text-sm font-medium text-zinc-900">
                    {workspaceTitle}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-[#eaf1fd] px-4 py-3">
              <Search className="h-4 w-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in FileDrive"
                className="border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-semibold text-zinc-900">
                  {activeView === "all" && "Files"}
                  {activeView === "favorites" && "Favorites"}
                  {activeView === "trash" && "Trash"}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  {activeView === "all" && "Manage files in the current workspace"}
                  {activeView === "favorites" && "Files marked as important"}
                  {activeView === "trash" && "Restore files or remove them permanently"}
                </p>
              </div>

              {isLoading && (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-zinc-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Loading files...</p>
                </div>
              )}

              {!isLoading && displayedFiles.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center text-center text-zinc-500">
                  <p className="text-lg text-zinc-800">
                    {activeView === "trash" ? "Trash is empty" : "No files found"}
                  </p>
                  <p className="mt-2 text-sm">
                    {activeView === "trash"
                      ? "Deleted files will appear here"
                      : "Upload a file or search with a different name"}
                  </p>
                </div>
              )}

              {!isLoading && displayedFiles.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {displayedFiles.map((file) => (
                    <div
                      key={file._id}
                      className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          {file.type}
                        </span>

                        {activeView !== "trash" && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await toggleFavorite({ fileId: file._id });
                                toast.success(
                                  file.isFavorite
                                    ? "Removed from favorites"
                                    : "Added to favorites"
                                );
                              } catch {
                                toast.error("Failed to update favorite");
                              }
                            }}
                            className="text-zinc-500"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                file.isFavorite
                                  ? "fill-yellow-400 text-yellow-500"
                                  : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      <div className="mx-3 overflow-hidden rounded-lg bg-white">
                        <div className="flex h-40 items-center justify-center bg-zinc-100">
                          {file.type === "image" && file.url ? (
                            <Image
                              src={file.url}
                              alt={file.name}
                              width={360}
                              height={220}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileIcon type={file.type} />
                          )}
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-3">
                        <h3 className="truncate text-lg font-medium text-zinc-900">
                          {file.name}
                        </h3>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {activeView !== "trash" ? (
                            <>
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-white"
                                disabled={!file.url}
                              >
                                <a
                                  href={file.url ?? "#"}
                                  download={file.name}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </a>
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-full"
                                onClick={async () => {
                                  try {
                                    await deleteFile({ fileId: file._id });
                                    toast.success("File moved to trash");
                                  } catch (error) {
                                    const message =
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to move file to trash";
                                    toast.error(message);
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Trash
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-white"
                                onClick={async () => {
                                  try {
                                    await restoreFile({ fileId: file._id });
                                    toast.success("File restored successfully");
                                  } catch (error) {
                                    const message =
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to restore file";
                                    toast.error(message);
                                  }
                                }}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restore
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-full"
                                onClick={async () => {
                                  try {
                                    await permanentlyDeleteFile({ fileId: file._id });
                                    toast.success("File permanently deleted");
                                  } catch (error) {
                                    const message =
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to permanently delete file";
                                    toast.error(message);
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
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
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] ${
        active
          ? "bg-[#cfe7ff] text-[#0b57d0]"
          : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
