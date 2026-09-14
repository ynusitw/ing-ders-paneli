"use client";

import { useEffect, useState } from "react";

type LessonStudent = { studentId: string; studentName: string };

type Card = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  repetitions: number;
  dueDate: string;
};

function formatDue(iso: string) {
  const d = new Date(iso);
  if (d <= new Date()) return "bugün tekrar sırasında";
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinde`;
}

function CardForm({ studentId, onAdded }: { studentId: string; onAdded: () => void }) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          term: term.trim(),
          definition: definition.trim(),
          example: example.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setTerm("");
      setDefinition("");
      setExample("");
      onAdded();
    } catch {
      setError("Kart eklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card mb-6 flex flex-wrap items-end gap-3 p-5"
    >
      <div className="min-w-[150px] flex-1">
        <label className="field-label">Kelime</label>
        <input
          type="text"
          placeholder="İngilizce"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="field"
          required
        />
      </div>
      <div className="min-w-[150px] flex-1">
        <label className="field-label">Anlamı</label>
        <input
          type="text"
          placeholder="Türkçe"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="field"
          required
        />
      </div>
      <div className="min-w-[190px] flex-[2]">
        <label className="field-label">Örnek cümle</label>
        <input
          type="text"
          placeholder="Opsiyonel"
          value={example}
          onChange={(e) => setExample(e.target.value)}
          className="field"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary shrink-0">
        {loading ? "Ekleniyor..." : "Kart Ekle"}
      </button>
      {error && <p className="w-full text-xs text-[var(--bad)]">{error}</p>}
    </form>
  );
}

export default function TeacherFlashcardsPage() {
  const [students, setStudents] = useState<LessonStudent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  async function loadCards(studentId: string) {
    setLoaded(false);
    const res = await fetch(`/api/flashcards?studentId=${studentId}`);
    if (res.ok) setCards(await res.json());
    setLoaded(true);
  }

  useEffect(() => {
    if (selected) loadCards(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
    if (res.ok && selected) loadCards(selected);
  }

  return (
    <main className="fade-up mx-auto max-w-3xl p-8">
      <h1 className="page-title mb-1">Kelime Kartları</h1>
      <p className="page-subtitle mb-7">
        Öğrencine kelime kartları ekle; öğrenci bunları aralıklı tekrar (spaced repetition) yöntemiyle çalışır.
      </p>

      {students.length === 0 ? (
        <p className="text-dim text-sm">
          Henüz onaylanmış bir dersin yok, kart eklemek için önce bir öğrencinle dersin olması gerekiyor.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {students.map((s) => (
              <button
                key={s.studentId}
                onClick={() => setSelected(s.studentId)}
                className={`chip ${selected === s.studentId ? "chip-active" : ""}`}
              >
                {s.studentName}
              </button>
            ))}
          </div>

          {selected && <CardForm studentId={selected} onAdded={() => loadCards(selected)} />}

          {loaded && cards.length === 0 && (
            <p className="text-dim text-sm">Bu öğrenci için henüz kelime kartı eklemedin.</p>
          )}

          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <li
                key={card.id}
                className="glass-card glass-card-interactive flex items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {card.term}
                    <span className="text-faint mx-2">→</span>
                    <span className="text-dim font-normal">{card.definition}</span>
                  </p>
                  {card.example && <p className="text-dim mt-0.5 text-sm italic">{card.example}</p>}
                  <p className="text-faint mt-1.5 text-xs">
                    {card.repetitions === 0 ? "Henüz tekrar edilmedi" : `${card.repetitions}. tekrar tamamlandı`} ·
                    sıradaki tekrar {formatDue(card.dueDate)}
                  </p>
                </div>
                <button onClick={() => handleDelete(card.id)} className="btn btn-danger btn-sm shrink-0">
                  Sil
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
