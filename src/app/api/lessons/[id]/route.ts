import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { notify, getUserTimezone } from "@/lib/notifications";
import { formatRange } from "@/lib/timezone";

// Ders tamamlanirken rapor da yazilabilir; tamamlanmis bir derse sonradan
// rapor eklemek/duzeltmek icin status gonderilmeden de cagrilabilir.
const updateLessonSchema = z
  .object({
    status: z.enum(["COMPLETED", "CANCELLED"]).optional(),
    reportSummary: z.string().max(2000).optional(),
    reportNextGoal: z.string().max(500).optional(),
  })
  .refine(
    (b) => b.status !== undefined || b.reportSummary !== undefined || b.reportNextGoal !== undefined,
    { message: "Güncellenecek alan yok" }
  );

function reportFields(body: { reportSummary?: string; reportNextGoal?: string }) {
  return {
    reportSummary: body.reportSummary?.trim() || null,
    reportNextGoal: body.reportNextGoal?.trim() || null,
    reportedAt: new Date().toISOString(),
  };
}

function hasReport(body: { reportSummary?: string; reportNextGoal?: string }) {
  return Boolean(body.reportSummary?.trim() || body.reportNextGoal?.trim());
}

async function notifyReport(studentId: string, teacherName: string, written: boolean) {
  if (!written) return;
  await notify({
    userId: studentId,
    type: "LESSON_COMPLETED",
    title: "Ders raporun güncellendi",
    body: `${teacherName}, dersin için değerlendirme yazdı.`,
    href: "/student/my-lessons",
  });
}

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

  const body = updateLessonSchema.parse(await req.json());
  const { status } = body;

  const ref = adminDb.collection("lessons").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const lesson = snap.data()!;
  const isTeacher = lesson.teacherId === user.uid;
  const isStudent = lesson.studentId === user.uid;
  if (!isTeacher && !isStudent) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const now = Date.now();

  // Sadece rapor guncellemesi: tamamlanmis bir derse sonradan not eklemek.
  if (!status) {
    if (!isTeacher) {
      return NextResponse.json({ error: "Raporu yalnızca öğretmen yazabilir" }, { status: 401 });
    }
    if (lesson.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Rapor yalnızca tamamlanmış derse yazılabilir" },
        { status: 409 }
      );
    }

    await ref.update(reportFields(body));
    await notifyReport(lesson.studentId, lesson.teacherName, hasReport(body));
    return NextResponse.json({ ok: true, status: lesson.status });
  }

  if (lesson.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Bu ders zaten sonuçlanmış" }, { status: 409 });
  }

  if (status === "COMPLETED") {
    if (!isTeacher) {
      return NextResponse.json({ error: "Dersi yalnızca öğretmen tamamlayabilir" }, { status: 401 });
    }
    if (now < new Date(lesson.startTime).getTime()) {
      return NextResponse.json({ error: "Ders henüz başlamadı" }, { status: 409 });
    }

    await ref.update({
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      ...reportFields(body),
    });

    const studentZone = await getUserTimezone(lesson.studentId);
    await notify({
      userId: lesson.studentId,
      type: "LESSON_COMPLETED",
      title: hasReport(body) ? "Ders raporun hazır" : "Ders tamamlandı",
      body: hasReport(body)
        ? `${lesson.teacherName}, dersin için değerlendirme yazdı.`
        : `${lesson.teacherName} ile dersin tamamlandı olarak işaretlendi (${formatRange(lesson.startTime, lesson.endTime, studentZone)}).`,
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
