"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import type { Role } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role }),
      });
      if (!registerRes.ok) throw new Error("Kayıt başarısız");
      const { customToken } = await registerRes.json();

      const credential = await signInWithCustomToken(clientAuth, customToken);
      const idToken = await credential.user.getIdToken();

      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionRes.ok) throw new Error("Oturum oluşturulamadı");

      router.push(role === "TEACHER" ? "/teacher" : "/student");
    } catch {
      setError("Kayıt olurken bir hata oluştu. E-posta zaten kullanılıyor olabilir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Kayıt Ol</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Ad Soyad"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded border p-2"
          required
        />
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border p-2"
          required
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border p-2"
          required
          minLength={6}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded border p-2"
        >
          <option value="STUDENT">Öğrenci</option>
          <option value="TEACHER">Öğretmen</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black p-2 text-white disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Kayıt Ol"}
        </button>
      </form>
    </main>
  );
}
