"use client";

import { useEffect, useState } from "react";
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL, formatRange } from "@/lib/status";

type LessonRequest = {
  id: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  studentNote: string | null;
  teacherNote: string | null;
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<LessonRequest[]>([]);

  useEffect(() => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then(setRequests);
  }, []);

  return (
    <main className="fade-up mx-auto max-w-3xl p-8">
      <h1 className="page-title mb-6">Taleplerim</h1>

      {requests.length === 0 && <p className="text-dim text-sm">Henüz talep göndermedin.</p>}

      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.teacherName}</span>
              <span className={`badge ${REQUEST_STATUS_CLASS[r.status]}`}>
                {REQUEST_STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="text-dim text-sm">{formatRange(r.startTime, r.endTime)}</p>
            {r.studentNote && <p className="mt-1 text-dim text-sm italic">Notun: "{r.studentNote}"</p>}
            {r.teacherNote && (
              <p className="mt-1 text-sm text-gray-700">Öğretmen notu: "{r.teacherNote}"</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
