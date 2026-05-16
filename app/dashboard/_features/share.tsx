"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ShareItem = {
  _id: string;
  token: string;
  fileName: string;
  expiresAt: number;
  isExpired: boolean;
  isRevoked: boolean;
};

type SharingFile = {
  name: string;
} | null;

export function SharedLinksDialog({
  open,
  onOpenChange,
  shareLinks,
  canManage,
  onRevoke,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareLinks: ShareItem[];
  canManage: boolean;
  onRevoke: (shareId: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Shared links</DialogTitle>
          <DialogDescription>
            Review active and expired links without adding more controls to each file.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] space-y-2 overflow-auto">
          {shareLinks.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No shared links yet.
            </div>
          ) : (
            shareLinks.map((share) => {
              const shareUrlValue =
                typeof window === "undefined" ? "" : `${window.location.origin}/share/${share.token}`;
              const inactive = share.isExpired || share.isRevoked;

              return (
                <div
                  key={share._id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{share.fileName}</p>
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
                      disabled={inactive || !canManage}
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
                          await onRevoke(share._id);
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
  );
}

export function ShareFileDialog({
  sharingFile,
  shareDuration,
  shareUrl,
  isCreating,
  onShareDurationChange,
  onClose,
  onSubmit,
}: {
  sharingFile: SharingFile;
  shareDuration: string;
  shareUrl: string;
  isCreating: boolean;
  onShareDurationChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <Dialog
      open={!!sharingFile}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Share file</DialogTitle>
          <DialogDescription>
            Create an expiring link for {sharingFile ? `"${sharingFile.name}"` : "this file"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="share-duration" className="text-sm font-medium text-zinc-700">
              Link expires after
            </label>
            <select
              id="share-duration"
              value={shareDuration}
              onChange={(event) => onShareDurationChange(event.target.value)}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
