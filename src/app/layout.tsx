import type { Metadata } from "next";
import "./globals.css";
import { NotificationProvider } from "@/components/Notifications";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OfflineSupport } from "@/components/OfflineSupport";

export const metadata: Metadata = {
  title: "WFICM — Worship Lyrics to PowerPoint",
  description:
    "Organize your song lyrics, preview your presentation, and generate a PowerPoint for your worship service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NotificationProvider>
            {children}
            <OfflineSupport />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
