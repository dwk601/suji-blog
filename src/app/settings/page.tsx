import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSiteRole } from "@/lib/site-role";
import styles from "./settings.module.css";

export default function SettingsPage() {
  return (
    <main id="main-content" className={styles.page}>
      <Suspense
        fallback={
          <p className={styles.loading} role="status">
            Loading…
          </p>
        }
      >
        <SettingsContent />
      </Suspense>
    </main>
  );
}

async function SettingsContent() {
  const role = await getSiteRole();
  if (role !== "admin" && role !== "owner") {
    notFound();
  }

  return (
    <>
      <header className={styles.heading}>
        <h1 className={styles.title}>Setting</h1>
      </header>
      <p className={styles.description}>No settings are available yet.</p>
    </>
  );
}
