import type { ReactNode } from "react";

export function SidebarItemFeature({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 ease-out hover:translate-x-0.5 active:translate-y-px ${
        active
          ? "bg-zinc-900 font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
