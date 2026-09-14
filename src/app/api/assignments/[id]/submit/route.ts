import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const submitSchema = z.object({ submission: z.string().min(1) });

// POST /api/assignments/:id/submit -> ogrenci odevini teslim eder.
// Notlandirilmis bir odev tekrar teslim edilemez.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = submitSchema.parse(await req.json());

  const ref = adminDb.collection("assignments").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== user.uid) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  if (snap.data()?.status === "GRADED") {
    return NextResponse.json({ error: "Bu ödev değerlendirildi" }, { status: 409 });
  }

  await ref.update({
    submission: body.submission.trim(),
    submittedAt: new Date().toISOString(),
    status: "SUBMITTED",
  });

  return NextResponse.json({ ok: true });
}
