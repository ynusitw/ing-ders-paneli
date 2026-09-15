import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// Kok adres bir karsilama sayfasi degil, yonlendirme noktasi: oturum varsa
// role gore panele, yoksa giris ekranina goturur.
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "TEACHER" ? "/teacher" : "/student");
}
