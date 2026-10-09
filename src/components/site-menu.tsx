"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./site-header.module.css";

export function SiteMenu({
  navigation,
  account,
}: {
  navigation: ReactNode;
  account: ReactNode;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const isOpen = openPath === pathname;
  if (openPath !== null && openPath !== pathname) setOpenPath(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpenPath(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Node) || rootRef.current?.contains(event.target)) return;
      close(rootRef.current?.contains(document.activeElement));
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isOpen, close]);

  return (
    <div
      ref={rootRef}
      className={styles.menuRoot}
      data-open={isOpen}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onClickCapture={(event) => {
        if (
          !isOpen || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
          !(event.target instanceof Element) || !event.target.closest("a[href]")
        ) return;
        close(rootRef.current?.contains(document.activeElement));
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => isOpen ? close() : setOpenPath(pathname)}
      >
        <svg className={styles.menuIcon} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d={isOpen ? "M4 4L16 16M16 4L4 16" : "M2 6H18M2 14H18"} />
        </svg>
        <span>{isOpen ? "Close" : "Menu"}</span>
      </button>
      <div id={panelId} className={styles.menuContent}>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <ul className={styles.links}>{navigation}</ul>
        </nav>
        <nav aria-label="Account" className={styles.accountNavigation}>
          <ul className={styles.accountLinks}>{account}</ul>
        </nav>
      </div>
    </div>
  );
}
