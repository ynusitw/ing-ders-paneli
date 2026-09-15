import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

const LINKS = [
  { href: "/student", label: "Panel", icon: "grid" },
  { href: "/student/request-lesson", label: "Ders Talep Et", icon: "plus" },
  { href: "/student/my-requests", label: "Taleplerim", icon: "inbox" },
  { href: "/student/my-lessons", label: "Derslerim", icon: "video" },
  { href: "/student/flashcards", label: "Kelime Kartlarım", icon: "cards" },
  { href: "/student/assignments", label: "Ödevlerim", icon: "check" },
] as const;

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/teacher");

  return (
    <AppShell links={[...LINKS]} fullName={user.fullName} timezone={user.timezone}>
      {children}
    </AppShell>
  );
}
