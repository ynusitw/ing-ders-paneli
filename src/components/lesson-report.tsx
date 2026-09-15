// Ders sonu raporu: ogretmenin degerlendirmesi ve bir sonraki hedef.
// Hem ogretmenin ders listesinde hem de ogrencinin gecmisinde gosterilir.
export function LessonReport({
  summary,
  nextGoal,
}: {
  summary: string | null;
  nextGoal: string | null;
}) {
  if (!summary && !nextGoal) return null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-faint mb-2 text-[10px] font-bold uppercase tracking-[0.2em]">
        Ders raporu
      </p>

      {summary && <p className="whitespace-pre-wrap text-sm">{summary}</p>}

      {nextGoal && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-faint text-[10px] font-bold uppercase tracking-[0.2em]">
            Sonraki hedef
          </span>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--accent-2)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)] px-2.5 py-0.5 text-[var(--accent-1)]">
            {nextGoal}
          </span>
        </p>
      )}
    </div>
  );
}
