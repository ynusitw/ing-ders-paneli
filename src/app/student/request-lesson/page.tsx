"use client";

import { useEffect, useState } from "react";
import { useTimezone } from "@/components/timezone-provider";
import { formatDateTime, formatTime, timezoneLabel } from "@/lib/timezone";

type Teacher = { id: string; fullName: string; email: string };
type Slot = { id: string; startTime: string; endTime: string };

export default function RequestLessonPage() {
  const tz = useTimezone();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => res.json())
      .then(setTeachers);
  }, []);

  useEffect(() => {
    setSelectedSlotId(null);
    if (!teacherId) {
      setSlots([]);
      return;
    }
    fetch(`/api/slots?teacherId=${teacherId}`)
      .then((res) => res.json())
      .then(setSlots);
  }, [teacherId]);

  async function handleSubmit() {
    if (!selectedSlotId) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlotId, studentNote: note || undefined }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setSlots((prev) => prev.filter((s) => s.id !== selectedSlotId));
      setSelectedSlotId(null);
      setNote("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Ders Talep Et</h1>
      <p className="page-subtitle mb-7">
        Öğretmenini seç, müsait bir saate talep gönder. Saatler {timezoneLabel(tz)} dilimine göre.
      </p>

      <div className="glass-card mb-6 p-5">
        <label className="field-label">Öğretmen</label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="field"
        >
          <option value="">Bir öğretmen seç</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
      </div>

      {teacherId && (
        <div className="mb-6">
          <p className="section-title mb-3">Müsait saatler</p>
          {slots.length === 0 && (
            <p className="text-dim text-sm">Bu öğretmenin şu an müsait saati yok.</p>
          )}
          <ul className="flex flex-col gap-3">
            {slots.map((slot) => (
              <li key={slot.id}>
                <button
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`glass-card glass-card-interactive w-full p-4 text-left ${
                    selectedSlotId === slot.id
                      ? "glow-ring !border-[var(--accent-2)]"
                      : ""
                  }`}
                >
                  {formatDateTime(slot.startTime, tz)} — {formatTime(slot.endTime, tz)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedSlotId && (
        <div className="flex flex-col gap-3">
          <textarea
            placeholder="Öğretmene not (opsiyonel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="field"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="btn btn-primary"
          >
            {status === "loading" ? "Gönderiliyor..." : "Talep Gönder"}
          </button>
          {status === "error" && (
            <p className="text-sm text-[var(--bad)]">Talep gönderilemedi, tekrar dene.</p>
          )}
        </div>
      )}

      {status === "success" && (
        <p className="glass-card mt-4 p-4 text-sm text-[var(--ok)]">
          Talebin gönderildi. Durumunu "Taleplerim" sayfasından takip edebilirsin.
        </p>
      )}
    </main>
  );
}
