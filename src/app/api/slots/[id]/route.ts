import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

// DELETE /api/slots/:id -> öğretmen henüz talep almamış (OPEN) bir slotu siler
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const ref = adminDb.collection("availabilitySlots").doc(params.id);
  const slot = await ref.get();
  if (!slot.exists || slot.data()?.teacherId !== user.uid) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  if (slot.data()?.status !== "OPEN") {
    return NextResponse.json({ error: "Talep almış slot silinemez" }, { status: 409 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
