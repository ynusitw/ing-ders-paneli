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
      className="mb-6 flex flex-wrap items-start gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <input
        type="text"
        placeholder="Kelime / ifade (İngilizce)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="min-w-[160px] flex-1 rounded-lg border p-2 text-sm"
        required
      />
      <input
        type="text"
        placeholder="Anlamı (Türkçe)"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        className="min-w-[160px] flex-1 rounded-lg border p-2 text-sm"
        required
      />
      <input
        type="text"
        placeholder="Örnek cümle (opsiyonel)"
        value={example}
        onChange={(e) => setExample(e.target.value)}
        className="min-w-[200px] flex-[2] rounded-lg border p-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Ekleniyor..." : "Kart Ekle"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-2 text-xl font-semibold">Kelime Kartları</h1>
      <p className="mb-6 text-sm text-gray-500">
        Öğrencine kelime kartları ekle; öğrenci bunları aralıklı tekrar (spaced repetition) yöntemiyle çalışır.
      </p>

      {students.length === 0 ? (
        <p className="text-sm text-gray-500">
          Henüz onaylanmış bir dersin yok, kart eklemek için önce bir öğrencinle dersin olması gerekiyor.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {students.map((s) => (
              <button
                key={s.studentId}
                onClick={() => setSelected(s.studentId)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selected === s.studentId
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {s.studentName}
              </button>
            ))}
          </div>

          {selected && <CardForm studentId={selected} onAdded={() => loadCards(selected)} />}

          {loaded && cards.length === 0 && (
            <p className="text-sm text-gray-500">Bu öğrenci için henüz kelime kartı eklemedin.</p>
          )}

          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <li
                key={card.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium">
                    {card.term} <span className="text-gray-400">→</span> {card.definition}
                  </p>
                  {card.example && <p className="text-sm italic text-gray-500">{card.example}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {card.repetitions === 0 ? "Henüz tekrar edilmedi" : `${card.repetitions}. tekrar tamamlandı`} ·
                    sıradaki tekrar {formatDue(card.dueDate)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(card.id)}
                  className="shrink-0 text-xs text-red-600 hover:underline"
                >
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
