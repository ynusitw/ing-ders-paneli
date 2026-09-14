import { LEVELS, LEVEL_DESCRIPTION, type Level } from "@/lib/levels";

export type LevelProgressData = {
  level: Level;
  nextLevel: Level | null;
  passed: number;
  required: number;
  remaining: number;
  canPromote: boolean;
};

export function LevelBadge({ level, size = "sm" }: { level: Level; size?: "sm" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(120deg,var(--accent-1),var(--accent-2)_55%,var(--accent-3))] font-[family-name:var(--font-display)] font-bold text-[var(--accent-ink)] shadow-[0_8px_22px_-10px_var(--glow-hard)] ${
        size === "lg" ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      {level}
      <span className="font-normal opacity-80">{LEVEL_DESCRIPTION[level]}</span>
    </span>
  );
}

// Seviye merdiveni + bir ust seviyeye kalan gecer notlu odev sayisi.
export function LevelProgressCard({ progress }: { progress: LevelProgressData }) {
  const percent = (progress.passed / progress.required) * 100;

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-faint text-[10px] font-bold uppercase tracking-[0.2em]">
            Seviye
          </span>
          <LevelBadge level={progress.level} size="lg" />
        </div>

        <div className="flex items-center gap-1.5">
          {LEVELS.map((l) => {
            const reached = LEVELS.indexOf(l) <= LEVELS.indexOf(progress.level);
            return (
              <span
                key={l}
                title={`${l} · ${LEVEL_DESCRIPTION[l]}`}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  reached
                    ? "bg-[linear-gradient(90deg,var(--accent-1),var(--accent-3))] shadow-[0_0_10px_var(--glow-hard)]"
                    : "bg-[var(--surface-strong)]"
                }`}
              />
            );
          })}
        </div>
      </div>

      {progress.nextLevel ? (
        <>
          <div className="text-faint mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
            <span>
              {progress.nextLevel} için ilerleme
            </span>
            <span className="tabular-nums">
              {progress.passed} / {progress.required}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-1),var(--accent-2),var(--accent-3))] shadow-[0_0_14px_var(--glow-hard)] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-dim mt-2 text-sm">
            {progress.remaining === 0
              ? `${progress.nextLevel} seviyesine geçmeye hazır.`
              : `${progress.nextLevel} seviyesine geçmek için ${progress.remaining} başarılı ödev daha gerekiyor.`}
          </p>
        </>
      ) : (
        <p className="text-dim text-sm">En üst seviyedesin, tebrikler.</p>
      )}
    </div>
  );
}
