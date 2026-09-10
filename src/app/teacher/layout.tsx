import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NavBar } from "@/components/nav-bar";
import { Header } from "@/components/header";

const LINKS = [
  { href: "/teacher", label: "Panel" },
  { href: "/teacher/availability", label: "Müsaitlik" },
  { href: "/teacher/requests", label: "Talepler" },
  { href: "/teacher/lessons", label: "Dersler" },
  { href: "/teacher/students", label: "Öğrenciler" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/student");

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
