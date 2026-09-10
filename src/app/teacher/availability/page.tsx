"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvailabilityBuilder } from "@/components/availability-builder";

type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  status: "OPEN" | "REQUESTED" | "BOOKED";
};

const STATUS_LABEL: Record<Slot["status"], string> = {
  OPEN: "Müsait",
  REQUESTED: "Talep var",
  BOOKED: "Dolu",
};

// Boş (OPEN) slotlar dikkat çekici bir renkte ve tıklanabilir (silmek için);
// dolu/talep bekleyen slotlar soluk ve pasif görünür.
const STATUS_CHIP_CLASS: Record<Slot["status"], string> = {
  OPEN: "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer",
  REQUESTED: "bg-amber-400 text-amber-950 cursor-default",
  BOOKED: "bg-gray-200 text-gray-500 cursor-default",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDayHeader(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function AvailabilityPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadSlots = useCallback(async (uid: string) => {
    const res = await fetch(`/api/slots?teacherId=${uid}`);
    if (res.ok) setSlots(await res.json());
    setLoaded(true);
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

  async function handleDelete(id: string) {
    const res = await fetch(`/api/slots/${id}`, { method: "DELETE" });
    if (res.ok && teacherId) await loadSlots(teacherId);
  }

  // Toplu oluşturucunun aynı saati iki kez eklememesi için mevcut başlangıç zamanları.
  const existingStartTimes = useMemo(() => new Set(slots.map((s) => s.startTime)), [slots]);

  const groupedByDay = useMemo(() => {
    const sorted = [...slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const map = new Map<string, Slot[]>();
    for (const slot of sorted) {
      const dayKey = slot.startTime.slice(0, 10);
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(slot);
    }
    return Array.from(map.entries());
  }, [slots]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Müsaitlik Yönetimi</h1>

      {teacherId && (
        <AvailabilityBuilder
          existingStartTimes={existingStartTimes}
          onCreated={() => loadSlots(teacherId)}
        />
      )}

      {loaded && groupedByDay.length === 0 && (
        <p className="text-sm text-gray-500">
          Henüz müsaitlik eklemedin. Yukarıdaki araçla haftalık müsaitliğini oluşturabilirsin.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {groupedByDay.map(([dayKey, daySlots]) => (
          <div key={dayKey}>
            <h2 className="mb-2 text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">
              {formatDayHeader(daySlots[0].startTime)}
            </h2>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.status !== "OPEN"}
                  onClick={() => handleDelete(slot.id)}
                  title={slot.status === "OPEN" ? "Silmek için tıkla" : STATUS_LABEL[slot.status]}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${STATUS_CHIP_CLASS[slot.status]}`}
                >
                  {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                  {slot.status !== "OPEN" && (
                    <span className="ml-1.5 text-xs opacity-75">· {STATUS_LABEL[slot.status]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
