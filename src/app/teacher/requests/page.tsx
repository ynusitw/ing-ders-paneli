"use client";

import { useEffect, useState } from "react";
import { REQUEST_STATUS_CLASS, REQUEST_STATUS_LABEL, formatRange } from "@/lib/status";

type LessonRequest = {
  id: string;
  studentName: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  studentNote: string | null;
};

export default function TeacherRequestsPage() {
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/requests");
    if (res.ok) setRequests(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-xl font-semibold">Ders Talepleri</h1>

      {pending.length === 0 && (
        <p className="mb-6 text-sm text-gray-500">Bekleyen talep yok.</p>
      )}
      <ul className="mb-8 flex flex-col gap-2">
        {pending.map((r) => (
          <li key={r.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.studentName}</span>
              <span className={`rounded px-2 py-1 text-xs ${REQUEST_STATUS_CLASS[r.status]}`}>
                {REQUEST_STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="text-sm text-gray-600">{formatRange(r.startTime, r.endTime)}</p>
            {r.studentNote && <p className="mt-1 text-sm italic text-gray-500">"{r.studentNote}"</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => decide(r.id, "APPROVED")}
                disabled={busyId === r.id}
                className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                Onayla
              </button>
              <button
                onClick={() => decide(r.id, "REJECTED")}
                disabled={busyId === r.id}
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              >
                Reddet
              </button>
            </div>
          </li>
        ))}
      </ul>

      {decided.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-medium text-gray-600">Geçmiş</h2>
          <ul className="flex flex-col gap-2">
            {decided.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <span className="font-medium">{r.studentName}</span>
                  <p className="text-sm text-gray-600">{formatRange(r.startTime, r.endTime)}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs ${REQUEST_STATUS_CLASS[r.status]}`}>
                  {REQUEST_STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
