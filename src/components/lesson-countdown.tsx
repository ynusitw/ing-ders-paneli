"use client";

// Ders listelerinde kalan süreyi canlı gösterir; ders saatine ROOM_EARLY_JOIN_MS
// kala (ya da ders zaten başladıysa, tolerans süresi içindeyse) dikkat çekici
// bir katılma butonuna dönüşür.
//
// Ders başlamadan önce öğretmen odaya doğrudan girer, öğrenci ise bekleme
// odasına düşüp katılım isteği gönderir - bu yüzden buton metni role göre
// değişiyor, öğrenciye "katıldın" izlenimi vermesin.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROOM_EARLY_JOIN_MS, ROOM_GRACE_PERIOD_MS } from "@/lib/status";

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
  isTeacher = false,
}: {
  lessonId: string;
  startTime: string;
  endTime: string;
  isTeacher?: boolean;
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
  const isJoinable = remaining <= ROOM_EARLY_JOIN_MS && now <= endMs + ROOM_GRACE_PERIOD_MS;
  // Ders henüz başlamadıysa öğrenci doğrudan giremez, istek gönderir.
  const isEarlyForStudent = !isTeacher && remaining > 0;

  if (isJoinable) {
    return (
      <Link
        href={`/room/${lessonId}`}
        className="btn btn-success btn-sm shrink-0 animate-pulse rounded-full hover:animate-none"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        {isEarlyForStudent ? "Katılım İsteği Gönder" : "Derse Katıl"}
      </Link>
    );
  }

  if (remaining <= 0) return null;

  return (
    <span className="text-faint shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-[family-name:var(--font-display)] text-xs tabular-nums">
      {formatRemaining(remaining)}
    </span>
  );
}
