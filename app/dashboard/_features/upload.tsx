"use client";

import type { ReactNode } from "react";

export function UploadFeature({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 px-1 lg:mb-2">{children}</div>;
}
