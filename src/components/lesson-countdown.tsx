"use client";

// Ders listelerinde kalan süreyi canlı gösterir; ders başlamasına 5 dakikadan
// az kaldığında (ya da ders zaten başladıysa, tolerans süresi içindeyse)
// dikkat çekici bir "Derse Katıl" butonuna dönüşür.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROOM_GRACE_PERIOD_MS } from "@/lib/status";

const JOIN_WINDOW_MS = 5 * 60 * 1000;

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} gün ${hours} sa sonra`;
  if (hours > 0) return `${hours} sa ${minutes} dk sonra`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LessonCountdown({
  lessonId,
  startTime,
  endTime,
}: {
  lessonId: string;
  startTime: string;
  endTime: string;
}) {
  // Date.now() sunucu/istemci hydration uyumsuzluğu yaratmasın diye başta null.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return null;

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const remaining = startMs - now;
  const isJoinable = remaining <= JOIN_WINDOW_MS && now <= endMs + ROOM_GRACE_PERIOD_MS;

  if (isJoinable) {
    return (
      <Link
        href={`/room/${lessonId}`}
        className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow shadow-green-600/40 hover:animate-none"
      >
        🎥 Derse Katıl
      </Link>
    );
  }

  if (remaining <= 0) return null;

  return <span className="text-xs text-gray-500">Kalan: {formatRemaining(remaining)}</span>;
}
