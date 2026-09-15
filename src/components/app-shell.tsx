"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavContent, type NavIcon } from "@/components/nav-bar";
import { Header } from "@/components/header";

type NavLink = { href: string; label: string; icon: NavIcon };

// Panel govdesi: genis ekranda sabit kenar cubugu, dar ekranda ust bardaki
// menu dugmesiyle acilan cekmece.
export function AppShell({
  links,
  fullName,
  children,
}: {
  links: NavLink[];
  fullName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Sayfa degisince cekmece acik kalmasin.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    // Cekmece acikken arkadaki sayfa kaymasin.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <nav className="glass-card sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 rounded-none border-y-0 border-l-0 p-4 md:flex">
        <NavContent links={links} />
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <nav className="glass-card slide-in-left absolute inset-y-0 left-0 flex w-64 flex-col gap-1 overflow-y-auto rounded-none border-y-0 border-l-0 p-4">
            <NavContent links={links} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header fullName={fullName} onMenuClick={() => setOpen(true)} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
