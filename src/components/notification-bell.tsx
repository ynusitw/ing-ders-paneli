"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationType } from "@/types";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 60_000;

const TYPE_ICON: Record<NotificationType, string> = {
  REQUEST_CREATED: "📥",
  REQUEST_APPROVED: "✅",
  REQUEST_REJECTED: "✖️",
  ASSIGNMENT_CREATED: "📝",
  ASSIGNMENT_SUBMITTED: "📤",
  ASSIGNMENT_GRADED: "🎯",
  LEVEL_UP: "🎉",
  LESSON_CANCELLED: "🚫",
  LESSON_COMPLETED: "🏁",
};

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  // Paneli acmak bildirimleri okundu sayar; kullanici zaten hepsini gormus olur.
  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) await markAllRead();
  }

  function openNotification(notification: Notification) {
    setOpen(false);
    if (notification.href) router.push(notification.href);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={togglePanel}
        aria-label="Bildirimler"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-transparent transition-colors hover:border-[var(--border)] hover:bg-[var(--surface)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 opacity-80"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[linear-gradient(120deg,var(--accent-1),var(--accent-3))] px-1 text-[10px] font-bold text-[var(--accent-ink)] shadow-[0_0_12px_var(--glow-hard)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-card fade-up absolute right-0 z-30 mt-2 w-80 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-faint text-[10px] font-bold uppercase tracking-[0.2em]">
              Bildirimler
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-dim px-4 py-6 text-center text-sm">Henüz bildirimin yok.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className="flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface)]"
                  >
                    <span className="mt-0.5 text-base leading-none">{TYPE_ICON[n.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{n.title}</span>
                      {n.body && <span className="text-dim mt-0.5 block text-xs">{n.body}</span>}
                      <span className="text-faint mt-1 block text-[11px]">
                        {formatRelative(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-2)] shadow-[0_0_8px_var(--glow-hard)]" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
