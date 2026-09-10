"use client";

import { useEffect, useState } from "react";
import { LESSON_STATUS_CLASS, LESSON_STATUS_LABEL, formatRange, isRoomJoinable } from "@/lib/status";
import { LessonCountdown } from "@/components/lesson-countdown";

type Lesson = {
  id: string;
  studentName: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

export default function TeacherLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => res.json())
      .then(setLessons);
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-xl font-semibold">Onaylanan Dersler</h1>

      {lessons.length === 0 && <p className="text-sm text-gray-500">Henüz onaylanan ders yok.</p>}

      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <span className="font-medium">{lesson.studentName}</span>
              <p className="text-sm text-gray-600">{formatRange(lesson.startTime, lesson.endTime)}</p>
              <span
                className={`mt-1 inline-block rounded px-2 py-1 text-xs ${LESSON_STATUS_CLASS[lesson.status]}`}
              >
                {LESSON_STATUS_LABEL[lesson.status]}
              </span>
            </div>
            {lesson.status === "SCHEDULED" && isRoomJoinable(lesson) && (
              <LessonCountdown
                lessonId={lesson.id}
                startTime={lesson.startTime}
                endTime={lesson.endTime}
              />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
