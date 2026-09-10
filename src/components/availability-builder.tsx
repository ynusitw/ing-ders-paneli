"use client";

// Calendly tarzı toplu müsaitlik oluşturucu: öğretmen tek tek tarih seçmek yerine
// "hangi günler + hangi saat aralığı + ne kadar sürsün + kaç hafta boyunca" seçer,
// biz bunu somut (gerçek tarihli) AvailabilitySlot'lara bölüp tek seferde yazıyoruz.
import { useMemo, useState } from "react";

const WEEKDAYS = [
  { value: 1, short: "Pzt", label: "Pazartesi" },
  { value: 2, short: "Sal", label: "Salı" },
  { value: 3, short: "Çar", label: "Çarşamba" },
  { value: 4, short: "Per", label: "Perşembe" },
  { value: 5, short: "Cum", label: "Cuma" },
  { value: 6, short: "Cmt", label: "Cumartesi" },
  { value: 0, short: "Paz", label: "Pazar" },
];

const DURATIONS = [
  { value: 30, label: "30 dk" },
  { value: 45, label: "45 dk" },
  { value: 60, label: "60 dk" },
  { value: 90, label: "90 dk" },
];

const WEEKS_AHEAD_OPTIONS = [1, 2, 4, 8, 12];

// 06:00 - 23:30 arası, 30 dk aralıklarla saat seçenekleri.
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function computeSlots({
  weekdays,
  startTime,
  endTime,
  durationMin,
  weeksAhead,
}: {
  weekdays: number[];
  startTime: string;
  endTime: string;
  durationMin: number;
  weeksAhead: number;
}) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (endMin <= startMin || weekdays.length === 0) return [];

  const results: { startTime: string; endTime: string }[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < weeksAhead * 7; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);
    if (!weekdays.includes(day.getDay())) continue;

    for (let m = startMin; m + durationMin <= endMin; m += durationMin) {
      const slotStart = new Date(day);
      slotStart.setMinutes(m);
      if (slotStart <= now) continue;
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotStart.getMinutes() + durationMin);
      results.push({ startTime: slotStart.toISOString(), endTime: slotEnd.toISOString() });
    }
  }
  return results;
}

export function AvailabilityBuilder({
  existingStartTimes,
  onCreated,
}: {
  existingStartTimes: Set<string>;
  onCreated: () => void;
}) {
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("21:00");
  const [duration, setDuration] = useState(60);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const candidates = useMemo(
    () => computeSlots({ weekdays, startTime, endTime, durationMin: duration, weeksAhead }),
    [weekdays, startTime, endTime, duration, weeksAhead]
  );
  const newSlots = useMemo(
    () => candidates.filter((c) => !existingStartTimes.has(c.startTime)),
    [candidates, existingStartTimes]
  );
  const skippedCount = candidates.length - newSlots.length;

  function toggleWeekday(value: number) {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (weekdays.length === 0) {
      setError("En az bir gün seç.");
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError("Bitiş saati başlangıçtan sonra olmalı.");
      return;
    }
    if (newSlots.length === 0) {
      setError("Bu ayarlarla oluşturulacak yeni bir slot yok (hepsi zaten mevcut ya da geçmişte kaldı).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/slots/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: newSlots }),
      });
      if (!res.ok) throw new Error();
      setSuccess(`${newSlots.length} müsaitlik slotu oluşturuldu.`);
      setWeekdays([]);
      onCreated();
    } catch {
      setError("Slotlar oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Hangi günler?</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const selected = weekdays.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleWeekday(day.value)}
              aria-pressed={selected}
              className={`h-11 w-14 rounded-lg text-sm font-medium transition-colors ${
                selected
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {day.short}
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Başlangıç saati
          </label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-lg border p-2 text-sm"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bitiş saati
          </label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-lg border p-2 text-sm"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ders süresi
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-lg border p-2 text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Kaç hafta tekrarlansın
          </label>
          <select
            value={weeksAhead}
            onChange={(e) => setWeeksAhead(Number(e.target.value))}
            className="rounded-lg border p-2 text-sm"
          >
            {WEEKS_AHEAD_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} hafta
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {weekdays.length === 0
            ? "Önce bir gün seç."
            : newSlots.length > 0
              ? `${newSlots.length} yeni slot oluşturulacak${
                  skippedCount > 0 ? ` (${skippedCount} tanesi zaten mevcuttu, atlanacak)` : ""
                }.`
              : "Bu ayarlarla yeni oluşturulacak slot yok."}
        </p>
        <button
          type="submit"
          disabled={loading || newSlots.length === 0}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Oluşturuluyor..." : "Müsaitlik Oluştur"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
    </form>
  );
}
