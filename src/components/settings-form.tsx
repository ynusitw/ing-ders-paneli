"use client";

import { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { COMMON_TIMEZONES, detectTimezone, timezoneLabel } from "@/lib/timezone";

type Props = {
  initialFullName: string;
  email: string;
  initialTimezone: string;
};

export function SettingsForm({ initialFullName, email, initialTimezone }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <NameSection initialFullName={initialFullName} />
      <TimezoneSection initialTimezone={initialTimezone} />
      <PasswordSection email={email} />
      <ThemeSection />
    </div>
  );
}

function TimezoneSection({ initialTimezone }: { initialTimezone: string }) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => {
    setDetected(detectTimezone());
  }, []);

  // Kullanicinin kendi dilimi hazir listede yoksa da secilebilir kalmali.
  const options = Array.from(
    new Set([...COMMON_TIMEZONES, timezone, ...(detected ? [detected] : [])])
  ).sort();

  async function save(next: string) {
    setTimezone(next);
    setStatus("loading");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: next }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      // Saat dilimi sunucudan okunup tum sayfalara dagitildigi icin yenilemek gerekiyor.
      window.location.reload();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section>
      <h2 className="section-title mb-3">Saat Dilimi</h2>
      <p className="text-dim mb-3 text-sm">
        Tüm ders saatleri ve tarihler bu dilime göre gösterilir.
      </p>

      <select value={timezone} onChange={(e) => save(e.target.value)} className="field">
        {options.map((zone) => (
          <option key={zone} value={zone}>
            {timezoneLabel(zone)}
          </option>
        ))}
      </select>

      {detected && detected !== timezone && (
        <button onClick={() => save(detected)} className="btn btn-ghost btn-sm mt-3">
          Cihazımın dilimini kullan ({detected})
        </button>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-[var(--bad)]">Saat dilimi kaydedilemedi.</p>
      )}
    </section>
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
      <h2 className="section-title mb-3">Ad Soyad</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="field flex-1"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn btn-primary"
        >
          Kaydet
        </button>
      </form>
      {status === "success" && <p className="mt-2 text-sm text-[var(--ok)]">Kaydedildi.</p>}
      {status === "error" && <p className="mt-2 text-sm text-[var(--bad)]">Kaydedilemedi.</p>}
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
      <h2 className="section-title mb-3">Şifre Değiştir</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="password"
          placeholder="Mevcut şifre"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="field"
          required
        />
        <input
          type="password"
          placeholder="Yeni şifre (en az 6 karakter)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="field"
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="Yeni şifre (tekrar)"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="field"
          required
        />
        {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
        {status === "success" && <p className="text-sm text-[var(--ok)]">Şifre güncellendi.</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn btn-primary self-start"
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
      <h2 className="section-title mb-3">Görünüm</h2>
      {theme && (
        <button onClick={toggle} className="btn btn-ghost">
          {theme === "dark" ? "☀️ Aydınlık moda geç" : "🌙 Karanlık moda geç"}
        </button>
      )}
    </section>
  );
}
