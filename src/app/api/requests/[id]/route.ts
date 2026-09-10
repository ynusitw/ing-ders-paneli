import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  teacherNote: z.string().optional(),
});

// PATCH /api/requests/:id -> öğretmen talebi onaylar/reddeder.
// Onayda: slot BOOKED olur ve lessons/{lessonId} dokümanı (video oda kimliği = lessonId) doğar.
// Redde: slot tekrar OPEN'a döner.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = decisionSchema.parse(await req.json());

  const requestRef = adminDb.collection("lessonRequests").doc(params.id);
  const lessonRef = adminDb.collection("lessons").doc();

  const result = await adminDb.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists || requestSnap.data()?.teacherId !== user.uid) {
      throw new Error("Bulunamadı");
    }
    const requestData = requestSnap.data()!;
    if (requestData.status !== "PENDING") {
      throw new Error("Talep zaten karara bağlanmış");
    }

    const slotRef = adminDb.collection("availabilitySlots").doc(requestData.slotId);

    tx.update(requestRef, {
      status: body.decision,
      teacherNote: body.teacherNote ?? null,
      updatedAt: new Date().toISOString(),
    });

    if (body.decision === "APPROVED") {
      tx.update(slotRef, { status: "BOOKED" });
      tx.set(lessonRef, {
        requestId: requestRef.id,
        teacherId: requestData.teacherId,
        teacherName: requestData.teacherName,
        studentId: requestData.studentId,
        studentName: requestData.studentName,
        startTime: requestData.startTime,
        endTime: requestData.endTime,
        status: "SCHEDULED",
        createdAt: new Date().toISOString(),
      });
      return { lessonId: lessonRef.id };
    }

    tx.update(slotRef, { status: "OPEN" });
    return { lessonId: null };
  });

  return NextResponse.json(result);
}
