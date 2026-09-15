"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvailabilityBuilder } from "@/components/availability-builder";
import { useTimezone } from "@/components/timezone-provider";
import { dayKeyInZone, formatDayHeader, formatTime, timezoneLabel } from "@/lib/timezone";

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
  OPEN: "slot-open",
  REQUESTED: "slot-requested cursor-default",
  BOOKED: "slot-booked cursor-default",
};

export default function AvailabilityPage() {
  const tz = useTimezone();
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
      // Gruplama UTC tarihine göre değil, öğretmenin saat dilimindeki takvim
      // gününe göre yapılmalı; gece yarısına yakın slotlar aksi halde yanlış
      // günün altına düşüyordu.
      const dayKey = dayKeyInZone(slot.startTime, tz);
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(slot);
    }
    return Array.from(map.entries());
  }, [slots, tz]);

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Müsaitlik Yönetimi</h1>
      <p className="page-subtitle mb-7">
        Haftalık müsaitliğini toplu oluştur, boş slotlara tıklayarak kaldır. Saatler {timezoneLabel(tz)} dilimine göre gösteriliyor.
      </p>

      {teacherId && (
        <AvailabilityBuilder
          existingStartTimes={existingStartTimes}
          onCreated={() => loadSlots(teacherId)}
        />
      )}

      {loaded && groupedByDay.length === 0 && (
        <p className="text-dim text-sm">
          Henüz müsaitlik eklemedin. Yukarıdaki araçla haftalık müsaitliğini oluşturabilirsin.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {groupedByDay.map(([dayKey, daySlots]) => (
          <div key={dayKey}>
            <h2 className="section-title mb-3 capitalize">
              {formatDayHeader(daySlots[0].startTime, tz)}
            </h2>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.status !== "OPEN"}
                  onClick={() => handleDelete(slot.id)}
                  title={slot.status === "OPEN" ? "Silmek için tıkla" : STATUS_LABEL[slot.status]}
                  className={`chip tabular-nums ${STATUS_CHIP_CLASS[slot.status]}`}
                >
                  {formatTime(slot.startTime, tz)}–{formatTime(slot.endTime, tz)}
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
