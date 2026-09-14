import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { getStudentLevelProgress } from "@/lib/level-progress";

// GET /api/levels -> ogrenci kendi seviyesini ve terfi ilerlemesini,
// ogretmen ?studentId= ile ders verdigi bir ogrencininkini gorur.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  if (user.role === "STUDENT") {
    return NextResponse.json(await getStudentLevelProgress(user.uid));
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId gerekli" }, { status: 400 });
  }

  // Ogretmen yalnizca dersi olan ogrencisinin seviyesini gorebilir.
  const lessons = await adminDb
    .collection("lessons")
    .where("teacherId", "==", user.uid)
    .where("studentId", "==", studentId)
    .limit(1)
    .get();
  if (lessons.empty) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  return NextResponse.json(await getStudentLevelProgress(studentId));
}
