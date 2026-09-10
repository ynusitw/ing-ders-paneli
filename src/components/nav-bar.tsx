"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

type NavLink = { href: string; label: string };

export function NavBar({ links }: { links: NavLink[] }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await signOut(clientAuth);
    router.push("/login");
  }

  return (
    <nav className="flex w-48 flex-col gap-1 border-r p-4">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded p-2 text-sm hover:bg-gray-100">
          {link.label}
        </Link>
      ))}
      <button
        onClick={handleLogout}
        className="mt-4 rounded p-2 text-left text-sm text-red-600 hover:bg-gray-100"
      >
        Çıkış Yap
      </button>
    </nav>
  );
}
