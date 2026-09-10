"use client";

import { useEffect, useState } from "react";
import { LESSON_STATUS_CLASS, LESSON_STATUS_LABEL, formatRange, isRoomJoinable } from "@/lib/status";
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

  if (materials === null) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (materials.length === 0) {
    return <p className="text-sm text-gray-500">Bu ders için henüz materyal paylaşılmadı.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {materials.map((m) => (
        <li key={m.id} className="rounded bg-gray-50 p-2 text-sm">
          <p className="font-medium">{m.title}</p>
          {m.content && <p className="text-gray-600">{m.content}</p>}
          {m.fileUrl && (
            <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Dosyayı aç
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => res.json())
      .then(setLessons);
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-xl font-semibold">Yaklaşan Derslerim</h1>

      {lessons.length === 0 && <p className="text-sm text-gray-500">Henüz onaylanmış dersin yok.</p>}

      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{lesson.teacherName}</span>
                <p className="text-sm text-gray-600">{formatRange(lesson.startTime, lesson.endTime)}</p>
                <span
                  className={`mt-1 inline-block rounded px-2 py-1 text-xs ${LESSON_STATUS_CLASS[lesson.status]}`}
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
                  className="text-sm text-gray-600 hover:underline"
                >
                  {openId === lesson.id ? "Materyalleri gizle" : "Materyalleri göster"}
                </button>
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
