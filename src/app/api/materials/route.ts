import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const createMaterialSchema = z.object({
  lessonId: z.string(),
  title: z.string().min(1),
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
});

// GET /api/materials?lessonId=... -> o dersin materyallerini listeler (dersin öğretmeni veya öğrencisi görebilir)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId gerekli" }, { status: 400 });
  }

  const lessonRef = adminDb.collection("lessons").doc(lessonId);
  const lessonSnap = await lessonRef.get();
  if (!lessonSnap.exists) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  const lesson = lessonSnap.data()!;
  if (lesson.teacherId !== user.uid && lesson.studentId !== user.uid) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const snapshot = await lessonRef.collection("materials").orderBy("createdAt", "desc").get();
  const materials = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(materials);
}

// POST /api/materials -> öğretmen bir derse not/materyal ekler (lessons/{lessonId}/materials alt koleksiyonu)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = createMaterialSchema.parse(await req.json());

  const lessonRef = adminDb.collection("lessons").doc(body.lessonId);
  const lessonSnap = await lessonRef.get();
  if (!lessonSnap.exists || lessonSnap.data()?.teacherId !== user.uid) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const materialRef = await lessonRef.collection("materials").add({
    teacherId: user.uid,
    title: body.title,
    content: body.content ?? null,
    fileUrl: body.fileUrl ?? null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: materialRef.id }, { status: 201 });
}
