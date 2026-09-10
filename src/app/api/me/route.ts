import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// GET /api/me -> oturum açmış kullanıcının kendi bilgisi (client component'lerin uid/rol öğrenmesi için)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  return NextResponse.json(user);
}
