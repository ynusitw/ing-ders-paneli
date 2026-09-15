import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";
import { isValidTimezone } from "@/lib/timezone";

// GET /api/me -> oturum açmış kullanıcının kendi bilgisi (client component'lerin uid/rol öğrenmesi için)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  return NextResponse.json(user);
}

const updateMeSchema = z.object({
  fullName: z.string().min(1).optional(),
  timezone: z.string().refine(isValidTimezone, "Geçersiz saat dilimi").optional(),
});

// PATCH /api/me -> kullanıcı kendi adını ve saat dilimini günceller (ayarlar sayfası)
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = updateMeSchema.parse(await req.json());

  const updates: Record<string, string> = {};
  if (body.fullName) updates.fullName = body.fullName;
  if (body.timezone) updates.timezone = body.timezone;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  await adminDb.collection("users").doc(user.uid).update(updates);
  if (body.fullName) await adminAuth.updateUser(user.uid, { displayName: body.fullName });

  return NextResponse.json({ ok: true });
}
