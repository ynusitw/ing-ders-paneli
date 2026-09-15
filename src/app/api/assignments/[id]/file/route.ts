import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

// GET /api/assignments/:id/file -> odev ekini indirir.
//
// Dosyalar ozel (private) Blob store'da durdugu icin dogrudan URL ile
// acilamaz; erisim burada dogrulanip icerik stream olarak aktarilir. Boylece
// eke yalnizca odevi veren ogretmen ve sahibi ogrenci ulasabilir.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const snap = await adminDb.collection("assignments").doc(params.id).get();
  if (!snap.exists) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const assignment = snap.data()!;
  if (assignment.teacherId !== user.uid && assignment.studentId !== user.uid) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (!assignment.fileUrl) {
    return NextResponse.json({ error: "Bu ödevde ek yok" }, { status: 404 });
  }

  const blob = await get(assignment.fileUrl, { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const fileName = encodeURIComponent(assignment.fileName ?? "odev");
  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Content-Length": String(blob.blob.size),
      "Content-Disposition": `inline; filename*=UTF-8''${fileName}`,
      // Onbelleklenirse cikis yapildiktan sonra da tarayici kopyasindan
      // acilabiliyor; erisim her istekte yeniden dogrulansin.
      "Cache-Control": "private, no-store",
    },
  });
}
