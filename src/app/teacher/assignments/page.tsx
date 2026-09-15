"use client";

import { useCallback, useEffect, useState } from "react";
import { LevelProgressCard, type LevelProgressData } from "@/components/level-badge";
import { PASS_SCORE, type Level } from "@/lib/levels";
import type { AssignmentStatus } from "@/types";

type LessonStudent = { studentId: string; studentName: string };

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  level: Level;
  status: AssignmentStatus;
  submission: string | null;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  createdAt: string;
};

const STATUS_BADGE: Record<AssignmentStatus, { label: string; className: string }> = {
  ASSIGNED: { label: "Teslim bekleniyor", className: "badge-slate" },
  SUBMITTED: { label: "Değerlendirme bekliyor", className: "badge-amber" },
  GRADED: { label: "Değerlendirildi", className: "badge-emerald" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

function AssignmentForm({ studentId, onCreated }: { studentId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          title: title.trim(),
          description: description.trim(),
          // Son teslim tarihi gun sonuna ayarlanir.
          dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setTitle("");
      setDescription("");
      setDueDate("");
      onCreated();
    } catch {
      setError("Ödev verilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card mb-8 flex flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-[2]">
          <label className="field-label">Ödev başlığı</label>
          <input
            type="text"
            placeholder="Örn. Present Perfect alıştırmaları"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
            required
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <label className="field-label">Son teslim</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="field"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Açıklama</label>
        <textarea
          placeholder="Öğrenciden ne yapmasını istiyorsun?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="field"
          rows={3}
          required
        />
      </div>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary self-start">
        {loading ? "Gönderiliyor..." : "Ödev Ver"}
      </button>
    </form>
  );
}

type GradeResult = { promoted: boolean; previousLevel?: Level; newLevel?: Level };

function GradeForm({
  assignment,
  onGraded,
}: {
  assignment: Assignment;
  onGraded: (result: GradeResult) => void;
}) {
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericScore = Number(score);
    if (!Number.isInteger(numericScore) || numericScore < 0 || numericScore > 100) {
      setError("Not 0-100 arasında bir tam sayı olmalı.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: numericScore, feedback: feedback.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      onGraded(await res.json());
    } catch {
      setError("Değerlendirme kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="field-label">Not</label>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="0-100"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="field"
            required
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="field-label">Geri bildirim</label>
          <input
            type="text"
            placeholder="Opsiyonel"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="field"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-success shrink-0">
          {loading ? "Kaydediliyor..." : "Değerlendir"}
        </button>
      </div>
      <p className="text-faint mt-2 text-xs">
        {PASS_SCORE} ve üzeri not, seviye atlama sayacına eklenir.
      </p>
      {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
    </form>
  );
}

export default function TeacherAssignmentsPage() {
  const [students, setStudents] = useState<LessonStudent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progress, setProgress] = useState<LevelProgressData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [promotion, setPromotion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => res.json())
      .then((lessons: { studentId: string; studentName: string }[]) => {
        const map = new Map<string, string>();
        for (const l of lessons) map.set(l.studentId, l.studentName);
        const list = Array.from(map.entries()).map(([studentId, studentName]) => ({
          studentId,
          studentName,
        }));
        setStudents(list);
        setSelected((prev) => prev ?? list[0]?.studentId ?? null);
      });
  }, []);

  const load = useCallback(async (studentId: string) => {
    setLoaded(false);
    const [assignmentsRes, levelRes] = await Promise.all([
      fetch(`/api/assignments?studentId=${studentId}`),
      fetch(`/api/levels?studentId=${studentId}`),
    ]);
    if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    if (levelRes.ok) setProgress(await levelRes.json());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (selected) load(selected);
  }, [selected, load]);

  async function handleGraded(result: GradeResult) {
    if (!selected) return;
    setPromotion(
      result.promoted
        ? `Öğrenci ${result.previousLevel} seviyesinden ${result.newLevel} seviyesine geçti.`
        : null
    );
    await load(selected);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    if (res.ok && selected) load(selected);
  }

  return (
    <main className="fade-up mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Ödevler</h1>
      <p className="page-subtitle mb-7">
        Öğrencine ödev ver, değerlendir; başarılı ödevler seviyesini yükseltir.
      </p>

      {students.length === 0 ? (
        <p className="text-dim glass-card p-5 text-sm">
          Henüz onaylanmış bir dersin yok, ödev vermek için önce bir öğrencinle dersin olması
          gerekiyor.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {students.map((s) => (
              <button
                key={s.studentId}
                onClick={() => {
                  setSelected(s.studentId);
                  setPromotion(null);
                }}
                className={`chip ${selected === s.studentId ? "chip-active" : ""}`}
              >
                {s.studentName}
              </button>
            ))}
          </div>

          {progress && (
            <div className="mb-6">
              <LevelProgressCard progress={progress} />
            </div>
          )}

          {promotion && (
            <p className="glass-card glow-ring mb-6 p-4 text-sm text-[var(--ok)]">🎉 {promotion}</p>
          )}

          {selected && (
            <AssignmentForm studentId={selected} onCreated={() => load(selected)} />
          )}

          <h2 className="section-title mb-3">Verilen ödevler</h2>

          {loaded && assignments.length === 0 && (
            <p className="text-dim glass-card p-5 text-sm">Bu öğrenciye henüz ödev vermedin.</p>
          )}

          <ul className="flex flex-col gap-3">
            {assignments.map((a) => (
              <li key={a.id} className="glass-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-dim mt-0.5 text-sm">{a.description}</p>
                    <p className="text-faint mt-1.5 text-xs">
                      {a.level} seviyesi
                      {a.dueDate && ` · son teslim ${formatDate(a.dueDate)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`badge ${STATUS_BADGE[a.status].className}`}>
                      {STATUS_BADGE[a.status].label}
                    </span>
                    {a.status === "ASSIGNED" && (
                      <button onClick={() => handleDelete(a.id)} className="btn btn-danger btn-sm">
                        Sil
                      </button>
                    )}
                  </div>
                </div>

                {a.submission && (
                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-faint mb-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                      Öğrencinin teslimi
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{a.submission}</p>
                  </div>
                )}

                {a.status === "SUBMITTED" && <GradeForm assignment={a} onGraded={handleGraded} />}

                {a.status === "GRADED" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
                    <span
                      className={`badge ${
                        (a.score ?? 0) >= PASS_SCORE ? "badge-emerald" : "badge-rose"
                      }`}
                    >
                      {a.score} / 100
                    </span>
                    {a.feedback && <p className="text-dim text-sm">{a.feedback}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
