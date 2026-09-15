import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { notify, getUserTimezone } from "@/lib/notifications";
import { formatRange } from "@/lib/timezone";

const updateLessonSchema = z.object({ status: z.enum(["COMPLETED", "CANCELLED"]) });

// Iptal edilen ders gelecekteyse ogretmenin o saati tekrar talep edilebilir
// olmali: ilgili musaitlik slotunu OPEN'a dondururuz.
async function reopenSlot(requestId: string | null | undefined) {
  if (!requestId) return;
  const requestSnap = await adminDb.collection("lessonRequests").doc(requestId).get();
  const slotId = requestSnap.data()?.slotId;
  if (!slotId) return;

  const slotRef = adminDb.collection("availabilitySlots").doc(slotId);
  const slotSnap = await slotRef.get();
  if (slotSnap.exists) await slotRef.update({ status: "OPEN" });
}

// PATCH /api/lessons/:id -> dersi tamamlandi (ogretmen) ya da iptal edildi
// (iki taraf da) olarak isaretler.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { status } = updateLessonSchema.parse(await req.json());

  const ref = adminDb.collection("lessons").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const lesson = snap.data()!;
  const isTeacher = lesson.teacherId === user.uid;
  const isStudent = lesson.studentId === user.uid;
  if (!isTeacher && !isStudent) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (lesson.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Bu ders zaten sonuçlanmış" }, { status: 409 });
  }

  const now = Date.now();

  if (status === "COMPLETED") {
    if (!isTeacher) {
      return NextResponse.json({ error: "Dersi yalnızca öğretmen tamamlayabilir" }, { status: 401 });
    }
    if (now < new Date(lesson.startTime).getTime()) {
      return NextResponse.json({ error: "Ders henüz başlamadı" }, { status: 409 });
    }

    await ref.update({ status: "COMPLETED", completedAt: new Date().toISOString() });
    const studentZone = await getUserTimezone(lesson.studentId);
    await notify({
      userId: lesson.studentId,
      type: "LESSON_COMPLETED",
      title: "Ders tamamlandı",
      body: `${lesson.teacherName} ile dersin tamamlandı olarak işaretlendi (${formatRange(lesson.startTime, lesson.endTime, studentZone)}).`,
      href: "/student/my-lessons",
    });

    return NextResponse.json({ ok: true, status: "COMPLETED" });
  }

  if (now > new Date(lesson.endTime).getTime()) {
    return NextResponse.json({ error: "Biten bir ders iptal edilemez" }, { status: 409 });
  }

  await ref.update({
    status: "CANCELLED",
    cancelledAt: new Date().toISOString(),
    cancelledBy: user.uid,
  });
  await reopenSlot(lesson.requestId);

  const recipientId = isTeacher ? lesson.studentId : lesson.teacherId;
  const recipientZone = await getUserTimezone(recipientId);
  await notify({
    userId: recipientId,
    type: "LESSON_CANCELLED",
    title: "Ders iptal edildi",
    body: `${user.fullName}, ${formatRange(lesson.startTime, lesson.endTime, recipientZone)} dersini iptal etti.`,
    href: isTeacher ? "/student/my-lessons" : "/teacher/lessons",
  });

  return NextResponse.json({ ok: true, status: "CANCELLED" });
}
