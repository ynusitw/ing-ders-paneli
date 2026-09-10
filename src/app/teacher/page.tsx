"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRange } from "@/lib/status";

type LessonRequest = { status: "PENDING" | "APPROVED" | "REJECTED" };
type Lesson = { id: string; studentName: string; startTime: string; endTime: string; status: string };

export default function TeacherDashboard() {
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
          lessons
            .filter((l) => l.status === "SCHEDULED" && new Date(l.startTime) > new Date())
            .slice(0, 3)
        )
      );
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Öğretmen Paneli</h1>

      <Link
        href="/teacher/requests"
        className="mb-6 block rounded border p-4 hover:bg-gray-50"
      >
        <span className="text-2xl font-semibold">{pendingCount}</span>
        <p className="text-sm text-gray-600">bekleyen ders talebi</p>
      </Link>

      <h2 className="mb-2 text-sm font-medium text-gray-600">Yaklaşan dersler</h2>
      {upcoming.length === 0 && <p className="text-sm text-gray-500">Yaklaşan ders yok.</p>}
      <ul className="flex flex-col gap-2">
        {upcoming.map((lesson) => (
          <li key={lesson.id} className="rounded border p-3">
            <span className="font-medium">{lesson.studentName}</span>
            <p className="text-sm text-gray-600">{formatRange(lesson.startTime, lesson.endTime)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
