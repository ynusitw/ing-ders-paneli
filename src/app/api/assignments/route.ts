import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { normalizeLevel } from "@/lib/levels";

const createAssignmentSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.string().datetime().optional(),
});

type AssignmentDoc = { id: string; createdAt: string };

// GET /api/assignments -> ogretmen icin ?studentId= ile o ogrencinin odevleri,
// ogrenci icin kendi odevleri (en yeni ustte).
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
      .collection("assignments")
      .where("teacherId", "==", user.uid)
      .where("studentId", "==", studentId)
      .get();
  } else {
    snapshot = await adminDb.collection("assignments").where("studentId", "==", user.uid).get();
  }

  const assignments = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as AssignmentDoc)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json(assignments);
}

// POST /api/assignments -> ogretmen ogrenciye odev verir. Odev, ogrencinin
// o anki seviyesiyle damgalanir; seviye atlama sayimi bu alana gore yapilir.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = createAssignmentSchema.parse(await req.json());

  const studentSnap = await adminDb.collection("users").doc(body.studentId).get();
  if (!studentSnap.exists || studentSnap.data()?.role !== "STUDENT") {
    return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
  }
  const student = studentSnap.data()!;

  const ref = await adminDb.collection("assignments").add({
    teacherId: user.uid,
    teacherName: user.fullName,
    studentId: body.studentId,
    studentName: student.fullName,
    title: body.title.trim(),
    description: body.description.trim(),
    dueDate: body.dueDate ?? null,
    level: normalizeLevel(student.level),
    status: "ASSIGNED",
    submission: null,
    submittedAt: null,
    score: null,
    feedback: null,
    gradedAt: null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
