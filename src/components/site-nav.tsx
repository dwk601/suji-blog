"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-header.module.css";

type NavHref = "/" | "/posts" | "/posts/new" | "/posts/manage" | "/settings" | "/sign-in" | "/sign-up";

// Editing a post is a management task, so it belongs under Manage posts.
function currentSection(pathname: string): string {
  if (pathname === "/posts/new" || pathname.startsWith("/posts/new/")) return "/posts/new";
  if (pathname === "/posts/manage" || pathname.startsWith("/posts/manage/") || /^\/posts\/[^/]+\/edit\/?$/.test(pathname)) return "/posts/manage";
  if (pathname.startsWith("/posts/")) return "/posts";
  return pathname;
}

export function SiteNavLink({
  href,
  children,
}: {
  href: NavHref;
  children: ReactNode;
}) {
  const isCurrent = currentSection(usePathname()) === href;

  return (
    <li>
      <Link
        href={href}
        className={styles.navLink}
        aria-current={isCurrent ? "page" : undefined}
      >
        {children}
      </Link>
    </li>
  );
}
