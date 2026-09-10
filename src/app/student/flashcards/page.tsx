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

const QUALITY_BUTTONS: { quality: ReviewQuality; label: string; className: string }[] = [
  { quality: REVIEW_QUALITY.AGAIN, label: "Tekrar", className: "bg-red-500 hover:bg-red-600" },
  { quality: REVIEW_QUALITY.HARD, label: "Zor", className: "bg-amber-500 hover:bg-amber-600" },
  { quality: REVIEW_QUALITY.GOOD, label: "İyi", className: "bg-emerald-500 hover:bg-emerald-600" },
  { quality: REVIEW_QUALITY.EASY, label: "Kolay", className: "bg-blue-600 hover:bg-blue-500" },
];

function formatNextDue(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export default function StudentFlashcardsPage() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      <main className="mx-auto max-w-xl p-8">
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      </main>
    );
  }

  if (cards.length === 0) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="mb-2 text-xl font-semibold">Kelime Kartlarım</h1>
        <p className="text-sm text-gray-500">Öğretmenin henüz sana kelime kartı eklemedi.</p>
      </main>
    );
  }

  const current = queue[0];

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-1 text-xl font-semibold">Kelime Kartlarım</h1>
      <p className="mb-6 text-sm text-gray-500">Toplam {cards.length} kelime</p>

      {!current ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-lg font-medium">Harika, bugünkü tekrarların bitti! 🎉</p>
          {nextUpcoming && (
            <p className="mt-2 text-sm text-gray-500">
              Sıradaki tekrar {formatNextDue(nextUpcoming.dueDate)} tarihinde hazır olacak.
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-500">{queue.length} kart kaldı</p>
          <div
            onClick={() => !revealed && setRevealed(true)}
            className={`flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
              !revealed ? "cursor-pointer" : ""
            }`}
          >
            <p className="text-2xl font-semibold">{current.term}</p>
            {revealed ? (
              <>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">{current.definition}</p>
                {current.example && (
                  <p className="mt-2 text-sm italic text-gray-500">{current.example}</p>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-400">Cevabı görmek için karta tıkla</p>
            )}
          </div>

          {revealed && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {QUALITY_BUTTONS.map((b) => (
                <button
                  key={b.quality}
                  onClick={() => handleAnswer(b.quality)}
                  disabled={submitting}
                  className={`rounded-lg px-2 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${b.className}`}
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
