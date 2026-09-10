import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Tarayıcı tarafı Firebase SDK. Sadece: (1) Auth (giriş/kayıt), (2) video
// odası sinyalleşme dokümanı (rooms/{lessonId}) için kullanılır. Diğer tüm
// veri erişimi API route'ları üzerinden (Admin SDK ile) yapılır.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const clientAuth = getAuth(app);
export const clientDb = getFirestore(app);
