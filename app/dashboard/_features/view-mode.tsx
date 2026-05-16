import { Check, Grid2X2, List } from "lucide-react";
import type { DisplayMode } from "./feature-types";

export function ViewModeFeature({
  displayMode,
  onChange,
}: {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="flex h-9 overflow-hidden rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
      <button
        type="button"
        aria-label="List view"
        onClick={() => onChange("list")}
        className={`flex h-8 w-10 items-center justify-center rounded-lg transition-colors ${
          displayMode === "list"
            ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        {displayMode === "list" ? <Check className="h-4 w-4" /> : <List className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={`flex h-8 w-10 items-center justify-center rounded-lg transition-colors ${
          displayMode === "grid"
            ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        {displayMode === "grid" ? <Check className="h-4 w-4" /> : <Grid2X2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
