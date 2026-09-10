"use client";

// Gömülü 1:1 video görüşme odası. Harici platforma (Meet/Zoom) yönlendirme yok:
// kamera/mikrofon burada açılır, WebRTC bağlantısı Firestore'daki rooms/{roomId}
// dokümanı üzerinden (offer/answer + trickle ICE adayları) kurulur ve akış doğrudan
// burada oynatılır. Kamera/mikrofon izni verilmese/reddedilse bile odaya girilir;
// bağlantı (ve sohbet) kurulur, kullanıcı istediği an kamerasını/mikrofonunu
// sonradan açabilir (bu da WebRTC renegotiation ile aktarılır).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Peer, { type Instance as PeerInstance, type SignalData } from "simple-peer";
import { addDoc, collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import { ICE_SERVERS } from "@/lib/ice-servers";

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
  // Kamera küçük kutusu - paylaşım durumundan bağımsız, her zaman yerel kamerayı gösterir.
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // Karşı taraftan gelen tek akış: normalde kamerası, o ekran paylaşıyorsa ekranı
  // (aynı video elemanına şeffafça yansır, ekstra sinyalleşme gerekmez).
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Ben ekran paylaşırken karşı tarafın kamerasını küçük kutuda göstermek için ikinci kopya.
  const remoteThumbRef = useRef<HTMLVideoElement>(null);
  // Ben ekran paylaşırken kendi paylaştığım ekranı ana alanda göstermek için.
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<PeerInstance | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<"connecting" | "waiting" | "connected" | "ended" | "error">(
    "connecting"
  );
  const [iceState, setIceState] = useState<string>("");
  const [dataReady, setDataReady] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [remoteSharing, setRemoteSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [waitingStudent, setWaitingStudent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const roomRef = doc(clientDb, "rooms", roomId);

    async function start() {
      // Kamera/mikrofon reddedilse ya da hiç cihaz olmasa bile odaya girilir:
      // bağlantı ve sohbet medya olmadan da kurulur, medya sonradan eklenebilir.
      let localStream: MediaStream | null = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // izin verilmedi / cihaz yok - sorun değil, aşağıda medyasız devam edilir
      }
      if (cancelled) {
        localStream?.getTracks().forEach((t) => t.stop());
        return;
      }
      if (localStream) {
        cameraStreamRef.current = localStream;
        cameraVideoTrackRef.current = localStream.getVideoTracks()[0] ?? null;
        setHasMedia(true);
      }
      setStatus("waiting");

      const peer = new Peer({
        initiator: isInitiator,
        trickle: true,
        ...(localStream ? { stream: localStream } : {}),
        config: { iceServers: ICE_SERVERS },
      });
      peerRef.current = peer;

      // Diagnostik: ICE bağlantı durumunu ekranda göstermek için (bağlantı
      // sorunlarında "bekleniyor" yazısının nedenini anlayabilmek için önemli).
      // simple-peer bunu resmi olarak dışa açmıyor, o yüzden dahili _pc'ye erişiyoruz.
      const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
      if (pc) {
        pc.oniceconnectionstatechange = () => setIceState(pc.iceConnectionState);
      }

      // Trickle ICE: SDP (offer/answer/renegotiate) rooms/{roomId} dokümanına, her ICE
      // adayı ise kendi tarafımızın alt koleksiyonuna tek tek yazılır - TÜM adaylar
      // toplanana kadar beklemek yerine bulundukça gönderilir (TURN gereken ağlarda kritik).
      const myCandidatesCol = collection(roomRef, isInitiator ? "callerCandidates" : "calleeCandidates");
      const theirCandidatesCol = collection(roomRef, isInitiator ? "calleeCandidates" : "callerCandidates");

      peer.on("signal", (data: SignalData) => {
        // RTCIceCandidate/RTCSessionDescription tarayıcı sınıf örnekleri olabilir;
        // Firestore düz obje bekler. JSON round-trip, bu nesnelerin standart
        // toJSON()'ını kullanarak güvenli düz objeye çevirir.
        const safeData = JSON.parse(JSON.stringify(data));
        if (data.type === "offer" || data.type === "answer") {
          setDoc(roomRef, isInitiator ? { offer: safeData } : { answer: safeData }, { merge: true }).catch(
            (err) => console.error("[room] sdp yazılamadı", err)
          );
        } else {
          addDoc(myCandidatesCol, safeData).catch((err) =>
            console.error("[room] ice adayı yazılamadı", err)
          );
        }
      });

      function handleRemoteStream(remoteStream: MediaStream) {
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        if (remoteThumbRef.current) remoteThumbRef.current.srcObject = remoteStream;
        setRemoteHasVideo(remoteStream.getVideoTracks().length > 0);
        setStatus((s) => (s === "ended" || s === "error" ? s : "connected"));
      }

      peer.on("stream", handleRemoteStream);
      peer.on("track", (_track, stream) => handleRemoteStream(stream));

      // Veri kanalı açıldığında (medya olsun olmasın) bağlantı gerçekten kurulmuş demektir.
      peer.on("connect", () => {
        setDataReady(true);
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
          } else if (message.type === "screen-share") {
            setRemoteSharing(message.active);
          }
        } catch {
          // sohbet/durum dışı bozuk veri - yok say
        }
      });

      peer.on("close", () => setStatus("ended"));
      peer.on("error", (err) => {
        console.error("[room] peer hatası", err);
        setStatus("error");
      });

      let lastAppliedSdp: string | null = null;
      const unsubscribeSdp = onSnapshot(
        roomRef,
        (snap) => {
          const data = snap.data();
          const remoteSignal = isInitiator ? data?.answer : data?.offer;
          if (!remoteSignal) return;
          const serialized = JSON.stringify(remoteSignal);
          if (serialized === lastAppliedSdp) return; // aynı sinyali tekrar uygulama
          lastAppliedSdp = serialized;
          peer.signal(remoteSignal);
        },
        (err) => console.error("[room] sdp dinleme hatası", err)
      );

      const unsubscribeCandidates = onSnapshot(
        theirCandidatesCol,
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              peer.signal(change.doc.data() as SignalData);
            }
          });
        },
        (err) => console.error("[room] ice adayı dinleme hatası", err)
      );

      return () => {
        unsubscribeSdp();
        unsubscribeCandidates();
      };
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

  // Öğretmen için: ders saati gelmeden önce girmeye çalışan öğrenci varsa
  // (bkz. RoomGate) burada haber verilir, "İçeri Al" ile kabul edilir.
  useEffect(() => {
    if (!isInitiator) return;
    const roomRef = doc(clientDb, "rooms", roomId);
    const unsubscribe = onSnapshot(roomRef, (snap) => {
      const waitingRoom = snap.data()?.waitingRoom;
      setWaitingStudent(!!waitingRoom?.requested && !waitingRoom?.admitted);
    });
    return unsubscribe;
  }, [roomId, isInitiator]);

  function admitStudent() {
    const roomRef = doc(clientDb, "rooms", roomId);
    setDoc(roomRef, { waitingRoom: { requested: false, admitted: true } }, { merge: true }).catch(
      (err) => console.error("[room] öğrenci kabul edilemedi", err)
    );
  }

  // Kamera açıldığında (baştan ya da sonradan) küçük kutu ancak bu anda DOM'a
  // girdiği/güncellendiği için akışı burada bağlıyoruz.
  useEffect(() => {
    if (hasMedia && localVideoRef.current && cameraStreamRef.current) {
      localVideoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [hasMedia]);

  // Ben ekran paylaşımına başlayınca karşı tarafın kamerası küçük kutuya taşınır;
  // o kutu ancak bu anda DOM'a girdiği için akışı burada (yeniden) bağlıyoruz.
  useEffect(() => {
    if (sharingScreen && remoteThumbRef.current && remoteStreamRef.current) {
      remoteThumbRef.current.srcObject = remoteStreamRef.current;
    }
  }, [sharingScreen]);

  // Kamera/mikrofonu odaya girdikten sonra açmak için - reddedilmiş/atlanmış izni
  // tekrar ister, kabul edilirse mevcut bağlantıya track ekler (renegotiation).
  async function enableMedia() {
    const peer = peerRef.current;
    if (!peer || hasMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      cameraVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      setHasMedia(true);
      setMicOn(true);
      setCamOn(true);
    } catch {
      // kullanıcı yine izin vermedi - buton tekrar denenebilir olarak kalır
    }
  }

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

  function sendScreenShareStatus(active: boolean) {
    if (!dataReady || !peerRef.current) return;
    try {
      peerRef.current.send(JSON.stringify({ type: "screen-share", active }));
    } catch {
      // veri kanalı hazır değil - karşı taraf yine de video akışından anlar
    }
  }

  async function toggleScreenShare() {
    const peer = peerRef.current;
    if (!peer) return;

    if (sharingScreen) {
      const screenStream = screenStreamRef.current;
      const screenTrack = screenStream?.getVideoTracks()[0];
      if (screenTrack) {
        if (cameraVideoTrackRef.current) {
          peer.replaceTrack(screenTrack, cameraVideoTrackRef.current, cameraStreamRef.current!);
        } else {
          peer.removeTrack(screenTrack, screenStream!);
        }
      }
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setSharingScreen(false);
      sendScreenShareStatus(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;
      if (cameraVideoTrackRef.current) {
        peer.replaceTrack(cameraVideoTrackRef.current, screenTrack, cameraStreamRef.current!);
      } else {
        peer.addTrack(screenTrack, screenStream);
      }
      if (localScreenVideoRef.current) localScreenVideoRef.current.srcObject = screenStream;
      screenTrack.onended = () => toggleScreenShare();
      setSharingScreen(true);
      sendScreenShareStatus(true);
    } catch {
      // kullanıcı ekran paylaşımı izni vermedi / seçim yapmadı
    }
  }

  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || !peerRef.current || !dataReady) return;
    const ts = Date.now();
    try {
      peerRef.current.send(JSON.stringify({ type: "chat", text, ts }));
      setMessages((prev) => [...prev, { from: "me", text, ts }]);
      setChatInput("");
    } catch {
      // veri kanalı koptu
    }
  }

  function leaveCall() {
    peerRef.current?.destroy();
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    router.push(leaveHref);
  }

  const statusLabel = {
    connecting: "Bağlanılıyor...",
    waiting: "Diğer katılımcı bekleniyor... (bağlantı bazen 10-20 saniye sürebilir)",
    connected: "Bağlandı",
    ended: "Görüşme sona erdi",
    error: "Bağlantı kurulamadı. Sayfayı yenileyip tekrar dene.",
  }[status];

  return (
    <main className="flex h-screen flex-col bg-gray-900 text-white">
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 bg-black">
          {waitingStudent && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-blue-600 px-4 py-2 text-sm shadow-lg">
              <span>🎓 {remoteName} bekleme odasında katılmak istiyor</span>
              <button
                onClick={admitStudent}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700"
              >
                İçeri Al
              </button>
            </div>
          )}
          {/* Ana alan: ben ekran paylaşıyorsam kendi ekranım, değilsem karşı taraf (kamerası ya da o paylaşıyorsa ekranı) */}
          <video
            ref={localScreenVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-contain ${sharingScreen ? "" : "hidden"}`}
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-contain ${sharingScreen ? "hidden" : ""}`}
          />

          {status !== "connected" && !sharingScreen && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-sm text-gray-300">
              <span>{statusLabel}</span>
              {iceState && <span className="text-xs text-gray-500">bağlantı durumu: {iceState}</span>}
            </div>
          )}
          {status === "connected" && !sharingScreen && !remoteHasVideo && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              {remoteSharing ? "" : `${remoteName} kamerasını açmadı`}
            </div>
          )}
          {status === "connected" && (
            <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-sm">
              {sharingScreen
                ? "Ekranını paylaşıyorsun"
                : remoteSharing
                  ? `${remoteName} · ekranını paylaşıyor`
                  : remoteName}
            </span>
          )}

          <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
            {sharingScreen && (
              <div className="w-40 overflow-hidden rounded border border-gray-700 sm:w-56">
                <video
                  ref={remoteThumbRef}
                  autoPlay
                  playsInline
                  className="w-full bg-gray-800 object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs">
                  {remoteName}
                </span>
              </div>
            )}
            <div className="relative w-40 overflow-hidden rounded border border-gray-700 sm:w-56">
              {hasMedia ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full bg-gray-800 object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-gray-800 text-xs text-gray-400">
                  Kamera kapalı
                </div>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs">
                Sen{localName ? ` (${localName})` : ""}
                {hasMedia && !micOn && " · 🔇"}
              </span>
            </div>
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
              className="flex flex-col gap-1 border-t border-gray-700 p-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Mesaj yaz..."
                  disabled={!dataReady}
                  className="flex-1 rounded bg-gray-700 px-2 py-1 text-sm outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!dataReady}
                  className="rounded bg-blue-600 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Gönder
                </button>
              </div>
              {!dataReady && (
                <p className="text-xs text-gray-400">Bağlantı kurulunca mesaj gönderebilirsin.</p>
              )}
            </form>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-700 bg-gray-900 p-3">
        {hasMedia ? (
          <>
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
          </>
        ) : (
          <button onClick={enableMedia} className="rounded-full bg-blue-600 px-4 py-2 text-sm">
            🎥 Kamera ve Mikrofonu Aç
          </button>
        )}
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
