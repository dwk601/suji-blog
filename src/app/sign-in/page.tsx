import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Sign in | Suji Blog" };

export default function SignInPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.introduction}>Join the conversation with your Suji account.</p>
      <Suspense fallback={<p role="status">Loading sign-in form…</p>}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </main>
  );
}
