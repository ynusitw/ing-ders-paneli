import Link from "next/link";

type NavLink = { href: string; label: string };

export function NavBar({ links }: { links: NavLink[] }) {
  return (
    <nav className="flex w-48 flex-col gap-1 border-r p-4 dark:border-gray-700">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
