"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isRoomJoinable } from "@/lib/status";
import { formatRange } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";
import { LessonCountdown } from "@/components/lesson-countdown";

type LessonRequest = { status: "PENDING" | "APPROVED" | "REJECTED" };
type Lesson = { id: string; studentName: string; startTime: string; endTime: string; status: string };

export default function TeacherDashboard() {
  const tz = useTimezone();
  const [pendingCount, setPendingCount] = useState(0);
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);

  useEffect(() => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then((requests: LessonRequest[]) =>
        setPendingCount(requests.filter((r) => r.status === "PENDING").length)
      );

    fetch("/api/lessons")
      .then((res) => res.json())
      .then((lessons: Lesson[]) =>
        setUpcoming(
          lessons.filter((l) => l.status === "SCHEDULED" && isRoomJoinable(l)).slice(0, 3)
        )
      );
  }, []);

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Öğretmen Paneli</h1>
      <p className="page-subtitle mb-7">Taleplerini ve yaklaşan derslerini buradan takip et.</p>

      <Link
        href="/teacher/requests"
        className="glass-card glass-card-interactive mb-8 flex items-center gap-5 p-5"
      >
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(120deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--accent-ink)] shadow-[0_16px_36px_-14px_var(--glow-hard)]">
          {pendingCount}
        </span>
        <div>
          <p className="font-semibold">bekleyen ders talebi</p>
          <p className="text-dim text-sm">Görüntülemek için tıkla</p>
        </div>
        <span className="text-faint ml-auto text-lg">→</span>
      </Link>

      <h2 className="section-title mb-3">Yaklaşan dersler</h2>
      {upcoming.length === 0 && (
        <p className="text-dim glass-card p-5 text-sm">Yaklaşan ders yok.</p>
      )}
      <ul className="flex flex-col gap-3">
        {upcoming.map((lesson) => (
          <li
            key={lesson.id}
            className="glass-card glass-card-interactive flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <span className="font-semibold">{lesson.studentName}</span>
              <p className="text-dim text-sm">{formatRange(lesson.startTime, lesson.endTime, tz)}</p>
            </div>
            <LessonCountdown
              lessonId={lesson.id}
              startTime={lesson.startTime}
              endTime={lesson.endTime}
              isTeacher
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
