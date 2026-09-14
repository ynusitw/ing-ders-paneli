"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavIcon = "grid" | "calendar" | "inbox" | "video" | "users" | "cards" | "plus";

type NavLink = { href: string; label: string; icon: NavIcon };

// Tek path'li, ince cizgili minimal ikon seti - harici ikon paketi yerine.
const ICON_PATHS: Record<NavIcon, string> = {
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  calendar: "M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  inbox: "M4 13h4l2 3h4l2-3h4M5 5h14l2 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5l2-8Z",
  video: "M3 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Zm12 3 6-3v10l-6-3",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 8v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  cards: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5",
  plus: "M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm7 6v6m-3-3h6",
};

function Icon({ name }: { name: NavIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0 opacity-80"
      aria-hidden
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export function NavBar({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="glass-card sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-1 rounded-none border-y-0 border-l-0 p-4">
      <Link href={links[0]?.href ?? "/"} className="mb-6 flex items-center gap-2.5 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(120deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] text-[var(--accent-ink)] shadow-[0_10px_24px_-12px_var(--glow-hard)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M4 6h10M4 12h16M4 18h7" strokeLinecap="round" />
          </svg>
        </span>
        <span className="font-[family-name:var(--font-display)] text-sm font-bold leading-tight tracking-tight">
          Ders
          <br />
          Paneli
        </span>
      </Link>

      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          data-active={pathname === link.href}
          className="nav-link"
        >
          <Icon name={link.icon} />
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
