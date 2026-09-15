// Saat dilimi yardimcilari.
//
// Zamanlar Firestore'da her zaman UTC ISO string olarak saklanir; gosterim ve
// slot uretimi kullanicinin sectigi IANA saat dilimine gore yapilir. Boylece
// ogretmenle ogrenci farkli ulkelerde olsa da herkes kendi saatini gorur.
export const DEFAULT_TIMEZONE = "Europe/Istanbul";

// Ayarlar ekranindaki hizli secim listesi; kullanici kendi dilimini de
// tarayicidan otomatik alabilir.
export const COMMON_TIMEZONES = [
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Paris",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
] as const;

export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(value: unknown): string {
  return isValidTimezone(value) ? value : DEFAULT_TIMEZONE;
}

export function detectTimezone(): string {
  try {
    return normalizeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

const PART_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function partFormatter(timeZone: string) {
  let formatter = PART_FORMATTER_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    PART_FORMATTER_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

// Bir anin hedef saat diliminde karsilik geldigi duvar saati bilesenleri.
function zonedParts(date: Date, timeZone: string) {
  const parts = partFormatter(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

// timeZone'un verilen andaki UTC farki (ms). Yaz saati gecislerinde de dogru.
export function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

// Hedef saat dilimindeki duvar saatini gercek UTC anina cevirir.
// Fark, aranan anin kendisine bagli oldugu icin iki gecis yapiyoruz: ilk tahmin
// yaz saati sinirinin yanlis tarafina dusebilir, ikinci gecis bunu duzeltir.
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(naiveUtc - zoneOffsetMs(new Date(naiveUtc), timeZone));
  result = new Date(naiveUtc - zoneOffsetMs(result, timeZone));
  return result;
}

export function formatTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string, timeZone: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    timeZone,
    day: "numeric",
    month: "long",
  });
}

export function formatDayHeader(iso: string, timeZone: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatRange(startIso: string, endIso: string, timeZone: string) {
  return `${formatDateTime(startIso, timeZone)} — ${formatTime(endIso, timeZone)}`;
}

// Gun basliklarina gore gruplarken kullanilir: UTC tarihi degil, kullanicinin
// saat dilimindeki takvim gunu.
export function dayKeyInZone(iso: string, timeZone: string) {
  const p = zonedParts(new Date(iso), timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// O saat dilimindeki hafta gunu (0 = Pazar), slot uretiminde kullanilir.
export function weekdayInZone(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

// "Europe/Istanbul (UTC+03:00)" gibi okunabilir etiket.
export function timezoneLabel(timeZone: string, at: Date = new Date()) {
  const offsetMinutes = Math.round(zoneOffsetMs(at, timeZone) / 60000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${timeZone} (UTC${sign}${hh}:${mm})`;
}
