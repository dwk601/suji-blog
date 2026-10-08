import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Create account | Suji Blog" };

export default function SignUpPage() {
  return (
    <main id="main-content" className={styles.page}>
      <h1 className={styles.title}>Create account</h1>
      <p className={styles.introduction}>Read freely. Create an account to leave comments.</p>
      <Suspense fallback={<p role="status">Loading registration form…</p>}>
        <AuthForm mode="sign-up" />
      </Suspense>
    </main>
  );
}
