import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

// DELETE /api/assignments/:id -> ogretmen verdigi odevi geri ceker.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const ref = adminDb.collection("assignments").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.teacherId !== user.uid) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
