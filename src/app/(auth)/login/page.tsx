"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Sunucudaki oturum çerezi kadar Firebase'in tarayıcı tarafındaki
      // oturumu da aynı tercihi izlemeli; aksi halde video odasının
      // Firestore erişimi oturum kapandıktan sonra yetkisiz kalır.
      await setPersistence(
        clientAuth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      const credential = await signInWithEmailAndPassword(clientAuth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, remember }),
      });
      if (!res.ok) throw new Error("Oturum oluşturulamadı");
      const { role } = await res.json();

      router.push(role === "TEACHER" ? "/teacher" : "/student");
    } catch {
      setError("E-posta veya şifre hatalı.");
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
          <h1 className="page-title">Ders Paneli</h1>
          <p className="page-subtitle mt-1">Devam etmek için oturum aç</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
            />
          </div>

          <label className="flex w-fit cursor-pointer select-none items-center gap-2.5">
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="peer sr-only"
              />
              <span className="grid h-5 w-5 place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] transition-all peer-checked:border-transparent peer-checked:bg-[linear-gradient(120deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] peer-checked:shadow-[0_6px_16px_-6px_var(--glow-hard)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-2)] peer-checked:[&_svg]:opacity-100">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-[var(--accent-ink)] opacity-0 transition-opacity"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
            </span>
            <span className="text-dim text-sm">Oturumumu açık tut</span>
          </label>

          {error && (
            <p className="rounded-lg border border-[color-mix(in_srgb,var(--bad)_35%,transparent)] bg-[color-mix(in_srgb,var(--bad)_12%,transparent)] px-3 py-2 text-sm text-[var(--bad)]">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-1 w-full">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </main>
  );
}
