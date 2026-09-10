import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

// GET /api/lessons -> role'e göre öğretmenin/öğrencinin onaylanmış derslerini listeler
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const field = user.role === "TEACHER" ? "teacherId" : "studentId";

  const snapshot = await adminDb
    .collection("lessons")
    .where(field, "==", user.uid)
    .orderBy("startTime", "asc")
    .get();

  const lessons = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(lessons);
}
