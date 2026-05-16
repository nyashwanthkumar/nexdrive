import { RotateCcw, Trash2, X } from "lucide-react";

export function SelectionFeature({
  activeView,
  selectedItemCount,
  isBulkWorking,
  onClear,
  onRestore,
  onDelete,
}: {
  activeView: string;
  selectedItemCount: number;
  isBulkWorking: boolean;
  onClear: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  if (selectedItemCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-zinc-200/80 bg-zinc-100/80 px-3 py-2 shadow-sm shadow-zinc-200/40 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-none">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{selectedItemCount} selected</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {activeView === "trash" ? (
          <button
            type="button"
            disabled={isBulkWorking}
            onClick={onRestore}
            className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-zinc-600 transition hover:bg-white hover:text-zinc-950 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </button>
        ) : null}
        <button
          type="button"
          disabled={isBulkWorking}
          onClick={onDelete}
          className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-zinc-600 transition hover:bg-white hover:text-red-600 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          {activeView === "trash" ? "Delete forever" : "Move to trash"}
        </button>
      </div>
    </div>
  );
}
