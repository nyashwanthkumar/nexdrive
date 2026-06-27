import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FolderActionsFeature({
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
            {isFavorite ? "Remove from favourites" : "Add to favourites"}
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
