"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { SiteNavLink } from "@/components/site-nav";
import styles from "@/components/site-header.module.css";

export function AccountNav() {
  const router = useRouter();
  const { data: session, isPending, error: sessionError, refetch } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const pending = submitting || refreshing;

  async function handleSignOut() {
    if (pending) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await signOut();
      if (result.error) {
        setError("Could not sign out. Please try again.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server. Please try signing out again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending) {
    return <li className={styles.accountStatus} role="status">Loading account…</li>;
  }

  if (sessionError && !session) {
    return (
      <li>
        <button type="button" className={`${styles.navLink} ${styles.navButton}`} onClick={() => refetch()}>
          Retry account
        </button>
      </li>
    );
  }

  if (!session) return <SiteNavLink href="/sign-in">Sign in</SiteNavLink>;

  return (
    <li className={styles.accountItem}>
      <button
        type="button"
        className={`${styles.navLink} ${styles.navButton}`}
        onClick={handleSignOut}
        disabled={pending}
        aria-label={`Sign out ${session.user.name}`}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <span className={styles.accountError} role="alert">{error}</span>}
    </li>
  );
}
