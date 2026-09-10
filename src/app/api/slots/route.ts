import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const createSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

// GET /api/slots?teacherId=... -> o öğretmenin slotlarını listeler.
// Öğretmen kendi slotlarını sorguluyorsa tüm durumları (yönetim ekranı için),
// başkası sorguluyorsa (öğrenci görünümü) sadece OPEN olanları görür.
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json({ error: "teacherId gerekli" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const isOwner = user?.uid === teacherId;

  let query = adminDb.collection("availabilitySlots").where("teacherId", "==", teacherId) as FirebaseFirestore.Query;
  if (!isOwner) {
    query = query.where("status", "==", "OPEN");
  }

  const snapshot = await query.orderBy("startTime", "asc").get();

  const slots = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(slots);
}

// POST /api/slots -> öğretmen kendi müsaitlik slotunu oluşturur
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = createSlotSchema.parse(await req.json());

  const doc = await adminDb.collection("availabilitySlots").add({
    teacherId: user.uid,
    startTime: body.startTime,
    endTime: body.endTime,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: doc.id }, { status: 201 });
}
