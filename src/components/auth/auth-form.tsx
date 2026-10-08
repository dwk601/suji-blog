"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { getNextPostPath } from "./next-path";
import styles from "./auth.module.css";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getNextPostPath(
    searchParams.getAll("next").length === 1 ? searchParams.get("next") : null,
  );
  const registering = mode === "sign-up";
  const [submitting, setSubmitting] = useState(false);
  const [navigating, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const pending = submitting || navigating;
  const alternatePath = registering ? "/sign-in" : "/sign-up";
  const alternateHref = searchParams.has("next")
    ? `${alternatePath}?next=${encodeURIComponent(next)}`
    : alternatePath;

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    if (registering && !name) {
      showError("Enter your name so readers know who is commenting.");
      return;
    }

    setSubmitting(true);
    try {
      const result = registering
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });

      if (result.error) {
        if (!registering) {
          showError(
            "Could not sign in. Check your email and password, then try again.",
          );
        } else if (result.error.code?.startsWith("USER_ALREADY_EXISTS")) {
          showError("An account with this email already exists. Sign in instead.");
        } else {
          showError("Could not create your account. Check your details and try again.");
        }
        return;
      }

      form.reset();
      setSuccess(
        registering
          ? "Account created. Taking you to the posts…"
          : "Signed in. Taking you to the posts…",
      );
      startTransition(() => {
        router.replace(next);
        router.refresh();
      });
    } catch {
      showError(
        "We could not reach the server. Your details are still here; please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form method="post" className={styles.form} onSubmit={submit} aria-busy={pending}>
        <fieldset className={styles.fields} disabled={pending}>
          <legend className={styles.srOnly}>Account details</legend>
          {registering && (
            <div className={styles.field}>
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
              />
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={registering ? 8 : undefined}
              maxLength={128}
              aria-describedby={registering ? "password-hint" : undefined}
            />
            {registering && (
              <p id="password-hint" className={styles.hint}>Use 8–128 characters.</p>
            )}
          </div>
          <button type="submit" className={styles.submit}>
            {pending
              ? (registering ? "Creating account…" : "Signing in…")
              : (registering ? "Create account" : "Sign in")}
          </button>
        </fieldset>
        {error && (
          <p ref={errorRef} className={styles.message} role="alert" tabIndex={-1}>
            {error}
          </p>
        )}
        {success && <p className={styles.message} role="status">{success}</p>}
      </form>
      <p className={styles.alternate}>
        {registering ? "Already have an account?" : "New here?"}{" "}
        <Link href={alternateHref}>{registering ? "Sign in" : "Create an account"}</Link>
      </p>
    </>
  );
}
