"use client";

// Gömülü 1:1 video görüşme odası. Harici platforma (Meet/Zoom) yönlendirme yok:
// kamera/mikrofon burada açılır, WebRTC bağlantısı Firestore'daki rooms/{roomId}
// dokümanı üzerinden (offer/answer alışverişi) kurulur ve akış doğrudan burada oynatılır.
import { useEffect, useRef, useState } from "react";
import Peer, { type Instance as PeerInstance, type SignalData } from "simple-peer";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";

type Props = {
  roomId: string;
  isInitiator: boolean;
};

export function VideoRoom({ roomId, isInitiator }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const [status, setStatus] = useState<"connecting" | "waiting" | "connected" | "error">(
    "connecting"
  );

  useEffect(() => {
    let localStream: MediaStream;
    let appliedRemoteSignal = false;
    const roomRef = doc(clientDb, "rooms", roomId);

    async function start() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setStatus("error");
        return;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      setStatus("waiting");

      const peer = new Peer({ initiator: isInitiator, trickle: false, stream: localStream });
      peerRef.current = peer;

      peer.on("signal", (data: SignalData) => {
        setDoc(roomRef, isInitiator ? { offer: data } : { answer: data }, { merge: true });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setStatus("connected");
      });

      peer.on("close", () => setStatus("waiting"));
      peer.on("error", () => setStatus("error"));

      const unsubscribe = onSnapshot(roomRef, (snap) => {
        const data = snap.data();
        if (appliedRemoteSignal) return;
        const remoteSignal = isInitiator ? data?.answer : data?.offer;
        if (remoteSignal) {
          appliedRemoteSignal = true;
          peer.signal(remoteSignal);
        }
      });

      return unsubscribe;
    }

    const unsubscribePromise = start();

    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe?.());
      peerRef.current?.destroy();
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, isInitiator]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-8">
      <p className="text-sm text-gray-500">
        {status === "connecting" && "Kameraya bağlanılıyor..."}
        {status === "waiting" && "Diğer katılımcı bekleniyor..."}
        {status === "connected" && "Bağlandı"}
        {status === "error" && "Kamera/mikrofon erişimi alınamadı."}
      </p>
      <div className="flex gap-4">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-64 rounded bg-black" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-64 rounded bg-black" />
      </div>
    </main>
  );
}
