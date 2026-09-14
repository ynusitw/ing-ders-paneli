import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NavBar } from "@/components/nav-bar";
import { Header } from "@/components/header";

const LINKS = [
  { href: "/student", label: "Panel", icon: "grid" },
  { href: "/student/request-lesson", label: "Ders Talep Et", icon: "plus" },
  { href: "/student/my-requests", label: "Taleplerim", icon: "inbox" },
  { href: "/student/my-lessons", label: "Derslerim", icon: "video" },
  { href: "/student/flashcards", label: "Kelime Kartlarım", icon: "cards" },
] as const;

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/teacher");

  return (
    <div className="flex min-h-screen">
      <NavBar links={[...LINKS]} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header fullName={user.fullName} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
