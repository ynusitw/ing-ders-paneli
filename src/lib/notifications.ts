import { adminDb } from "@/lib/firebase-admin";
import { normalizeTimezone } from "@/lib/timezone";
import type { NotificationType } from "@/types";

// Bildirim metinlerindeki saatler aliciya kendi saat diliminde gosterilmeli.
export async function getUserTimezone(userId: string) {
  const snap = await adminDb.collection("users").doc(userId).get();
  return normalizeTimezone(snap.data()?.timezone);
}

type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  // Bildirime tiklaninca gidilecek sayfa.
  href?: string;
};

// Bildirim yazimi yan etkidir: basarisiz olursa asil islem (talep, notlandirma,
// ders iptali) yine de tamamlanmali. Bu yuzden hata firlatmiyor, sadece logluyor.
export async function notify(notification: NewNotification) {
  try {
    await adminDb.collection("notifications").add({
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? null,
      href: notification.href ?? null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[notify] bildirim yazılamadı", error);
  }
}
