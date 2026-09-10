import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { isRoomJoinable } from "@/lib/status";
import { RoomGate } from "@/components/room-gate";

// Sunucu tarafında: kullanıcı bu dersin gerçek katılımcısı mı diye doğrular,
// ardından WebRTC işini yapan client component'e initiator rolünü ve isimleri devreder.
export default async function RoomPage({ params }: { params: { lessonId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lessonSnap = await adminDb.collection("lessons").doc(params.lessonId).get();
  if (!lessonSnap.exists) {
    return <main className="p-8">Ders bulunamadı.</main>;
  }

  const lesson = lessonSnap.data()!;
  if (lesson.teacherId !== user.uid && lesson.studentId !== user.uid) {
    return <main className="p-8">Bu ders odasına erişim yetkiniz yok.</main>;
  }

  if (lesson.status === "CANCELLED") {
    return <main className="p-8">Bu ders iptal edilmiş.</main>;
  }

  if (!isRoomJoinable({ status: lesson.status, endTime: lesson.endTime })) {
    return <main className="p-8">Bu dersin süresi doldu, odaya tekrar girilemez.</main>;
  }

  const isTeacher = user.role === "TEACHER";

  return (
    <RoomGate
      roomId={params.lessonId}
      isTeacher={isTeacher}
      localName={isTeacher ? lesson.teacherName : lesson.studentName}
      remoteName={isTeacher ? lesson.studentName : lesson.teacherName}
      leaveHref={isTeacher ? "/teacher/lessons" : "/student/my-lessons"}
      startTime={lesson.startTime}
      endTime={lesson.endTime}
    />
  );
}
