import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NavBar } from "@/components/nav-bar";
import { Header } from "@/components/header";

const LINKS = [
  { href: "/teacher", label: "Panel", icon: "grid" },
  { href: "/teacher/availability", label: "Müsaitlik", icon: "calendar" },
  { href: "/teacher/requests", label: "Talepler", icon: "inbox" },
  { href: "/teacher/lessons", label: "Dersler", icon: "video" },
  { href: "/teacher/students", label: "Öğrenciler", icon: "users" },
  { href: "/teacher/flashcards", label: "Kelime Kartları", icon: "cards" },
  { href: "/teacher/assignments", label: "Ödevler", icon: "check" },
] as const;

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/student");

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
