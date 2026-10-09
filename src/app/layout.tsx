import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import styles from "@/components/site-header.module.css";
import { brand, editorial, geistMono, geistSans } from "@/lib/fonts";
import { getSiteUrl, isPreviewDeployment } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl("/")),
  title: "Suji Blog",
  description: "Thoughts, observations, and personal writing from Suji Blog.",
  robots: isPreviewDeployment ? { index: false, follow: false } : undefined,
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined,
    other: {
      ...(process.env.BING_SITE_VERIFICATION?.trim()
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION.trim() }
        : {}),
      ...(process.env.NAVER_SITE_VERIFICATION?.trim()
        ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION.trim() }
        : {}),
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorial.variable} ${brand.variable} h-full antialiased`}
    >
      <body className={`${styles.shell} min-h-full flex flex-col`}>
        <a href="#main-content" className={styles.skipLink}>Skip to content</a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
