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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="fade-up w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(120deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] text-[var(--accent-ink)] shadow-[0_18px_40px_-14px_var(--glow-hard)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path d="M4 6h10M4 12h16M4 18h7" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="page-title">Hesap Oluştur</h1>
          <p className="page-subtitle mt-1">Birkaç saniyede başla</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
          <div>
            <label className="field-label">Ad Soyad</label>
            <input
              type="text"
              placeholder="Adın Soyadın"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field"
              required
            />
          </div>
          <div>
            <label className="field-label">E-posta</label>
            <input
              type="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              required
            />
          </div>
          <div>
            <label className="field-label">Şifre</label>
            <input
              type="password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="field-label">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {(["STUDENT", "TEACHER"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`chip w-full ${role === r ? "chip-active" : ""}`}
                >
                  {r === "STUDENT" ? "Öğrenci" : "Öğretmen"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-[color-mix(in_srgb,var(--bad)_35%,transparent)] bg-[color-mix(in_srgb,var(--bad)_12%,transparent)] px-3 py-2 text-sm text-[var(--bad)]">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-1 w-full">
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>
      </div>
    </main>
  );
}
