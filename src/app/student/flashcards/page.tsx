"use client";

import { useEffect, useMemo, useState } from "react";
import { REVIEW_QUALITY, type ReviewQuality } from "@/lib/spaced-repetition";

type Card = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  dueDate: string;
};

const QUALITY_BUTTONS: { quality: ReviewQuality; label: string; gradient: string }[] = [
  { quality: REVIEW_QUALITY.AGAIN, label: "Tekrar", gradient: "linear-gradient(120deg,#fb7185,#e11d48)" },
  { quality: REVIEW_QUALITY.HARD, label: "Zor", gradient: "linear-gradient(120deg,#fbbf24,#f97316)" },
  { quality: REVIEW_QUALITY.GOOD, label: "İyi", gradient: "linear-gradient(120deg,#34d399,#059669)" },
  { quality: REVIEW_QUALITY.EASY, label: "Kolay", gradient: "linear-gradient(120deg,#22d3ee,#6366f1)" },
];

function formatNextDue(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export default function StudentFlashcardsPage() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Oturum basindaki kuyruk boyu - ilerleme cubugunun paydasi.
  const [sessionSize, setSessionSize] = useState(0);

  useEffect(() => {
    fetch("/api/flashcards")
      .then((res) => res.json())
      .then((all: Card[]) => {
        const now = new Date();
        const due = all
          .filter((c) => new Date(c.dueDate) <= now)
          .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
        setCards(all);
        setQueue(due);
        setSessionSize(due.length);
      });
  }, []);

  const nextUpcoming = useMemo(() => {
    if (!cards) return null;
    const now = new Date();
    const future = cards.filter((c) => new Date(c.dueDate) > now).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    return future[0] ?? null;
  }, [cards]);

  async function handleAnswer(quality: ReviewQuality) {
    if (queue.length === 0 || submitting) return;
    const current = queue[0];
    setSubmitting(true);
    try {
      await fetch(`/api/flashcards/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
    } finally {
      setQueue((prev) => prev.slice(1));
      setRevealed(false);
      setSubmitting(false);
    }
  }

  if (cards === null) {
    return (
      <main className="mx-auto max-w-xl p-5 sm:p-8">
        <p className="text-dim text-sm">Yükleniyor...</p>
      </main>
    );
  }

  if (cards.length === 0) {
    return (
      <main className="fade-up mx-auto max-w-xl p-5 sm:p-8">
        <h1 className="page-title mb-1">Kelime Kartlarım</h1>
        <p className="text-dim glass-card mt-6 p-6 text-sm">
          Öğretmenin henüz sana kelime kartı eklemedi.
        </p>
      </main>
    );
  }

  const current = queue[0];
  const done = sessionSize - queue.length;
  const progress = sessionSize === 0 ? 100 : (done / sessionSize) * 100;

  return (
    <main className="fade-up mx-auto max-w-xl p-5 sm:p-8">
      <h1 className="page-title mb-1">Kelime Kartlarım</h1>
      <p className="page-subtitle mb-6">Toplam {cards.length} kelime</p>

      {/* Oturum ilerlemesi */}
      {sessionSize > 0 && (
        <div className="mb-6">
          <div className="text-faint mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
            <span>Bugünkü tekrar</span>
            <span className="tabular-nums">
              {done} / {sessionSize}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-1),var(--accent-2),var(--accent-3))] shadow-[0_0_14px_var(--glow-hard)] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!current ? (
        <div className="glass-card glow-ring p-8 text-center">
          <div className="mb-3 text-4xl">🎉</div>
          <p className="font-[family-name:var(--font-display)] text-xl font-bold">
            Bugünkü tekrarların bitti!
          </p>
          {nextUpcoming && (
            <p className="text-dim mt-2 text-sm">
              Sıradaki tekrar {formatNextDue(nextUpcoming.dueDate)} tarihinde hazır olacak.
            </p>
          )}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => !revealed && setRevealed(true)}
            className={`glass-card glow-ring flex min-h-[260px] w-full flex-col items-center justify-center p-8 text-center transition-transform duration-300 ${
              revealed ? "" : "cursor-pointer hover:-translate-y-1"
            }`}
          >
            <span className="text-faint mb-4 text-[10px] font-bold uppercase tracking-[0.2em]">
              {revealed ? "Cevap" : "Kelime"}
            </span>

            <p className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
              {current.term}
            </p>

            {revealed ? (
              <div className="fade-up mt-5 w-full border-t border-[var(--border)] pt-5">
                <p className="bg-[linear-gradient(100deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] bg-clip-text text-2xl font-semibold text-transparent">
                  {current.definition}
                </p>
                {current.example && (
                  <p className="text-dim mt-3 text-sm italic">“{current.example}”</p>
                )}
              </div>
            ) : (
              <span className="text-faint mt-6 inline-flex items-center gap-2 text-xs">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-2)] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" />
                </span>
                Cevabı görmek için karta dokun
              </span>
            )}
          </button>

          {revealed && (
            <div className="fade-up mt-4 grid grid-cols-4 gap-2">
              {QUALITY_BUTTONS.map((b) => (
                <button
                  key={b.quality}
                  onClick={() => handleAnswer(b.quality)}
                  disabled={submitting}
                  style={{ backgroundImage: b.gradient }}
                  className="btn text-white shadow-[0_10px_26px_-14px_rgba(0,0,0,0.8)] hover:-translate-y-0.5"
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
