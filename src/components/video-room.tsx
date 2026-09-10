"use client";

// Gömülü 1:1 video görüşme odası. Harici platforma (Meet/Zoom) yönlendirme yok:
// kamera/mikrofon burada açılır, WebRTC bağlantısı Firestore'daki rooms/{roomId}
// dokümanı üzerinden (offer/answer alışverişi) kurulur ve akış doğrudan burada oynatılır.
// Sohbet mesajları ayrı bir sunucu gerektirmeden aynı WebRTC bağlantısının veri
// kanalı (simple-peer'ın otomatik oluşturduğu data channel) üzerinden gönderilir.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Peer, { type Instance as PeerInstance, type SignalData } from "simple-peer";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";

type Props = {
  roomId: string;
  isInitiator: boolean;
  localName: string;
  remoteName: string;
  leaveHref: string;
};

type ChatMessage = { from: "me" | "peer"; text: string; ts: number };

export function VideoRoom({ roomId, isInitiator, localName, remoteName, leaveHref }: Props) {
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<"connecting" | "waiting" | "connected" | "ended" | "error">(
    "connecting"
  );
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    const roomRef = doc(clientDb, "rooms", roomId);

    async function start() {
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setStatus("error");
        return;
      }
      if (cancelled) {
        localStream.getTracks().forEach((t) => t.stop());
        return;
      }
      cameraStreamRef.current = localStream;
      cameraVideoTrackRef.current = localStream.getVideoTracks()[0] ?? null;
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

      peer.on("data", (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          if (message.type === "chat") {
            setMessages((prev) => [...prev, { from: "peer", text: message.text, ts: message.ts }]);
            setChatOpen((open) => {
              if (!open) setUnread((n) => n + 1);
              return open;
            });
          }
        } catch {
          // sohbet dışı/bozuk veri - yok say
        }
      });

      peer.on("close", () => setStatus("ended"));
      peer.on("error", () => setStatus("error"));

      let appliedRemoteSignal = false;
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
      cancelled = true;
      unsubscribePromise.then((unsubscribe) => unsubscribe?.());
      peerRef.current?.destroy();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, isInitiator]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function toggleMic() {
    cameraStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setMicOn((on) => !on);
  }

  function toggleCam() {
    cameraStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setCamOn((on) => !on);
  }

  async function toggleScreenShare() {
    const peer = peerRef.current;
    const cameraTrack = cameraVideoTrackRef.current;
    if (!peer || !cameraTrack) return;

    if (sharingScreen) {
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      if (screenTrack) peer.replaceTrack(screenTrack, cameraTrack, cameraStreamRef.current!);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = cameraStreamRef.current;
      setSharingScreen(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;
      peer.replaceTrack(cameraTrack, screenTrack, cameraStreamRef.current!);
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      screenTrack.onended = () => toggleScreenShare();
      setSharingScreen(true);
    } catch {
      // kullanıcı ekran paylaşımı izni vermedi
    }
  }

  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || !peerRef.current) return;
    const ts = Date.now();
    try {
      peerRef.current.send(JSON.stringify({ type: "chat", text, ts }));
      setMessages((prev) => [...prev, { from: "me", text, ts }]);
      setChatInput("");
    } catch {
      // veri kanalı henüz hazır değil
    }
  }

  function leaveCall() {
    peerRef.current?.destroy();
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    router.push(leaveHref);
  }

  const statusLabel = {
    connecting: "Kameraya bağlanılıyor...",
    waiting: "Diğer katılımcı bekleniyor...",
    connected: "Bağlandı",
    ended: "Görüşme sona erdi",
    error: "Kamera/mikrofon erişimi alınamadı veya bağlantı koptu.",
  }[status];

  return (
    <main className="flex h-screen flex-col bg-gray-900 text-white">
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
          {status !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-300">
              {statusLabel}
            </div>
          )}
          {status === "connected" && (
            <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-sm">
              {remoteName}
            </span>
          )}

          <div className="absolute bottom-3 right-3 w-40 overflow-hidden rounded border border-gray-700 sm:w-56">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full bg-gray-800 object-cover"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs">
              Sen{localName ? ` (${localName})` : ""}
              {!micOn && " · 🔇"}
            </span>
          </div>
        </div>

        {chatOpen && (
          <div className="flex w-72 flex-col border-l border-gray-700 bg-gray-800">
            <div className="border-b border-gray-700 p-3 text-sm font-medium">Sohbet</div>
            <div className="flex-1 overflow-y-auto p-3">
              {messages.length === 0 && (
                <p className="text-sm text-gray-400">Henüz mesaj yok.</p>
              )}
              <div className="flex flex-col gap-2">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded px-2 py-1 text-sm ${
                      m.from === "me" ? "self-end bg-blue-600" : "self-start bg-gray-700"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="flex gap-2 border-t border-gray-700 p-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 rounded bg-gray-700 px-2 py-1 text-sm outline-none"
              />
              <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm">
                Gönder
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-gray-700 bg-gray-900 p-3">
        <button
          onClick={toggleMic}
          className={`rounded-full px-4 py-2 text-sm ${micOn ? "bg-gray-700" : "bg-red-600"}`}
        >
          {micOn ? "🎤 Mikrofon" : "🔇 Mikrofon kapalı"}
        </button>
        <button
          onClick={toggleCam}
          className={`rounded-full px-4 py-2 text-sm ${camOn ? "bg-gray-700" : "bg-red-600"}`}
        >
          {camOn ? "📷 Kamera" : "🚫 Kamera kapalı"}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`rounded-full px-4 py-2 text-sm ${sharingScreen ? "bg-blue-600" : "bg-gray-700"}`}
        >
          🖥️ {sharingScreen ? "Paylaşımı durdur" : "Ekranı paylaş"}
        </button>
        <button
          onClick={() => {
            setChatOpen((open) => !open);
            setUnread(0);
          }}
          className="relative rounded-full bg-gray-700 px-4 py-2 text-sm"
        >
          💬 Sohbet
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs">
              {unread}
            </span>
          )}
        </button>
        <button onClick={leaveCall} className="rounded-full bg-red-600 px-4 py-2 text-sm">
          📞 Ayrıl
        </button>
      </div>
    </main>
  );
}
