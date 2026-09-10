import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { VideoRoom } from "@/components/video-room";

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

  const isTeacher = user.role === "TEACHER";

  return (
    <VideoRoom
      roomId={params.lessonId}
      isInitiator={isTeacher}
      localName={isTeacher ? lesson.teacherName : lesson.studentName}
      remoteName={isTeacher ? lesson.studentName : lesson.teacherName}
      leaveHref={isTeacher ? "/teacher/lessons" : "/student/my-lessons"}
    />
  );
}
