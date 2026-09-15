"use client";

import { useEffect, useState } from "react";
import { LESSON_STATUS_CLASS, LESSON_STATUS_LABEL, isRoomJoinable } from "@/lib/status";
import { formatRange } from "@/lib/timezone";
import { useTimezone } from "@/components/timezone-provider";
import { LessonCountdown } from "@/components/lesson-countdown";
import { LessonReport } from "@/components/lesson-report";

type Lesson = {
  id: string;
  studentName: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  reportSummary: string | null;
  reportNextGoal: string | null;
};

// Ders tamamlanirken ya da sonradan yazilan degerlendirme formu.
function ReportForm({
  lesson,
  onSaved,
  onCancel,
}: {
  lesson: Lesson;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [summary, setSummary] = useState(lesson.reportSummary ?? "");
  const [nextGoal, setNextGoal] = useState(lesson.reportNextGoal ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = lesson.status === "COMPLETED";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Ders zaten tamamlandiysa sadece rapor guncellenir.
          ...(isCompleted ? {} : { status: "COMPLETED" }),
          reportSummary: summary,
          reportNextGoal: nextGoal,
        }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Kaydedilemedi.");
        return;
      }
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 w-full border-t border-[var(--border)] pt-4">
      <label className="field-label">Ders değerlendirmesi</label>
      <textarea
        placeholder="Derste ne işlendi, öğrenci nasıldı?"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="field"
        rows={3}
      />

      <label className="field-label mt-3">Sonraki hedef</label>
      <input
        type="text"
        placeholder="Örn. Past Simple düzensiz fiiller"
        value={nextGoal}
        onChange={(e) => setNextGoal(e.target.value)}
        className="field"
      />

      {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn btn-success btn-sm">
          {loading ? "Kaydediliyor..." : isCompleted ? "Raporu Kaydet" : "Dersi Tamamla"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
          Vazgeç
        </button>
      </div>
      <p className="text-faint mt-2 text-xs">
        Boş bırakabilirsin; rapor yazarsan öğrenciye bildirim gider.
      </p>
    </form>
  );
}

export default function TeacherLessonsPage() {
  const tz = useTimezone();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
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
        Ders bittiğinde tamamlandı olarak işaretle ve kısa bir değerlendirme yaz; planı değişirse
        iptal edebilirsin.
      </p>

      {error && <p className="glass-card mb-4 p-4 text-sm text-[var(--bad)]">{error}</p>}

      {lessons.length === 0 && (
        <p className="text-dim glass-card p-5 text-sm">Henüz onaylanan ders yok.</p>
      )}

      <ul className="flex flex-col gap-3">
        {lessons.map((lesson) => {
          const started = Date.now() >= new Date(lesson.startTime).getTime();
          const ended = Date.now() > new Date(lesson.endTime).getTime();
          const isReporting = reportingId === lesson.id;
          const hasReport = Boolean(lesson.reportSummary || lesson.reportNextGoal);

          return (
            <li key={lesson.id} className="glass-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold">{lesson.studentName}</span>
                  <p className="text-dim text-sm">
                    {formatRange(lesson.startTime, lesson.endTime, tz)}
                  </p>
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
                      isTeacher
                    />
                  )}
                  {lesson.status === "SCHEDULED" && started && !isReporting && (
                    <button
                      onClick={() => setReportingId(lesson.id)}
                      className="btn btn-success btn-sm"
                    >
                      Tamamla
                    </button>
                  )}
                  {lesson.status === "COMPLETED" && !isReporting && (
                    <button
                      onClick={() => setReportingId(lesson.id)}
                      className="btn btn-ghost btn-sm"
                    >
                      {hasReport ? "Raporu Düzenle" : "Rapor Yaz"}
                    </button>
                  )}
                  {lesson.status === "SCHEDULED" && !ended && (
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

              {!isReporting && (
                <LessonReport
                  summary={lesson.reportSummary}
                  nextGoal={lesson.reportNextGoal}
                />
              )}

              {isReporting && (
                <ReportForm
                  lesson={lesson}
                  onSaved={async () => {
                    setReportingId(null);
                    await load();
                  }}
                  onCancel={() => setReportingId(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
