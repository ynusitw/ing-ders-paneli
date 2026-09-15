"use client";

import { useEffect, useState } from "react";
import { LESSON_STATUS_CLASS, LESSON_STATUS_LABEL, isRoomJoinable } from "@/lib/status";
import { formatRange } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";
import { LessonCountdown } from "@/components/lesson-countdown";

type Lesson = {
  id: string;
  studentName: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

export default function TeacherLessonsPage() {
  const tz = useTimezone();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/lessons");
    if (res.ok) setLessons(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: "COMPLETED" | "CANCELLED") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "İşlem tamamlanamadı.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Onaylanan Dersler</h1>
      <p className="page-subtitle mb-7">
        Ders bittiğinde tamamlandı olarak işaretle; planı değişirse iptal edebilirsin.
      </p>

      {error && <p className="glass-card mb-4 p-4 text-sm text-[var(--bad)]">{error}</p>}

      {lessons.length === 0 && (
        <p className="text-dim glass-card p-5 text-sm">Henüz onaylanan ders yok.</p>
      )}

      <ul className="flex flex-col gap-3">
        {lessons.map((lesson) => {
          const started = Date.now() >= new Date(lesson.startTime).getTime();
          const ended = Date.now() > new Date(lesson.endTime).getTime();
          return (
            <li key={lesson.id} className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <span className="font-semibold">{lesson.studentName}</span>
                <p className="text-dim text-sm">{formatRange(lesson.startTime, lesson.endTime, tz)}</p>
                <span className={`badge mt-1 ${LESSON_STATUS_CLASS[lesson.status]}`}>
                  {LESSON_STATUS_LABEL[lesson.status]}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {lesson.status === "SCHEDULED" && isRoomJoinable(lesson) && (
                  <LessonCountdown
                    lessonId={lesson.id}
                    startTime={lesson.startTime}
                    endTime={lesson.endTime}
                  />
                )}
                {lesson.status === "SCHEDULED" && started && (
                  <button
                    onClick={() => updateStatus(lesson.id, "COMPLETED")}
                    disabled={busyId === lesson.id}
                    className="btn btn-success btn-sm"
                  >
                    Tamamlandı
                  </button>
                )}
                {lesson.status === "SCHEDULED" && !ended && (
                  <button
                    onClick={() => updateStatus(lesson.id, "CANCELLED")}
                    disabled={busyId === lesson.id}
                    className="btn btn-danger btn-sm"
                  >
                    İptal Et
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
