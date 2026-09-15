import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE } from "@/lib/constants";

// "Oturumumu açık tut" işaretliyse çerez kalıcı olur (Firebase oturum
// çerezinin üst sınırı 14 gün); işaretli değilse tarayıcı kapanınca silinen
// bir oturum çerezi yazılır ve token ömrü de kısa tutulur.
const REMEMBERED_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_ONLY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const sessionSchema = z.object({ idToken: z.string(), remember: z.boolean().optional() });

// POST /api/session -> client'ın Firebase idToken'ını httpOnly oturum çerezine çevirir.
export async function POST(req: NextRequest) {
  const { idToken, remember = false } = sessionSchema.parse(await req.json());

  const decoded = await adminAuth.verifyIdToken(idToken);
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: remember ? REMEMBERED_MAX_AGE_MS : SESSION_ONLY_MAX_AGE_MS,
  });

  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const role = userDoc.data()?.role ?? null;

  const response = NextResponse.json({ role });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // maxAge verilmezse tarayıcı kapandığında çerez silinir.
    ...(remember ? { maxAge: REMEMBERED_MAX_AGE_MS / 1000 } : {}),
    path: "/",
  });
  return response;
}

// DELETE /api/session -> çıkış yap
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
