"use client";

import { useEffect, useState } from "react";
import { LESSON_STATUS_CLASS, LESSON_STATUS_LABEL, isRoomJoinable } from "@/lib/status";
import { formatRange } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";
import { LessonCountdown } from "@/components/lesson-countdown";

type Lesson = {
  id: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

type Material = {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
};

function MaterialsList({ lessonId }: { lessonId: string }) {
  const [materials, setMaterials] = useState<Material[] | null>(null);

  useEffect(() => {
    fetch(`/api/materials?lessonId=${lessonId}`)
      .then((res) => res.json())
      .then(setMaterials);
  }, [lessonId]);

  if (materials === null) return <p className="text-dim text-sm">Yükleniyor...</p>;
  if (materials.length === 0) {
    return <p className="text-dim text-sm">Bu ders için henüz materyal paylaşılmadı.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {materials.map((m) => (
        <li key={m.id} className="glass-card p-3 text-sm">
          <p className="font-medium">{m.title}</p>
          {m.content && <p className="text-dim">{m.content}</p>}
          {m.fileUrl && (
            <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-1)] hover:underline">
              Dosyayı aç
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyLessonsPage() {
  const tz = useTimezone();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/lessons");
    if (res.ok) setLessons(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function cancelLesson(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Ders iptal edilemedi.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-6">Derslerim</h1>

      {error && <p className="glass-card mb-4 p-4 text-sm text-[var(--bad)]">{error}</p>}

      {lessons.length === 0 && (
        <p className="text-dim glass-card p-5 text-sm">Henüz onaylanmış dersin yok.</p>
      )}

      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{lesson.teacherName}</span>
                <p className="text-dim text-sm">{formatRange(lesson.startTime, lesson.endTime, tz)}</p>
                <span
                  className={`badge mt-1 ${LESSON_STATUS_CLASS[lesson.status]}`}
                >
                  {LESSON_STATUS_LABEL[lesson.status]}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                {lesson.status === "SCHEDULED" && isRoomJoinable(lesson) && (
                  <LessonCountdown
                    lessonId={lesson.id}
                    startTime={lesson.startTime}
                    endTime={lesson.endTime}
                  />
                )}
                <button
                  onClick={() => setOpenId(openId === lesson.id ? null : lesson.id)}
                  className="text-dim text-sm hover:underline"
                >
                  {openId === lesson.id ? "Materyalleri gizle" : "Materyalleri göster"}
                </button>
                {lesson.status === "SCHEDULED" &&
                  Date.now() <= new Date(lesson.endTime).getTime() && (
                    <button
                      onClick={() => cancelLesson(lesson.id)}
                      disabled={busyId === lesson.id}
                      className="btn btn-danger btn-sm"
                    >
                      İptal Et
                    </button>
                  )}
              </div>
            </div>
            {openId === lesson.id && (
              <div className="mt-3 border-t pt-3">
                <MaterialsList lessonId={lesson.id} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
