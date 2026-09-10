"use client";

import { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

type Props = {
  initialFullName: string;
  email: string;
};

export function SettingsForm({ initialFullName, email }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <NameSection initialFullName={initialFullName} />
      <PasswordSection email={email} />
      <ThemeSection />
    </div>
  );
}

function NameSection({ initialFullName }: { initialFullName: string }) {
  const [fullName, setFullName] = useState(initialFullName);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-medium">Ad Soyad</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="flex-1 rounded border p-2"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Kaydet
        </button>
      </form>
      {status === "success" && <p className="mt-1 text-sm text-green-700">Kaydedildi.</p>}
      {status === "error" && <p className="mt-1 text-sm text-red-600">Kaydedilemedi.</p>}
    </section>
  );
}

function PasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setStatus("loading");
    try {
      const user = clientAuth.currentUser;
      if (!user) throw new Error("no-user");
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setStatus("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setStatus("error");
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Mevcut şifre yanlış.");
      } else if (code === "auth/weak-password") {
        setError("Yeni şifre çok zayıf.");
      } else {
        setError("Şifre değiştirilemedi. Tekrar dene.");
      }
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-medium">Şifre Değiştir</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="password"
          placeholder="Mevcut şifre"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded border p-2"
          required
        />
        <input
          type="password"
          placeholder="Yeni şifre (en az 6 karakter)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded border p-2"
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="Yeni şifre (tekrar)"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded border p-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status === "success" && <p className="text-sm text-green-700">Şifre güncellendi.</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {status === "loading" ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </section>
  );
}

function ThemeSection() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <section>
      <h2 className="mb-2 font-medium">Görünüm</h2>
      {theme && (
        <button onClick={toggle} className="rounded border px-4 py-2 text-sm">
          {theme === "dark" ? "☀️ Aydınlık moda geç" : "🌙 Karanlık moda geç"}
        </button>
      )}
    </section>
  );
}
