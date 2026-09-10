// STUN tek başına iki farklı ev/mobil ağ arasında çoğu zaman yetmiyor (simetrik NAT,
// bazı operatör/router kurulumları) - bağlantı hiç kurulamadan "bekleniyor" durumunda
// takılı kalır. TURN, bu durumlarda trafiği aktararak bağlantıyı garantiler.
// OpenRelay (metered.ca) herkese açık, ücretsiz bir test TURN servisidir - bkz.
// https://www.metered.ca/tools/openrelay/ . Yoğun/kalıcı kullanım için ileride
// kendi TURN sunucunuzu (coturn) ya da ücretli bir sağlayıcıyı bağlamanız önerilir.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];
