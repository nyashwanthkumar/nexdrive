import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "./_components/convex-client-provider";
import { Header } from "./_components/header";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "NexDrive",
  description: "NexDrive - Store your files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <Toaster />
          <Header />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
