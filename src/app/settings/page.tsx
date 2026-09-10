import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const backHref = user.role === "TEACHER" ? "/teacher" : "/student";

  return (
    <main className="mx-auto max-w-lg p-8">
      <Link href={backHref} className="mb-4 inline-block text-sm text-gray-500 hover:underline">
        ← Panele dön
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Ayarlar</h1>
      <SettingsForm initialFullName={user.fullName} email={user.email} />
    </main>
  );
}
