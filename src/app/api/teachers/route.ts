import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

// GET /api/teachers -> öğrencinin ders talep edeceği öğretmeni seçebilmesi için öğretmen listesi
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const snapshot = await adminDb.collection("users").where("role", "==", "TEACHER").get();
  const teachers = snapshot.docs.map((doc) => ({
    id: doc.id,
    fullName: doc.data().fullName,
    email: doc.data().email,
  }));
  return NextResponse.json(teachers);
}
