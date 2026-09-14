"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

type Props = {
  fullName: string;
};

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Header({ fullName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await signOut(clientAuth);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex justify-end border-b border-[var(--border)] bg-[var(--bg-base)]/60 p-3 backdrop-blur-xl">
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 pr-3 text-sm transition-colors hover:border-[var(--border)] hover:bg-[var(--surface)]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(120deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] text-xs font-bold text-[var(--accent-ink)] shadow-[0_8px_20px_-10px_var(--glow-hard)]">
            {initialsOf(fullName)}
          </span>
          <span className="font-medium">{fullName}</span>
          <span className="text-faint text-[10px]">▼</span>
        </button>

        {open && (
          <div className="glass-card fade-up absolute right-0 z-20 mt-2 w-48 overflow-hidden p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="nav-link w-full"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-[18px] w-[18px] opacity-80"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </svg>
              Ayarlar
            </Link>
            <button onClick={handleLogout} className="nav-link w-full text-[var(--bad)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px] opacity-80"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
