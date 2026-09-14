import { adminDb } from "@/lib/firebase-admin";
import { PASS_SCORE, normalizeLevel, promotionProgress } from "@/lib/levels";

// Ogrencinin bulundugu seviyede kac odevi gecer not aldigini sayip terfi
// durumunu dondurur. Hem ilerleme gostergesi hem de notlandirma sirasindaki
// otomatik seviye atlama karari bu tek kaynaktan besleniyor.
export async function getStudentLevelProgress(studentId: string) {
  const userSnap = await adminDb.collection("users").doc(studentId).get();
  const level = normalizeLevel(userSnap.data()?.level);

  const snapshot = await adminDb.collection("assignments").where("studentId", "==", studentId).get();
  const passedAtLevel = snapshot.docs.filter((doc) => {
    const a = doc.data();
    return (
      a.status === "GRADED" &&
      a.level === level &&
      typeof a.score === "number" &&
      a.score >= PASS_SCORE
    );
  }).length;

  return promotionProgress(level, passedAtLevel);
}
