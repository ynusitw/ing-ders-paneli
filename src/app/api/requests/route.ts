import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const createRequestSchema = z.object({
  slotId: z.string(),
  studentNote: z.string().optional(),
});

// GET /api/requests -> role'e göre kendi taleplerini (öğrenci) ya da gelen talepleri (öğretmen) listeler
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const field = user.role === "TEACHER" ? "teacherId" : "studentId";

  const snapshot = await adminDb
    .collection("lessonRequests")
    .where(field, "==", user.uid)
    .orderBy("createdAt", "desc")
    .get();

  const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(requests);
}

// POST /api/requests -> öğrenci bir OPEN slot için talep gönderir (slot REQUESTED'e döner).
// İsim bilgileri gösterim kolaylığı için Firestore'da denormalize edilerek saklanır.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = createRequestSchema.parse(await req.json());

  const slotRef = adminDb.collection("availabilitySlots").doc(body.slotId);
  const requestRef = adminDb.collection("lessonRequests").doc();

  const result = await adminDb.runTransaction(async (tx) => {
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists || slotSnap.data()?.status !== "OPEN") {
      throw new Error("Slot müsait değil");
    }
    const slotData = slotSnap.data()!;
    const teacherSnap = await tx.get(adminDb.collection("users").doc(slotData.teacherId));
    const teacherName = teacherSnap.data()?.fullName ?? "";

    tx.update(slotRef, { status: "REQUESTED" });
    tx.set(requestRef, {
      slotId: slotRef.id,
      teacherId: slotData.teacherId,
      teacherName,
      studentId: user.uid,
      studentName: user.fullName,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
      status: "PENDING",
      studentNote: body.studentNote ?? null,
      teacherNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { id: requestRef.id };
  });

  return NextResponse.json(result, { status: 201 });
}
