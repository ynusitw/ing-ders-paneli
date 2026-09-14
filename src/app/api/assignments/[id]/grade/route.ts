import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { getStudentLevelProgress } from "@/lib/level-progress";

const gradeSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().optional(),
});

// POST /api/assignments/:id/grade -> ogretmen odevi degerlendirir.
// Not yazildiktan sonra ogrencinin bulundugu seviyedeki gecer notlu odev
// sayisi yeniden hesaplanir; esik asilmissa ogrenci bir ust seviyeye gecer.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = gradeSchema.parse(await req.json());

  const ref = adminDb.collection("assignments").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.teacherId !== user.uid) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const assignment = snap.data()!;
  const now = new Date().toISOString();

  await ref.update({
    score: body.score,
    feedback: body.feedback?.trim() || null,
    status: "GRADED",
    gradedAt: now,
  });

  const progress = await getStudentLevelProgress(assignment.studentId);

  if (progress.canPromote && progress.nextLevel) {
    await adminDb
      .collection("users")
      .doc(assignment.studentId)
      .update({
        level: progress.nextLevel,
        levelUpdatedAt: now,
        levelHistory: FieldValue.arrayUnion({ level: progress.nextLevel, at: now }),
      });

    return NextResponse.json({
      ok: true,
      promoted: true,
      previousLevel: progress.level,
      newLevel: progress.nextLevel,
    });
  }

  return NextResponse.json({ ok: true, promoted: false, progress });
}
