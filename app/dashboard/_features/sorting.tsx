import { Check, ChevronDown, ArrowDownAZ, ArrowDownZA, ArrowUpDown } from "lucide-react";
import type { SortMode } from "./feature-types";

export const sortLabels: Record<SortMode, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  nameAsc: "Name A-Z",
  nameDesc: "Name Z-A",
};

export function SortingFeature({
  isOpen,
  sortMode,
  onToggle,
  onSelect,
}: {
  isOpen: boolean;
  sortMode: SortMode;
  onToggle: () => void;
  onSelect: (mode: SortMode) => void;
}) {
  return (
    <div data-sort-menu className="relative">
      <button
        type="button"
        onClick={onToggle}
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
      {isOpen && (
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
              onClick={() => onSelect(value)}
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
  );
}
