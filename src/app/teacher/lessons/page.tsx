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
    <main className="fade-up mx-auto max-w-3xl p-8">
      <h1 className="page-title mb-6">Onaylanan Dersler</h1>

      {lessons.length === 0 && <p className="text-dim text-sm">Henüz onaylanan ders yok.</p>}

      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="flex items-center justify-between glass-card p-4">
            <div>
              <span className="font-medium">{lesson.studentName}</span>
              <p className="text-dim text-sm">{formatRange(lesson.startTime, lesson.endTime)}</p>
              <span
                className={`badge mt-1 ${LESSON_STATUS_CLASS[lesson.status]}`}
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
