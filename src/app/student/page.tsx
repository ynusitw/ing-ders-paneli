"use client";

import { useEffect, useState } from "react";
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL, formatRange, isRoomJoinable } from "@/lib/status";
import { LessonCountdown } from "@/components/lesson-countdown";

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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Öğrenci Paneli</h1>

      <h2 className="mb-2 text-sm font-medium text-gray-600">Yaklaşan dersin</h2>
      {next ? (
        <div className="mb-6 flex items-center justify-between rounded border p-4">
          <div>
            <span className="font-medium">{next.teacherName}</span>
            <p className="text-sm text-gray-600">{formatRange(next.startTime, next.endTime)}</p>
          </div>
          <LessonCountdown lessonId={next.id} startTime={next.startTime} endTime={next.endTime} />
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-500">Yaklaşan dersin yok.</p>
      )}

      <h2 className="mb-2 text-sm font-medium text-gray-600">Bekleyen taleplerin</h2>
      {pending.length === 0 && <p className="text-sm text-gray-500">Bekleyen talebin yok.</p>}
      <ul className="flex flex-col gap-2">
        {pending.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <span className="font-medium">{r.teacherName}</span>
              <p className="text-sm text-gray-600">{formatRange(r.startTime, r.endTime)}</p>
            </div>
            <span className={`rounded px-2 py-1 text-xs ${REQUEST_STATUS_CLASS[r.status]}`}>
              {REQUEST_STATUS_LABEL[r.status]}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
