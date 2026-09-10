import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

// GET /api/me -> oturum açmış kullanıcının kendi bilgisi (client component'lerin uid/rol öğrenmesi için)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  return NextResponse.json(user);
}

const updateMeSchema = z.object({
  fullName: z.string().min(1),
});

// PATCH /api/me -> kullanıcı kendi adını günceller (ayarlar sayfası)
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = updateMeSchema.parse(await req.json());

  await adminDb.collection("users").doc(user.uid).update({ fullName: body.fullName });
  await adminAuth.updateUser(user.uid, { displayName: body.fullName });

  return NextResponse.json({ ok: true });
}
