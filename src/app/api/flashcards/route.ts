import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { INITIAL_CARD_STATE } from "@/lib/spaced-repetition";

const createCardSchema = z.object({
  studentId: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().optional(),
});

// GET /api/flashcards -> ogretmen icin ?studentId= zorunlu (o ogrencinin
// kartlari), ogrenci icin kendi tum kartlari (tekrar sirasi client'ta
// dueDate'e gore hesaplanir).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  let snapshot;
  if (user.role === "TEACHER") {
    const studentId = req.nextUrl.searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "studentId gerekli" }, { status: 400 });
    }
    snapshot = await adminDb
      .collection("flashcards")
      .where("teacherId", "==", user.uid)
      .where("studentId", "==", studentId)
      .get();
  } else {
    snapshot = await adminDb.collection("flashcards").where("studentId", "==", user.uid).get();
  }

  const cards = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as { id: string; createdAt: string })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(cards);
}

// POST /api/flashcards -> ogretmen bir ogrenciye yeni kelime karti ekler.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = createCardSchema.parse(await req.json());

  const now = new Date().toISOString();
  const ref = await adminDb.collection("flashcards").add({
    teacherId: user.uid,
    studentId: body.studentId,
    term: body.term.trim(),
    definition: body.definition.trim(),
    example: body.example?.trim() || null,
    createdAt: now,
    ...INITIAL_CARD_STATE,
    dueDate: now,
    lastReviewedAt: null,
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
