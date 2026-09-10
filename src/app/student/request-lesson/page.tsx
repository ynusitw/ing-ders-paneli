"use client";

import { useEffect, useState } from "react";

type Teacher = { id: string; fullName: string; email: string };
type Slot = { id: string; startTime: string; endTime: string };

export default function RequestLessonPage() {
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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-xl font-semibold">Ders Talep Et</h1>

      <div className="mb-6 flex flex-col gap-1">
        <label className="text-sm text-gray-600">Öğretmen</label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="rounded border p-2"
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
          <p className="mb-2 text-sm text-gray-600">Müsait saatler</p>
          {slots.length === 0 && (
            <p className="text-sm text-gray-500">Bu öğretmenin şu an müsait saati yok.</p>
          )}
          <ul className="flex flex-col gap-2">
            {slots.map((slot) => (
              <li key={slot.id}>
                <button
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`w-full rounded border p-3 text-left ${
                    selectedSlotId === slot.id ? "border-black bg-gray-50" : ""
                  }`}
                >
                  {new Date(slot.startTime).toLocaleString("tr-TR")} —{" "}
                  {new Date(slot.endTime).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
            className="rounded border p-2"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="rounded bg-black p-2 text-white disabled:opacity-50"
          >
            {status === "loading" ? "Gönderiliyor..." : "Talep Gönder"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">Talep gönderilemedi, tekrar dene.</p>
          )}
        </div>
      )}

      {status === "success" && (
        <p className="mt-4 text-sm text-green-700">
          Talebin gönderildi. Durumunu "Taleplerim" sayfasından takip edebilirsin.
        </p>
      )}
    </main>
  );
}
