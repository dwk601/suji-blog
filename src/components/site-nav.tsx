"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-header.module.css";

export function SiteNavLink({
  href,
  children,
}: {
  href: "/" | "/posts" | "/settings";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isCurrent =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

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
