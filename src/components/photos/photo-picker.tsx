"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import type { Photo } from "@/lib/photos";
import type { InsertImage } from "@/lib/post-content";
import styles from "./photo-picker.module.css";

type UploadTicket = { key: string; uploadUrl: string; receipt: string; headers: Record<string, string> };
type UploadAttempt = { file: File; ticket?: UploadTicket; photo?: Photo };

class PhotoRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const signal = options?.signal ?? AbortSignal.timeout(20_000);
  let response: Response;
  try { response = await fetch(url, { ...options, signal, cache: "no-store" }); }
  catch { throw new Error(signal.aborted ? "Photos took too long to respond. Please retry." : "Photos could not be reached. Check your connection and retry."); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error(signal.aborted ? "Photos took too long to respond. Please retry." : "The photo response was interrupted. Please retry."); }
  if (!response.ok) throw new PhotoRequestError(result.error || "Photos are unavailable. Please retry.", response.status);
  return result as T;
}

function validPhotoFile(file: File): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
    && file.size >= 1 && file.size <= 10 * 1024 * 1024;
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function PhotoItem({ photo, busy, confirming, onSelect, onConfirm }: {
  photo: Photo; busy: boolean; confirming: boolean; onSelect: (image: InsertImage) => void;
  onConfirm: () => void;
}) {
  const [preview, setPreview] = useState<"loading" | "ready" | "failed">("loading");
  const [retry, setRetry] = useState(0);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (!confirming && wasConfirming.current) deleteButton.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  const label = `photo ${photo.key.split("/").at(-1)}`;
  return (
    <li className={styles.photo}>
      <button className={styles.insert} type="button"
        title={`${photo.contentType.replace("image/", "").toUpperCase()} · ${(photo.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`}
        aria-label={preview === "failed" ? `Retry preview for ${label}` : `Insert ${label}`}
        disabled={busy || preview === "loading"}
        onClick={() => {
          if (preview === "failed") { setPreview("loading"); setRetry(retry + 1); }
          else onSelect({ key: photo.key, alt: "", url: photo.url });
        }}>
        <span className={styles.preview}>
          {/* Native images avoid routing the whole library through image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={retry ? `${photo.url}?preview=${retry}` : photo.url} alt="" loading="lazy"
            onLoad={() => setPreview("ready")} onError={() => setPreview("failed")} />
          {preview === "failed" && <span>Unavailable</span>}
        </span>
        <span>{preview === "failed" ? "Retry preview" : preview === "loading" ? "Loading…" : "Insert photo"}</span>
      </button>
      <button ref={deleteButton} className={styles.delete} type="button" disabled={busy}
        aria-label={`Delete ${label}`} aria-expanded={confirming} onClick={onConfirm}>Delete</button>
    </li>
  );
}

export function PhotoPicker({ onSelect, onUploadPendingChange }: {
  onSelect: (image: InsertImage) => boolean;
  onUploadPendingChange?: (pending: boolean) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const attempt = useRef<UploadAttempt | null>(null);
  // A synchronous lock also guards events before React commits disabled controls.
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirmKey) keepButton.current?.focus(); }, [confirmKey]);
  const invalidFile = file !== null && !validPhotoFile(file);

  useEffect(() => {
    let active = true;
    request<{ photos: Photo[] }>("/api/photos")
      .then((result) => {
        if (active) setPhotos((current) => [...current, ...result.photos.filter((photo) => !current.some((existing) => existing.key === photo.key))]);
      })
      .catch(() => { if (active) setLibraryError("Photos could not load. Use Refresh photos to retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    if (loading || operation.current) return;
    const knownKeys = new Set(photos.map((photo) => photo.key));
    setLoading(true); setLibraryError("");
    try {
      const result = await request<{ photos: Photo[] }>("/api/photos");
      // A photo may finish uploading while the library request is in flight.
      setPhotos((current) => {
        const additions = current.filter((photo) => !knownKeys.has(photo.key));
        return [...additions, ...result.photos.filter((photo) => !additions.some((added) => added.key === photo.key))];
      });
    }
    catch (error) { setLibraryError(error instanceof Error ? error.message : "Photos could not load. Retry refreshing."); }
    finally { setLoading(false); }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next || operation.current) return;
    setFile(next); setUploadError(""); setStatus("");
    attempt.current = null;
    if (!validPhotoFile(next)) {
      setUploadError("Choose a JPEG, PNG, WebP or GIF photo, up to 10 MB.");
      return;
    }
    attempt.current = { file: next };
    void upload();
  }

  async function upload() {
    const current = attempt.current;
    if (!current || operation.current) return;
    operation.current = true;
    setBusy(true); setUploadError("");
    onUploadPendingChange?.(true);
    try {
      if (!current.ticket) {
        setStatus("Preparing upload…");
        const ticket = await request<UploadTicket>("/api/photos/upload-url", json("POST", { contentType: current.file.type, size: current.file.size }));
        setStatus("Uploading photo…");
        let response: Response;
        const signal = AbortSignal.timeout(60_000);
        try { response = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: current.file, signal }); }
        catch { throw new Error(signal.aborted ? "Storage upload timed out. Retry adding your photo." : "Storage could not be reached. Check your connection and retry."); }
        if (!response.ok) throw new Error("Storage did not accept the upload. Retry adding your photo.");
        current.ticket = ticket;
      }
      if (!current.photo) {
        setStatus("Checking uploaded photo…");
        const { photo } = await request<{ photo: Photo }>("/api/photos/complete", json("POST", { receipt: current.ticket.receipt }));
        current.photo = photo;
        setPhotos((photos) => [photo, ...photos.filter((existing) => existing.key !== photo.key)]);
      }
      setStatus("Inserting photo…");
      if (!onSelect({ key: current.photo.key, alt: "", url: current.photo.url })) {
        throw new Error("Your photo uploaded but couldn't be inserted into the post.");
      }
      attempt.current = null;
      setFile(null);
      if (input.current) input.current.value = "";
      setStatus("Photo added. Add alt text in the editor.");
    } catch (error) {
      // Expired or invalid receipts cannot be reused; other completion failures
      // retry only the check, without uploading the bytes again.
      if (error instanceof PhotoRequestError && error.status === 400) current.ticket = undefined;
      setStatus("");
      setUploadError(error instanceof Error ? error.message : "Could not add the photo. Please retry.");
    } finally {
      onUploadPendingChange?.(false);
      operation.current = false;
      setBusy(false);
    }
  }

  async function remove(key: string) {
    if (operation.current || loading) return;
    operation.current = true;
    setBusy(true); setLibraryError(""); setStatus("");
    try {
      await request("/api/photos", json("DELETE", { key }));
      setPhotos((current) => current.filter((photo) => photo.key !== key));
      setConfirmKey(null); setStatus("Photo deleted.");
    } catch (error) { setLibraryError(error instanceof Error ? error.message : "Deletion failed. Please retry."); }
    finally { operation.current = false; setBusy(false); }
  }

  return <section className={styles.picker} aria-labelledby={`${id}-title`}>
    <div className={styles.upload}>
      <h3 className={styles.fileLabel} id={`${id}-title`}>Photos</h3>
      <label className={styles.fileLabel} htmlFor={`${id}-file`}>Choose and add a photo</label>
      <input ref={input} id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        aria-invalid={invalidFile || undefined} aria-describedby={`${id}-hint${uploadError ? ` ${id}-error` : ""}`}
        disabled={busy} onChange={choose} />
      <button type="button" aria-label="Refresh photos" disabled={busy || loading} onClick={() => void refresh()}>Refresh</button>
      {uploadError && file && !invalidFile && <button type="button" disabled={busy} onClick={() => void upload()}>Retry adding photo</button>}
    </div>
    <p className={styles.hint} id={`${id}-hint`}>Auto-inserts. JPEG, PNG, WebP, GIF · Up to 10 MB.</p>
    {uploadError && <p id={`${id}-error`} className={styles.error} role="alert">{uploadError} {!invalidFile && "Your file is retained."}</p>}
    <p className={styles.status} role="status">{status}</p>
    <div className={styles.library} role="region" aria-labelledby={`${id}-library`}>
      <h4 className={styles.fileLabel} id={`${id}-library`}>Photo library</h4>
      {libraryError && <p className={styles.error} role="alert">{libraryError}</p>}
      {loading && <p className={styles.status} role="status">Loading photos…</p>}
      {!loading && !photos.length && !libraryError && <p className={styles.empty}>No photos yet. Choose one above to add it to your post.</p>}
      <ul className={styles.grid} aria-label="Stored photos" tabIndex={photos.length ? 0 : undefined}>{photos.map((photo) => <PhotoItem key={photo.key} photo={photo}
        busy={busy || loading} confirming={confirmKey === photo.key}
        onSelect={(image) => { if (!operation.current) onSelect(image); }}
        onConfirm={() => { setConfirmKey(photo.key); setLibraryError(""); }} />)}</ul>
      {confirmKey && <div className={styles.confirm}>
        <p>Delete this photo permanently? Photos used in a saved post cannot be deleted.</p>
        <button type="button" disabled={busy} onClick={() => void remove(confirmKey)}>{busy ? "Deleting…" : "Delete permanently"}</button>
        <button ref={keepButton} type="button" disabled={busy} onClick={() => setConfirmKey(null)}>Keep photo</button>
      </div>}
    </div>
  </section>;
}
