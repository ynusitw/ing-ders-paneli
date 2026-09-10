import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const bulkSlotsSchema = z.object({
  slots: z
    .array(z.object({ startTime: z.string().datetime(), endTime: z.string().datetime() }))
    .min(1)
    .max(300),
});

// POST /api/slots/bulk -> Calendly tarzı toplu müsaitlik oluşturma (haftanın
// seçilen günleri + saat aralığı istemci tarafında somut slotlara bölünüp
// buraya gönderilir, tek bir Firestore batch ile yazılır).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = bulkSlotsSchema.parse(await req.json());

  const batch = adminDb.batch();
  const createdAt = new Date().toISOString();
  for (const slot of body.slots) {
    const ref = adminDb.collection("availabilitySlots").doc();
    batch.set(ref, {
      teacherId: user.uid,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "OPEN",
      createdAt,
    });
  }
  await batch.commit();

  return NextResponse.json({ created: body.slots.length }, { status: 201 });
}
