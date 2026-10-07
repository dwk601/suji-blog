import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { editorial, geistMono, geistSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suji Blog",
  description: "Suji Blog",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorial.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
