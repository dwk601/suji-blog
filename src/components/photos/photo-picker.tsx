"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import type { Photo } from "@/lib/photos";
import type { InsertImage } from "@/lib/post-content";
import styles from "./photo-picker.module.css";

type UploadTicket = { key: string; uploadUrl: string; receipt: string; headers: Record<string, string> };

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

function PhotoItem({ photo, busy, confirming, onSelect, onConfirm, onCancel, onDelete }: {
  photo: Photo; busy: boolean; confirming: boolean; onSelect: (image: InsertImage) => void;
  onConfirm: () => void; onCancel: () => void; onDelete: () => void;
}) {
  const [preview, setPreview] = useState<"loading" | "ready" | "failed">("loading");
  const [retry, setRetry] = useState(0);
  const keepButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) keepButton.current?.focus();
    else if (wasConfirming.current) deleteButton.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  const label = `photo ${photo.key.split("/").at(-1)}`;
  return (
    <li className={styles.photo}>
      <div className={styles.preview}>
        {/* Native images avoid routing the whole library through image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={retry ? `${photo.url}?preview=${retry}` : photo.url} alt="" loading="lazy"
          onLoad={() => setPreview("ready")} onError={() => setPreview("failed")} />
        {preview === "failed" && <p>Preview unavailable.</p>}
      </div>
      <p className={styles.metadata}>{photo.contentType.replace("image/", "").toUpperCase()} · {photo.size < 1024 ? `${photo.size} B` : `${(photo.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`}</p>
      {preview === "failed" ? (
        <button type="button" disabled={busy} onClick={() => { setPreview("loading"); setRetry(retry + 1); }}>Retry preview</button>
      ) : (
        <button type="button" aria-label={`Insert ${label}`} disabled={busy || preview !== "ready"}
          onClick={() => onSelect({ key: photo.key, alt: "", url: photo.url })}>
          {preview === "loading" ? "Loading preview…" : "Insert photo"}
        </button>
      )}
      {confirming ? <div className={styles.confirm}>
        <p>Delete this photo permanently? Photos used in a saved post cannot be deleted.</p>
        <button type="button" disabled={busy} onClick={onDelete}>{busy ? "Deleting…" : "Delete permanently"}</button>
        <button ref={keepButton} type="button" disabled={busy} onClick={onCancel}>Keep photo</button>
      </div> : <button ref={deleteButton} type="button" disabled={busy} aria-label={`Delete ${label}`} onClick={onConfirm}>Delete</button>}
    </li>
  );
}

export function PhotoPicker({ onSelect }: { onSelect: (image: InsertImage) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedTicket, setUploadedTicket] = useState<UploadTicket | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const invalidFile = file !== null && !validPhotoFile(file);

  useEffect(() => {
    let active = true;
    request<{ photos: Photo[] }>("/api/photos")
      .then((result) => { if (active) setPhotos(result.photos); })
      .catch(() => { if (active) setError("Photos could not load. Use Refresh photos to retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setLoading(true); setError("");
    try { setPhotos((await request<{ photos: Photo[] }>("/api/photos")).photos); }
    catch (error) { setError(error instanceof Error ? error.message : "Photos could not load. Retry refreshing."); }
    finally { setLoading(false); }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next); setUploadedTicket(null); setError(""); setStatus("");
    if (next && !validPhotoFile(next)) {
      setError("Choose a JPEG, PNG, WebP or GIF photo, up to 10 MB.");
    }
  }

  async function upload() {
    if (!file || !validPhotoFile(file) || busy) return;
    setBusy(true); setError(""); setStatus("Preparing upload…");
    try {
      let ticket = uploadedTicket;
      if (!ticket) {
        ticket = await request<UploadTicket>("/api/photos/upload-url", json("POST", { contentType: file.type, size: file.size }));
        setStatus("Uploading directly to storage…");
        let response: Response;
        const signal = AbortSignal.timeout(60_000);
        try { response = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: file, signal }); }
        catch { throw new Error(signal.aborted ? "Storage upload timed out. Your file is retained; retry uploading." : "Storage could not be reached. Check your connection and retry uploading."); }
        if (!response.ok) throw new Error("Storage did not accept the upload. Retry uploading the photo.");
        setUploadedTicket(ticket);
      }
      setStatus("Checking uploaded photo…");
      const { photo } = await request<{ photo: Photo }>("/api/photos/complete", json("POST", { receipt: ticket.receipt }));
      setPhotos((current) => [photo, ...current.filter((existing) => existing.key !== photo.key)]);
      setFile(null); setUploadedTicket(null);
      if (input.current) input.current.value = "";
      setStatus("Photo uploaded. Insert it below, then add alt text in the editor.");
    } catch (error) {
      if (error instanceof PhotoRequestError && error.status === 400) setUploadedTicket(null);
      setStatus("");
      setError(error instanceof Error ? error.message : "Upload failed. Your file is retained; retry uploading.");
    } finally { setBusy(false); }
  }

  async function remove(key: string) {
    if (busy) return;
    setBusy(true); setError(""); setStatus("");
    try {
      await request("/api/photos", json("DELETE", { key }));
      setPhotos((current) => current.filter((photo) => photo.key !== key));
      setConfirmKey(null); setStatus("Photo deleted.");
    } catch (error) { setError(error instanceof Error ? error.message : "Deletion failed. Please retry."); }
    finally { setBusy(false); }
  }

  return <section className={styles.picker} aria-labelledby={`${id}-title`} aria-busy={busy || loading}>
    <div className={styles.heading}>
      <h3 id={`${id}-title`}>Photos</h3>
      <button type="button" disabled={busy || loading} onClick={() => void refresh()}>Refresh photos</button>
    </div>
    <p className={styles.hint} id={`${id}-hint`}>JPEG, PNG, WebP or GIF, up to 10 MB. Alt text is added to each image in the editor.</p>
    <div className={styles.upload}>
      <label htmlFor={`${id}-file`}>Choose a photo</label>
      <input ref={input} id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        aria-invalid={invalidFile || undefined} aria-describedby={`${id}-hint${invalidFile ? ` ${id}-error` : ""}`}
        disabled={busy || loading} onChange={choose} />
      <button type="button" disabled={!file || invalidFile || busy || loading} onClick={() => void upload()}>
        {busy && file ? "Uploading…" : uploadedTicket ? "Retry checking upload" : error && file ? "Retry upload" : "Upload photo"}
      </button>
    </div>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    <p className={styles.status} role="status">{status || (loading ? "Loading photos…" : "")}</p>
    {!loading && !photos.length && !error && <p className={styles.empty}>No photos yet. Upload one to add it to your post.</p>}
    <ul className={styles.grid}>{photos.map((photo) => <PhotoItem key={photo.key} photo={photo}
      busy={busy || loading} confirming={confirmKey === photo.key} onSelect={onSelect}
      onConfirm={() => { setConfirmKey(photo.key); setError(""); }} onCancel={() => setConfirmKey(null)}
      onDelete={() => void remove(photo.key)} />)}</ul>
  </section>;
}
