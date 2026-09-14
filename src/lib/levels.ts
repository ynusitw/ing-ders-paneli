// Ogrenci Ingilizce seviyesi (CEFR) ve seviye atlama kurallari.
//
// Kural: ogrenci bulundugu seviyede PASS_SCORE ve uzeri not aldigi
// REQUIRED_PASSES adet odevi tamamlayinca bir ust seviyeye gecer. Terfi
// ogretmen odevi degerlendirdigi anda sunucu tarafinda hesaplanir.
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type Level = (typeof LEVELS)[number];

export const DEFAULT_LEVEL: Level = "A1";

export const LEVEL_DESCRIPTION: Record<Level, string> = {
  A1: "Başlangıç",
  A2: "Temel",
  B1: "Orta",
  B2: "Orta-üstü",
  C1: "İleri",
  C2: "Ustalık",
};

export const PASS_SCORE = 70;
export const REQUIRED_PASSES = 3;

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function normalizeLevel(value: unknown): Level {
  return isLevel(value) ? value : DEFAULT_LEVEL;
}

export function nextLevel(level: Level): Level | null {
  const index = LEVELS.indexOf(level);
  return index === LEVELS.length - 1 ? null : LEVELS[index + 1];
}

// Bulunulan seviyede gecer not alinan odev sayisina gore terfi durumu.
export function promotionProgress(level: Level, passedAtLevel: number) {
  const target = nextLevel(level);
  return {
    level,
    nextLevel: target,
    passed: Math.min(passedAtLevel, REQUIRED_PASSES),
    required: REQUIRED_PASSES,
    remaining: target === null ? 0 : Math.max(0, REQUIRED_PASSES - passedAtLevel),
    canPromote: target !== null && passedAtLevel >= REQUIRED_PASSES,
  };
}
