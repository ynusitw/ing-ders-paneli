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
    <header className="flex justify-end border-b p-2 dark:border-gray-700">
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded p-1.5 pr-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-medium text-white">
            {initialsOf(fullName)}
          </span>
          <span>{fullName}</span>
          <span className="text-xs text-gray-400">▾</span>
        </button>

        {open && (
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ⚙️ Ayarlar
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
