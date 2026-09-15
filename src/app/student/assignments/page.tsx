"use client";

import { useCallback, useEffect, useState } from "react";
import { LevelProgressCard, type LevelProgressData } from "@/components/level-badge";
import { PASS_SCORE, type Level } from "@/lib/levels";
import { useTimezone } from "@/components/timezone-provider";
import { formatDate as formatDateInZone } from "@/lib/timezone";
import type { AssignmentStatus } from "@/types";

type Assignment = {
  id: string;
  teacherName: string;
  title: string;
  description: string;
  dueDate: string | null;
  level: Level;
  status: AssignmentStatus;
  submission: string | null;
  score: number | null;
  feedback: string | null;
  createdAt: string;
};

function SubmitForm({ assignment, onSubmitted }: { assignment: Assignment; onSubmitted: () => void }) {
  const [text, setText] = useState(assignment.submission ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission: text.trim() }),
      });
      if (!res.ok) throw new Error();
      onSubmitted();
    } catch {
      setError("Teslim edilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-[var(--border)] pt-4">
      <label className="field-label">Cevabın</label>
      <textarea
        placeholder="Ödevini buraya yaz ya da bir bağlantı paylaş."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="field"
        rows={4}
        required
      />
      {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary mt-3">
        {loading
          ? "Gönderiliyor..."
          : assignment.status === "SUBMITTED"
            ? "Teslimi Güncelle"
            : "Teslim Et"}
      </button>
    </form>
  );
}

export default function StudentAssignmentsPage() {
  const tz = useTimezone();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [progress, setProgress] = useState<LevelProgressData | null>(null);

  const load = useCallback(async () => {
    const [assignmentsRes, levelRes] = await Promise.all([
      fetch("/api/assignments"),
      fetch("/api/levels"),
    ]);
    if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    if (levelRes.ok) setProgress(await levelRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = assignments?.filter((a) => a.status !== "GRADED") ?? [];
  const graded = assignments?.filter((a) => a.status === "GRADED") ?? [];

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Ödevlerim</h1>
      <p className="page-subtitle mb-7">
        Ödevlerini teslim et; öğretmenin verdiği notlar seviyeni yükseltir.
      </p>

      {progress && (
        <div className="mb-8">
          <LevelProgressCard progress={progress} />
        </div>
      )}

      <h2 className="section-title mb-3">Bekleyen ödevler</h2>
      {assignments !== null && pending.length === 0 && (
        <p className="text-dim glass-card mb-8 p-5 text-sm">Bekleyen ödevin yok.</p>
      )}
      <ul className="mb-8 flex flex-col gap-3">
        {pending.map((a) => (
          <li key={a.id} className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{a.title}</p>
                <p className="text-dim mt-0.5 text-sm">{a.description}</p>
                <p className="text-faint mt-1.5 text-xs">
                  {a.teacherName} · {a.level} seviyesi
                  {a.dueDate && ` · son teslim ${formatDateInZone(a.dueDate, tz)}`}
                </p>
              </div>
              <span
                className={`badge shrink-0 ${a.status === "SUBMITTED" ? "badge-amber" : "badge-slate"}`}
              >
                {a.status === "SUBMITTED" ? "Değerlendirme bekliyor" : "Teslim edilmedi"}
              </span>
            </div>

            <SubmitForm assignment={a} onSubmitted={load} />
          </li>
        ))}
      </ul>

      {graded.length > 0 && (
        <>
          <h2 className="section-title mb-3">Değerlendirilenler</h2>
          <ul className="flex flex-col gap-3">
            {graded.map((a) => {
              const passed = (a.score ?? 0) >= PASS_SCORE;
              return (
                <li key={a.id} className="glass-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-faint mt-1 text-xs">
                        {a.teacherName} · {a.level} seviyesi
                      </p>
                    </div>
                    <span className={`badge shrink-0 ${passed ? "badge-emerald" : "badge-rose"}`}>
                      {a.score} / 100
                    </span>
                  </div>

                  {a.feedback && (
                    <p className="text-dim mt-3 border-t border-[var(--border)] pt-3 text-sm">
                      {a.feedback}
                    </p>
                  )}

                  <p className="text-faint mt-2 text-xs">
                    {passed
                      ? "Bu ödev seviye atlama sayacına eklendi."
                      : `Seviye sayacına eklenmesi için ${PASS_SCORE} ve üzeri gerekiyor.`}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
