import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE } from "@/lib/constants";
import type { Role } from "@/types";

export { SESSION_COOKIE };

export type CurrentUser = {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
};

// Node.js runtime'da (API route / server component) çağrılır; Edge middleware
// içinde ÇALIŞMAZ (firebase-admin Node API'lerine bağımlı) - kaba erişim
// kontrolü middleware.ts'te, rol bazlı asıl kontrol burada yapılır.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data()!;
    return {
      uid: decoded.uid,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
    };
  } catch {
    return null;
  }
}

