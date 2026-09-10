import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { isValidQuality, nextReviewState, type CardState } from "@/lib/spaced-repetition";

const reviewSchema = z.object({ quality: z.number() });

// POST /api/flashcards/:id/review -> ogrenci karti tekrar eder, verdigi
// kalite puanina gore SM-2 ile bir sonraki tekrar tarihi hesaplanip yazilir.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = reviewSchema.parse(await req.json());
  if (!isValidQuality(body.quality)) {
    return NextResponse.json({ error: "Geçersiz kalite değeri" }, { status: 400 });
  }

  const ref = adminDb.collection("flashcards").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== user.uid) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const data = snap.data()!;
  const currentState: CardState = {
    easeFactor: data.easeFactor,
    intervalDays: data.intervalDays,
    repetitions: data.repetitions,
  };
  const update = nextReviewState(currentState, body.quality);

  await ref.update(update);
  return NextResponse.json(update);
}
