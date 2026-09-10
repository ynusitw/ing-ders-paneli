// SM-2 (SuperMemo-2) tabanli aralikli tekrar algoritmasi. Ogrenci her kartta
// bir kalite puani (quality) verir, biz bir sonraki tekrar tarihini ve
// "kolaylik faktorunu" buna gore yeniden hesapliyoruz.
export type CardState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export const INITIAL_CARD_STATE: CardState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

// Ogrenciye 4 sade secenek gosteriyoruz, her biri klasik SM-2'nin 0-5 kalite
// olceginde bir degere karsilik geliyor.
export const REVIEW_QUALITY = {
  AGAIN: 1,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
} as const;

export type ReviewQuality = (typeof REVIEW_QUALITY)[keyof typeof REVIEW_QUALITY];

export function isValidQuality(value: number): value is ReviewQuality {
  return Object.values(REVIEW_QUALITY).includes(value as ReviewQuality);
}

export function nextReviewState(state: CardState, quality: ReviewQuality) {
  let { easeFactor, intervalDays, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const now = new Date();
  const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueDate: dueDate.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
