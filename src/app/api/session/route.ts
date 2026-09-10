import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE } from "@/lib/constants";

const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 gün

const sessionSchema = z.object({ idToken: z.string() });

// POST /api/session -> client'ın Firebase idToken'ını httpOnly oturum çerezine çevirir.
export async function POST(req: NextRequest) {
  const { idToken } = sessionSchema.parse(await req.json());

  const decoded = await adminAuth.verifyIdToken(idToken);
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const role = userDoc.data()?.role ?? null;

  const response = NextResponse.json({ role });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
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
