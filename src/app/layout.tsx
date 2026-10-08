import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import styles from "@/components/site-header.module.css";
import { editorial, geistMono, geistSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suji Blog",
  description: "Thoughts, observations, and personal writing from Suji Blog.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorial.variable} h-full antialiased`}
    >
      <body className={`${styles.shell} min-h-full flex flex-col`}>
        <a href="#main-content" className={styles.skipLink}>Skip to content</a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
