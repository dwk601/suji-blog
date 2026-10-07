"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { assignOwner, type OwnerResult } from "@/app/settings/actions";
import styles from "@/app/settings/settings.module.css";

type OwnerAccount = { id: string; name: string; email: string };

export function OwnerSettings({
  ownerId,
  accounts,
}: {
  ownerId: string | null;
  accounts: OwnerAccount[];
}) {
  const [selectedId, setSelectedId] = useState(ownerId ?? "");
  const [result, setResult] = useState<OwnerResult | null>(null);
  const [pending, startTransition] = useTransition();
  const messageRef = useRef<HTMLParagraphElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await assignOwner(data);
        setResult(response);
        if (response.status === "error") {
          requestAnimationFrame(() => messageRef.current?.focus());
        }
      } catch {
        setResult({
          status: "error",
          message: "Could not reach the server. Your selection is still here. Try again.",
        });
        requestAnimationFrame(() => messageRef.current?.focus());
      }
    });
  }

  if (!accounts.length) {
    return (
      <p className={styles.description}>
        No eligible accounts yet. Ask the future owner to create an account, then return here.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <fieldset className={styles.fields} disabled={pending}>
        <legend className={styles.formTitle}>Choose the owner</legend>
        <label htmlFor="owner-id">Account</label>
        <select
          id="owner-id"
          name="ownerId"
          required
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
            setResult(null);
          }}
          aria-describedby="owner-hint"
        >
          <option value="" disabled>Select an account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} — {account.email}
            </option>
          ))}
        </select>
        <p id="owner-hint" className={styles.hint}>
          This account will manage all posts, photos, and comments. The previous owner will return to an ordinary commenter account.
        </p>
        <button
          type="submit"
          className={styles.submit}
          disabled={!selectedId || selectedId === ownerId}
        >
          {pending ? "Updating owner…" : "Set owner"}
        </button>
      </fieldset>
      {result && (
        <p
          ref={messageRef}
          className={styles.message}
          role={result.status === "error" ? "alert" : "status"}
          tabIndex={result.status === "error" ? -1 : undefined}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
