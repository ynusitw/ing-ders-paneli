"use client";

import { useEffect, useState } from "react";
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL, formatRange, isRoomJoinable } from "@/lib/status";
import { LessonCountdown } from "@/components/lesson-countdown";
import { LevelBadge } from "@/components/level-badge";
import type { Level } from "@/lib/levels";

type LessonRequest = {
  id: string;
  teacherName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  startTime: string;
  endTime: string;
};
type Lesson = { id: string; teacherName: string; startTime: string; endTime: string; status: string };

export default function StudentDashboard() {
  const [pending, setPending] = useState<LessonRequest[]>([]);
  const [next, setNext] = useState<Lesson | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  useEffect(() => {
    fetch("/api/levels")
      .then((res) => res.json())
      .then((data: { level: Level }) => setLevel(data.level));
  }, []);

  useEffect(() => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then((requests: LessonRequest[]) =>
        setPending(requests.filter((r) => r.status === "PENDING"))
      );

    fetch("/api/lessons")
      .then((res) => res.json())
      .then((lessons: Lesson[]) => {
        const upcoming = lessons
          .filter((l) => l.status === "SCHEDULED" && isRoomJoinable(l))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setNext(upcoming[0] ?? null);
      });
  }, []);

  return (
    <main className="fade-up mx-auto max-w-3xl p-8">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="page-title">Öğrenci Paneli</h1>
        {level && <LevelBadge level={level} />}
      </div>
      <p className="page-subtitle mb-7">Derslerin ve taleplerin tek bakışta.</p>

      <h2 className="section-title mb-3">Yaklaşan dersin</h2>
      {next ? (
        <div className="glass-card glass-card-interactive mb-8 flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <span className="font-semibold">{next.teacherName}</span>
            <p className="text-dim text-sm">{formatRange(next.startTime, next.endTime)}</p>
          </div>
          <LessonCountdown lessonId={next.id} startTime={next.startTime} endTime={next.endTime} />
        </div>
      ) : (
        <p className="text-dim glass-card mb-8 p-5 text-sm">Yaklaşan dersin yok.</p>
      )}

      <h2 className="section-title mb-3">Bekleyen taleplerin</h2>
      {pending.length === 0 && (
        <p className="text-dim glass-card p-5 text-sm">Bekleyen talebin yok.</p>
      )}
      <ul className="flex flex-col gap-3">
        {pending.map((r) => (
          <li
            key={r.id}
            className="glass-card glass-card-interactive flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <span className="font-semibold">{r.teacherName}</span>
              <p className="text-dim text-sm">{formatRange(r.startTime, r.endTime)}</p>
            </div>
            <span className={`badge ${REQUEST_STATUS_CLASS[r.status]}`}>
              {REQUEST_STATUS_LABEL[r.status]}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
