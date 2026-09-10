import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(["TEACHER", "STUDENT"]),
});

// POST /api/register -> Firebase Auth kullanıcısı + Firestore users/{uid} dokümanı
// oluşturur, ardından client'ın oturum açması için bir custom token döner.
export async function POST(req: NextRequest) {
  const body = registerSchema.parse(await req.json());

  const userRecord = await adminAuth.createUser({
    email: body.email,
    password: body.password,
    displayName: body.fullName,
  });

  await adminDb.collection("users").doc(userRecord.uid).set({
    email: body.email,
    fullName: body.fullName,
    role: body.role,
    createdAt: new Date().toISOString(),
  });

  const customToken = await adminAuth.createCustomToken(userRecord.uid, {
    role: body.role,
  });

  return NextResponse.json({ customToken, role: body.role }, { status: 201 });
}
