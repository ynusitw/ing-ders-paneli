import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/session";

const FEED_LIMIT = 30;

type NotificationDoc = { id: string; createdAt: string; read: boolean };

// GET /api/notifications -> kullanicinin son bildirimleri ve okunmamis sayisi.
// Siralama bellekte yapiliyor; boylece userId + createdAt icin bilesik index
// gerekmiyor.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const snapshot = await adminDb
    .collection("notifications")
    .where("userId", "==", user.uid)
    .get();

  const all = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as NotificationDoc)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({
    items: all.slice(0, FEED_LIMIT),
    unreadCount: all.filter((n) => !n.read).length,
  });
}

// POST /api/notifications -> kullanicinin tum bildirimlerini okundu isaretler.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const unread = await adminDb
    .collection("notifications")
    .where("userId", "==", user.uid)
    .where("read", "==", false)
    .get();

  if (unread.empty) return NextResponse.json({ updated: 0 });

  const batch = adminDb.batch();
  for (const doc of unread.docs) batch.update(doc.ref, { read: true });
  await batch.commit();

  return NextResponse.json({ updated: unread.size });
}
