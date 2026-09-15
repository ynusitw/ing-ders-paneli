import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

// Metin ya da dosya; en az biri olmali.
const submitSchema = z
  .object({
    submission: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
  })
  .refine((b) => Boolean(b.submission?.trim()) || Boolean(b.fileUrl), {
    message: "Cevap metni ya da dosya gerekli",
  });

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

  const assignment = snap.data()!;
  const alreadySubmitted = assignment.status === "SUBMITTED";

  await ref.update({
    submission: body.submission?.trim() || null,
    fileUrl: body.fileUrl ?? null,
    fileName: body.fileName ?? null,
    fileType: body.fileType ?? null,
    submittedAt: new Date().toISOString(),
    status: "SUBMITTED",
  });

  // Teslimini guncelleyen ogrenci ogretmeni tekrar tekrar rahatsiz etmesin.
  if (!alreadySubmitted) {
    await notify({
      userId: assignment.teacherId,
      type: "ASSIGNMENT_SUBMITTED",
      title: "Ödev teslim edildi",
      body: `${user.fullName}, "${assignment.title}" ödevini teslim etti.`,
      href: "/teacher/assignments",
    });
  }

  return NextResponse.json({ ok: true });
}
