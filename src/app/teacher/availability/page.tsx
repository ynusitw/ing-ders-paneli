"use client";

import { useCallback, useEffect, useState } from "react";

type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  status: "OPEN" | "REQUESTED" | "BOOKED";
};

const STATUS_LABEL: Record<Slot["status"], string> = {
  OPEN: "Müsait",
  REQUESTED: "Talep bekliyor",
  BOOKED: "Dolu",
};

const STATUS_CLASS: Record<Slot["status"], string> = {
  OPEN: "bg-green-100 text-green-800",
  REQUESTED: "bg-yellow-100 text-yellow-800",
  BOOKED: "bg-gray-200 text-gray-700",
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AvailabilityPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSlots = useCallback(async (uid: string) => {
    const res = await fetch(`/api/slots?teacherId=${uid}`);
    if (res.ok) setSlots(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/me");
      if (!meRes.ok) return;
      const me = await meRes.json();
      setTeacherId(me.uid);
      await loadSlots(me.uid);
    })();
  }, [loadSlots]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startTime || !endTime) return;
    if (new Date(endTime) <= new Date(startTime)) {
      setError("Bitiş saati başlangıçtan sonra olmalı.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      setStartTime("");
      setEndTime("");
      if (teacherId) await loadSlots(teacherId);
    } catch {
      setError("Slot oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/slots/${id}`, { method: "DELETE" });
    if (res.ok && teacherId) await loadSlots(teacherId);
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-xl font-semibold">Müsaitlik Yönetimi</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Başlangıç</label>
          <input
            type="datetime-local"
            value={startTime}
            min={toLocalInputValue(new Date())}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded border p-2"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Bitiş</label>
          <input
            type="datetime-local"
            value={endTime}
            min={startTime || toLocalInputValue(new Date())}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded border p-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black p-2 px-4 text-white disabled:opacity-50"
        >
          {loading ? "Ekleniyor..." : "Slot Ekle"}
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2">
        {slots.map((slot) => (
          <li
            key={slot.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <span>
              {new Date(slot.startTime).toLocaleString("tr-TR")} —{" "}
              {new Date(slot.endTime).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-1 text-xs ${STATUS_CLASS[slot.status]}`}>
                {STATUS_LABEL[slot.status]}
              </span>
              {slot.status === "OPEN" && (
                <button
                  onClick={() => handleDelete(slot.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Sil
                </button>
              )}
            </div>
          </li>
        ))}
        {slots.length === 0 && (
          <p className="text-sm text-gray-500">Henüz müsaitlik eklemedin.</p>
        )}
      </ul>
    </main>
  );
}
