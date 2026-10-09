import Link from "next/link";
import { Suspense } from "react";
import { SettingsLink } from "./settings-link";
import { AccountNav } from "./auth/account-nav";
import { SiteNavLink } from "./site-nav";
import { SiteMenu } from "./site-menu";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.masthead}>
        <Link href="/" className={styles.brand} aria-label="Suji Blog home">
          suji
        </Link>
      </div>
      <Suspense fallback={
        <nav aria-label="Main navigation" className={styles.fallbackNavigation}>
          <ul className={styles.fallbackLinks}>
            <li><Link href="/" className={styles.navLink}>Home</Link></li>
            <li><Link href="/posts" className={styles.navLink}>Posts</Link></li>
          </ul>
        </nav>
      }>
        <SiteMenu
          navigation={
            <>
              <SiteNavLink href="/">Home</SiteNavLink>
              <SiteNavLink href="/posts">Posts</SiteNavLink>
              <Suspense fallback={null}>
                <SettingsLink />
              </Suspense>
            </>
          }
          account={
            <Suspense fallback={null}>
              <AccountNav />
            </Suspense>
          }
        />
      </Suspense>
    </header>
  );
}
