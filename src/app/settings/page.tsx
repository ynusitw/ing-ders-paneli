import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const backHref = user.role === "TEACHER" ? "/teacher" : "/student";

  return (
    <main className="mx-auto max-w-lg p-5 sm:p-8">
      <Link href={backHref} className="mb-4 inline-block text-dim text-sm hover:underline">
        ← Panele dön
      </Link>
      <h1 className="page-title mb-6">Ayarlar</h1>
      <SettingsForm
        initialFullName={user.fullName}
        email={user.email}
        initialTimezone={user.timezone}
      />
    </main>
  );
}
