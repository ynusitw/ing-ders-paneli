"use client";

// Ders saati gelmeden öğrenci odaya doğrudan giremez: katılma isteği Firestore'daki
// rooms/{roomId} dokümanına yazılır, öğretmen (VideoRoom içindeki banner'dan) "İçeri Al"
// deyince ya da ders saati gelince otomatik olarak görüşmeye geçilir. Öğretmen için
// bu kısıtlama yok - her zaman doğrudan girebilir.
import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import { VideoRoom } from "@/components/video-room";
import { randomIdiom } from "@/lib/idioms";

type Props = {
  roomId: string;
  isTeacher: boolean;
  localName: string;
  remoteName: string;
  leaveHref: string;
  startTime: string;
  endTime: string;
};

export function RoomGate({
  roomId,
  isTeacher,
  localName,
  remoteName,
  leaveHref,
  startTime,
  endTime,
}: Props) {
  const startMs = new Date(startTime).getTime();
  // Date.now() sunucu render'ı ile istemci hydration'ı arasında farklı değer
  // üretir (React hydration mismatch hatası verir) - bu yüzden "now" başlangıçta
  // null kalır, gerçek zaman sadece mount sonrası (istemcide) belirlenir; ilk
  // render sunucu ve istemcide birebir aynı (nötr) çıktıyı üretir.
  const [now, setNow] = useState<number | null>(null);
  const [admitted, setAdmitted] = useState(false);
  // Bekleme ekranında gösterilecek günün deyimi - sadece bu ekran mount olduğunda
  // (yani zaten client-only render edildiğinde) seçildiği için hydration riski yok.
  const [idiom] = useState(() => randomIdiom());

  const isEarly = now !== null && !isTeacher && now < startMs;

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!isEarly) return;

    const roomRef = doc(clientDb, "rooms", roomId);
    setDoc(roomRef, { waitingRoom: { requested: true, admitted: false } }, { merge: true }).catch(
      (err) => console.error("[room] bekleme isteği gönderilemedi", err)
    );

    const unsubscribe = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.data()?.waitingRoom?.admitted) setAdmitted(true);
      },
      (err) => console.error("[room] bekleme durumu dinlenemedi", err)
    );
    // Ders saati gelince (öğretmen kabul etmese bile) otomatik olarak girilir.
    const timer = setInterval(() => setNow(Date.now()), 5000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isEarly]);

  if (now === null) {
    // Sunucu/istemci hydration'ı bitene kadar (yukarıdaki not) nötr bir bekleme
    // ekranı - erken mi değil mi bilinmeden ne VideoRoom'u ne bekleme ekranını gösteririz.
    return (
      <main className="flex h-screen items-center justify-center bg-gray-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
      </main>
    );
  }

  if (isEarly && !admitted) {
    const start = new Date(startTime);
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center text-white">
        <p className="text-lg font-medium">Ders henüz başlamadı</p>
        <p className="text-sm text-gray-400">Başlangıç saati: {start.toLocaleString("tr-TR")}</p>
        <p className="max-w-sm text-sm text-gray-400">
          Katılma isteğin {remoteName} öğretmenine gönderildi. Kabul edilince ya da ders saati gelince
          otomatik olarak derse gireceksin.
        </p>

        <div className="mt-2 w-full max-w-sm rounded-lg border border-gray-700 bg-gray-800 p-4 text-left">
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Günün deyimi</p>
          <p className="text-lg font-semibold">{idiom.phrase}</p>
          <p className="mt-1 text-sm text-gray-300">{idiom.meaning}</p>
          <p className="mt-2 text-sm italic text-gray-400">"{idiom.example}"</p>
        </div>

        <div className="mt-1 h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
      </main>
    );
  }

  return (
    <VideoRoom
      roomId={roomId}
      isInitiator={isTeacher}
      localName={localName}
      remoteName={remoteName}
      leaveHref={leaveHref}
      startTime={startTime}
      endTime={endTime}
    />
  );
}
