import Link from "next/link";
import { Suspense } from "react";
import { SettingsLink } from "./settings-link";
import { SiteNavLink } from "./site-nav";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.masthead}>
        <Link href="/" className={styles.brand} aria-label="Suji Blog home">
          suji
        </Link>
      </div>
      <nav aria-label="Main navigation" className={styles.navigation}>
        <ul className={styles.links}>
          <SiteNavLink href="/">Home</SiteNavLink>
          <SiteNavLink href="/posts">Posts</SiteNavLink>
          <Suspense fallback={null}>
            <SettingsLink />
          </Suspense>
        </ul>
      </nav>
    </header>
  );
}
