import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { OwnerSettings } from "@/components/owner-settings";
import { getSiteRole } from "@/lib/site-role";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Settings | Suji Blog" };

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

  const accountFields = { id: user.id, name: user.name, email: user.email };
  const [owner] = await db
    .select(accountFields)
    .from(user)
    .where(eq(user.role, "owner"))
    .limit(1);
  const accounts = role === "admin"
    ? await db
        .select(accountFields)
        .from(user)
        .where(and(
          or(inArray(user.role, ["user", "owner"]), isNull(user.role)),
          or(eq(user.banned, false), isNull(user.banned)),
        ))
        .orderBy(asc(user.name), asc(user.email))
    : [];

  return (
    <>
      <header className={styles.heading}>
        <h1 className={styles.title}>Settings</h1>
      </header>
      <section className={styles.owner} aria-labelledby="owner-title">
        <h2 id="owner-title" className={styles.sectionTitle}>
          Site owner
        </h2>
        {owner ? (
          <div className={styles.identity}>
            <p className={styles.ownerName}>{owner.name}</p>
            <p className={styles.ownerEmail}>{owner.email}</p>
          </div>
        ) : (
          <p className={styles.description}>No owner has been selected yet.</p>
        )}
        <p className={styles.description}>
          {role === "admin"
            ? "Only an admin can change the owner. Admin accounts keep their own access."
            : "You can manage posts, photos, and every comment. Contact the site admin to change the owner."}
        </p>
        {role === "admin" && (
          <OwnerSettings ownerId={owner?.id ?? null} accounts={accounts} />
        )}
      </section>
    </>
  );
}
