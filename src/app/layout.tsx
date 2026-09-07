import type { Metadata } from "next";
import "./globals.css";
import { NotificationProvider } from "@/components/Notifications";

export const metadata: Metadata = {
  title:
    "Warrior of Faith International Christian Ministry — Worship Lyrics to PowerPoint",
  description:
    "Organize your song lyrics, preview your presentation, and generate a PowerPoint for your worship service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
