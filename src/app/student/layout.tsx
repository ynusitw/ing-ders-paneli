import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NavBar } from "@/components/nav-bar";
import { Header } from "@/components/header";

const LINKS = [
  { href: "/student", label: "Panel" },
  { href: "/student/request-lesson", label: "Ders Talep Et" },
  { href: "/student/my-requests", label: "Taleplerim" },
  { href: "/student/my-lessons", label: "Derslerim" },
  { href: "/student/flashcards", label: "Kelime Kartlarım" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/teacher");

  return (
    <div className="flex min-h-screen">
      <NavBar links={LINKS} />
      <div className="flex flex-1 flex-col">
        <Header fullName={user.fullName} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
